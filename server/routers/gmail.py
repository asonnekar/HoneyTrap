import os
import sys
import base64
import re
from html.parser import HTMLParser
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv

# Allow HTTP for local OAuth (development only)
os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
load_dotenv()

router = APIRouter(prefix="/gmail")

# In-memory credential storage (single-user local tool)
_credentials = None

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]
REDIRECT_URI = "http://localhost:8000/api/gmail/callback"
FRONTEND_URL = "http://localhost:3000"


def _get_flow():
    from google_auth_oauthlib.flow import Flow

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=500,
            detail="Gmail not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.",
        )

    # Try "web" (Web Application) credentials first, then "installed" (Desktop App)
    for client_type in ("web", "installed"):
        try:
            client_config = {
                client_type: {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [REDIRECT_URI],
                }
            }
            return Flow.from_client_config(client_config, scopes=SCOPES, redirect_uri=REDIRECT_URI)
        except Exception:
            continue

    raise HTTPException(status_code=500, detail="Failed to create OAuth flow. Verify your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.")


class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text_parts = []

    def handle_data(self, data):
        self.text_parts.append(data)

    def get_text(self):
        return " ".join(self.text_parts)


def _strip_html(html: str) -> str:
    try:
        stripper = _HTMLStripper()
        stripper.feed(html)
        text = stripper.get_text()
        return re.sub(r"\s+", " ", text).strip()
    except Exception:
        return re.sub(r"<[^>]+>", " ", html)


def _extract_body(payload: dict) -> str:
    mime_type = payload.get("mimeType", "")

    if mime_type == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")

    if mime_type == "text/html":
        data = payload.get("body", {}).get("data", "")
        if data:
            html = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
            return _strip_html(html)

    plain_body = ""
    html_body = ""
    for part in payload.get("parts", []):
        part_mime = part.get("mimeType", "")
        if part_mime == "text/plain" and not plain_body:
            plain_body = _extract_body(part)
        elif part_mime == "text/html" and not html_body:
            html_body = _extract_body(part)
        elif part_mime.startswith("multipart/") and not plain_body:
            plain_body = _extract_body(part)

    return plain_body or html_body


def _parse_message(msg: dict) -> dict:
    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
    body = _extract_body(msg.get("payload", {}))
    return {
        "subject": headers.get("Subject", "(No Subject)"),
        "from": headers.get("From", "Unknown Sender"),
        "date": headers.get("Date", ""),
        "snippet": msg.get("snippet", ""),
        "body": body[:5000],
    }


@router.get("/status")
async def gmail_status():
    global _credentials
    connected = _credentials is not None
    if connected and _credentials.expired and not _credentials.refresh_token:
        connected = False
    return {"connected": connected}


@router.get("/auth")
async def gmail_auth():
    try:
        flow = _get_flow()
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
        )
        return {"auth_url": auth_url}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OAuth setup error: {str(e)}")


@router.get("/callback")
async def gmail_callback(code: str = None, error: str = None):
    global _credentials

    if error:
        return RedirectResponse(f"{FRONTEND_URL}?gmail_error={error}")

    if not code:
        raise HTTPException(status_code=400, detail="No authorization code received")

    flow = _get_flow()
    flow.fetch_token(code=code)
    _credentials = flow.credentials

    return RedirectResponse(f"{FRONTEND_URL}?gmail_connected=true")


@router.post("/disconnect")
async def gmail_disconnect():
    global _credentials
    _credentials = None
    return {"disconnected": True}


@router.get("/scan")
async def gmail_scan(limit: int = 20, threshold: int = 50):
    global _credentials

    if not _credentials:
        raise HTTPException(status_code=401, detail="Gmail not connected. Please authenticate first.")

    # Refresh expired credentials
    if _credentials.expired and _credentials.refresh_token:
        from google.auth.transport.requests import Request
        _credentials.refresh(Request())

    try:
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        from routers.analyze import run_analysis

        service = build("gmail", "v1", credentials=_credentials)

        results = service.users().messages().list(
            userId="me",
            labelIds=["INBOX"],
            maxResults=min(limit, 50),
        ).execute()

        messages = results.get("messages", [])
        analyzed_emails = []

        for msg_ref in messages:
            try:
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_ref["id"],
                    format="full",
                ).execute()

                email_data = _parse_message(msg)

                if len(email_data["body"].strip()) < 30:
                    continue

                content = f"Subject: {email_data['subject']}\nFrom: {email_data['from']}\n\n{email_data['body']}"
                analysis = await run_analysis(content, "email")

                if analysis.risk_score >= threshold:
                    analyzed_emails.append({
                        "id": msg_ref["id"],
                        "subject": email_data["subject"],
                        "from_addr": email_data["from"],
                        "date": email_data["date"],
                        "snippet": email_data["snippet"],
                        "body": email_data["body"],
                        "risk_score": analysis.risk_score,
                        "category": analysis.category,
                        "red_flags": [{"text": f.text, "reason": f.reason} for f in analysis.red_flags],
                        "summary": analysis.summary,
                    })
            except Exception:
                continue

        analyzed_emails.sort(key=lambda x: x["risk_score"], reverse=True)
        return {"emails": analyzed_emails, "scanned": len(messages)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gmail scan error: {str(e)}")
