import os
import re
import sys
from html.parser import HTMLParser
from fastapi import APIRouter, HTTPException
import httpx

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import AnalyzeRequest, AnalyzeResponse, RedFlag
import llm

router = APIRouter()


# --- URL helpers ---

class _TextExtractor(HTMLParser):
    SKIP_TAGS = {"script", "style", "noscript", "head"}

    def __init__(self):
        super().__init__()
        self._skip = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() in self.SKIP_TAGS:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag.lower() in self.SKIP_TAGS:
            self._skip = max(0, self._skip - 1)

    def handle_data(self, data):
        if not self._skip:
            text = data.strip()
            if text:
                self.parts.append(text)

    def get_text(self):
        return " ".join(self.parts)


def _extract_page_text(html: str) -> str:
    try:
        p = _TextExtractor()
        p.feed(html)
        return re.sub(r"\s+", " ", p.get_text()).strip()
    except Exception:
        return re.sub(r"<[^>]+>", " ", html)


async def _fetch_url(url: str) -> dict:
    """Fetch URL and return title, visible text, final URL, and redirect info."""
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=headers) as client:
            resp = await client.get(url)
        final_url = str(resp.url)
        html = resp.text

        title_m = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
        title = re.sub(r"\s+", " ", title_m.group(1)).strip()[:200] if title_m else ""

        text = _extract_page_text(html)[:3000]
        return {
            "ok": True,
            "final_url": final_url,
            "redirected": final_url.rstrip("/") != url.rstrip("/"),
            "status_code": resp.status_code,
            "title": title,
            "text": text,
        }
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


# URL-specific structural heuristics (applied to the URL itself, not page content)
_SUSPICIOUS_TLDS = {".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".top", ".click", ".link", ".work", ".rest", ".icu"}
_BRAND_NAMES = ["paypal", "amazon", "apple", "microsoft", "google", "netflix", "facebook", "instagram",
                "wellsfargo", "bankofamerica", "chase", "irs", "usps", "fedex", "dhl"]


def _url_heuristics(url: str) -> list[dict]:
    flags = []
    url_lower = url.lower()

    domain_m = re.search(r"https?://([^/?#\s]+)", url_lower)
    if not domain_m:
        return flags
    host = domain_m.group(1)

    # IP address as host
    if re.match(r"\d{1,3}(\.\d{1,3}){3}(:\d+)?$", host):
        flags.append({"text": host[:60], "reason": "Uses a raw IP address instead of a domain name — a common phishing tactic."})

    # Deceptive @ in URL
    if "@" in url:
        flags.append({"text": url[:60], "reason": "URL contains '@' which can trick browsers into ignoring the real domain."})

    # Suspicious TLD
    tld = "." + host.split(".")[-1] if "." in host else ""
    if tld in _SUSPICIOUS_TLDS:
        flags.append({"text": host[:60], "reason": f"Uses a '{tld}' domain — frequently abused in phishing campaigns."})

    # Known brand in subdomain but mismatched real domain
    parts = host.split(".")
    real_domain = ".".join(parts[-2:]) if len(parts) >= 2 else host
    for brand in _BRAND_NAMES:
        if brand in host and brand not in real_domain:
            flags.append({"text": host[:60], "reason": f"Impersonates '{brand}' in the subdomain while the actual domain is different."})
            break

    # HTTP (non-HTTPS) for what appears to be a financial/login URL
    sensitive_words = ["login", "account", "secure", "verify", "bank", "pay", "wallet", "signin"]
    if url_lower.startswith("http://") and any(w in url_lower for w in sensitive_words):
        flags.append({"text": url[:60], "reason": "Uses unencrypted HTTP for a page asking for sensitive information."})

    # Excessive hyphens in domain
    if host.count("-") >= 3:
        flags.append({"text": host[:60], "reason": "Domain has many hyphens — often used to mimic legitimate domains while avoiding trademark conflicts."})

    return flags


HEURISTIC_RULES = [
    {
        "pattern": r"unusual activity",
        "reason": "This phrase creates fear to pressure the reader into acting without verifying the claim.",
        "weight": 18,
        "category": "phishing",
    },
    {
        "pattern": r"unrecognized device",
        "reason": "Warnings about unknown logins are commonly used in account takeover phishing emails.",
        "weight": 18,
        "category": "phishing",
    },
    {
        "pattern": r"verify your identity|verify your account|confirm your information",
        "reason": "Requests to verify account details are a classic phishing tactic to steal credentials.",
        "weight": 24,
        "category": "phishing",
    },
    {
        "pattern": r"click(?:ing)? the secure link below|verify your account now",
        "reason": "Directing the victim to click a link for urgent verification is a strong phishing signal.",
        "weight": 22,
        "category": "phishing",
    },
    {
        "pattern": r"within 24 hours|act immediately|failure to verify|permanent suspension|temporarily limited access",
        "reason": "Artificial urgency and threats are common scam pressure tactics.",
        "weight": 18,
        "category": "phishing",
    },
    {
        "pattern": r"http[s]?://[^\s]+",
        "reason": "The message includes a link, which should be treated cautiously in account-security emails.",
        "weight": 12,
        "category": "phishing",
    },
]


def _literal_excerpt(content: str, match: re.Match) -> str:
    return content[match.start():match.end()].strip()


def _looks_suspicious_domain(url: str) -> bool:
    domain_match = re.search(r"https?://([^/\s]+)", url, flags=re.IGNORECASE)
    if not domain_match:
        return False

    domain = domain_match.group(1).lower()
    suspicious_markers = [
        "verify",
        "verification",
        "login",
        "update",
        "secure",
        "account",
        "bank",
    ]
    hyphen_count = domain.count("-")
    return hyphen_count >= 2 or sum(marker in domain for marker in suspicious_markers) >= 3


def heuristic_analysis(content: str) -> dict:
    red_flags = []
    score = 0
    category = "suspicious"

    for rule in HEURISTIC_RULES:
      match = re.search(rule["pattern"], content, flags=re.IGNORECASE)
      if not match:
          continue

      excerpt = _literal_excerpt(content, match)
      if excerpt and not any(flag["text"] == excerpt for flag in red_flags):
          red_flags.append({"text": excerpt[:60], "reason": rule["reason"]})
          score += rule["weight"]
          category = rule["category"]

    for url_match in re.finditer(r"https?://[^\s]+", content, flags=re.IGNORECASE):
        url = url_match.group(0)
        if _looks_suspicious_domain(url):
            if not any(flag["text"] == url[:60] for flag in red_flags):
                red_flags.append({
                    "text": url[:60],
                    "reason": "The domain uses multiple trust-bait keywords and formatting that looks more like phishing than a real bank domain.",
                })
                score += 25
                category = "phishing"

    score = min(score, 95)

    if score >= 75:
        summary = "This message contains multiple phishing markers, including urgency, account-verification pressure, and a suspicious login link."
    elif score >= 45:
        summary = "This message shows several scam indicators and should be treated as suspicious."
    else:
        summary = ""

    return {
        "risk_score": score,
        "category": category,
        "red_flags": red_flags,
        "summary": summary,
    }


def should_skip_llm(heuristic_data: dict) -> bool:
    """Use a fast local verdict when the phishing signals are already overwhelming."""
    return heuristic_data["risk_score"] >= 80 and len(heuristic_data["red_flags"]) >= 3


def merge_red_flags(llm_flags: list[dict], heuristic_flags: list[dict]) -> list[RedFlag]:
    merged = []
    seen = set()
    for flag in llm_flags + heuristic_flags:
        text = flag.get("text", "").strip()
        reason = flag.get("reason", "").strip()
        if not text or not reason:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        merged.append(RedFlag(text=text[:60], reason=reason))
    return merged


async def run_analysis(content: str, content_type: str) -> AnalyzeResponse:
    # For URLs: fetch the page and build a richer analysis context
    url_fetch_info = None
    url_structural_flags = []
    if content_type == "url":
        raw_url = content.strip().split()[0]  # take first token in case of extra text
        url_structural_flags = _url_heuristics(raw_url)
        url_fetch_info = await _fetch_url(raw_url)

    # Build prompt content section
    if content_type == "url" and url_fetch_info:
        if url_fetch_info.get("ok"):
            fetch_section = f"""URL: {content.strip()}
Final URL after redirects: {url_fetch_info['final_url']}
Redirected: {url_fetch_info['redirected']}
HTTP status: {url_fetch_info['status_code']}
Page title: {url_fetch_info['title'] or '(none)'}
Page text (first 3000 chars):
{url_fetch_info['text'] or '(no readable text found)'}"""
        else:
            fetch_section = f"""URL: {content.strip()}
Page fetch failed: {url_fetch_info.get('error', 'unknown error')}
(Analyze based on URL structure alone.)"""

        prompt_content = fetch_section
        prompt_type = "URL (with page content)"
    else:
        prompt_content = content
        prompt_type = content_type

    prompt = f"""You are an impartial scam analyst. Determine whether the following {prompt_type} is a scam or legitimate. Be unbiased — many URLs and messages are completely safe.

Return ONLY a valid JSON object with these exact fields:
- "risk_score": integer 0-100 (0=definitely safe, 100=definite scam)
- "category": one of: "phishing", "impersonation", "prize_fraud", "tech_support", "romance_scam", "investment_fraud", "medicare_scam", "irs_scam", "package_delivery", "legitimate", "suspicious"
- "red_flags": array of objects, each with:
    - "text": exact short phrase (under 60 chars) copied VERBATIM from the content — must appear character-for-character below
    - "reason": one-sentence explanation of why this phrase is suspicious
- "summary": 1-2 sentence verdict

Scoring guidance:
- 0-15: Clearly legitimate.
- 16-40: Mostly safe with minor concerns.
- 41-65: Suspicious — some scam indicators but not conclusive.
- 66-85: Likely a scam — multiple strong signals.
- 86-100: Almost certainly a scam.

For URLs specifically:
- A URL that redirects to a completely different domain is highly suspicious.
- Pages asking for login, payment, or personal info on non-HTTPS or unfamiliar domains are high risk.
- Brand names in subdomains (e.g. paypal.legit.com.evilsite.ru) while the real domain differs is a major red flag.
- Return an empty red_flags array if nothing is genuinely suspicious.
- NEVER fabricate quotes. Every "text" in red_flags must appear verbatim in the content below.

Content to analyze:
{prompt_content}"""

    try:
        heuristic_data = heuristic_analysis(content)

        if should_skip_llm(heuristic_data):
            return AnalyzeResponse(
                risk_score=heuristic_data["risk_score"],
                category=heuristic_data["category"],
                red_flags=merge_red_flags(heuristic_data["red_flags"], url_structural_flags),
                summary=heuristic_data["summary"] or "This message has multiple strong phishing indicators.",
            )

        llm_data = llm.chat_json(
            [{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=280,
        )

        llm_score = int(llm_data.get("risk_score", 0))
        heuristic_score = heuristic_data["risk_score"]
        final_score = int(llm_score * 0.7 + heuristic_score * 0.3)

        llm_category = llm_data.get("category", "suspicious")
        if llm_category == "legitimate" and heuristic_score < 45:
            final_category = "legitimate"
        elif heuristic_score >= 70 and llm_category == "legitimate":
            final_category = heuristic_data["category"]
        else:
            final_category = llm_category

        final_flags = merge_red_flags(
            llm_data.get("red_flags", []),
            heuristic_data["red_flags"] + url_structural_flags,
        )

        final_summary = llm_data.get("summary", "").strip()
        if not final_summary and heuristic_data["summary"]:
            final_summary = heuristic_data["summary"]

        return AnalyzeResponse(
            risk_score=final_score,
            category=final_category,
            red_flags=final_flags,
            summary=final_summary or "This content could not be confidently verified as safe.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    return await run_analysis(request.content, request.type)
