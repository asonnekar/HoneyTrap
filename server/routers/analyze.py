import os
import re
import sys
from fastapi import APIRouter, HTTPException

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import AnalyzeRequest, AnalyzeResponse, RedFlag
import llm

router = APIRouter()


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
    prompt = f"""You are an impartial message analyst. Your job is to determine whether the following {content_type} content is a scam or a legitimate message. You must be unbiased — many messages are completely normal and safe.

Return ONLY a valid JSON object with these exact fields:
- "risk_score": integer 0-100 (0=definitely safe, 100=definite scam)
- "category": one of: "phishing", "impersonation", "prize_fraud", "tech_support", "romance_scam", "investment_fraud", "medicare_scam", "irs_scam", "package_delivery", "legitimate", "suspicious"
- "red_flags": array of objects, each with:
    - "text": exact short phrase (under 60 chars) copied VERBATIM from the content — you must be able to find this exact string in the content below
    - "reason": one-sentence explanation of why this phrase is a red flag
- "summary": 1-2 sentence verdict explaining the overall assessment

Scoring guidance:
- 0-15: Clearly legitimate — normal business communications, OTP/verification codes, order confirmations, appointment reminders, shipping updates, two-factor authentication messages.
- 16-40: Mostly safe but with minor unusual elements worth noting.
- 41-65: Suspicious — contains some scam indicators but could go either way.
- 66-85: Likely a scam — multiple strong scam signals.
- 86-100: Almost certainly a scam — classic scam patterns, fake urgency, credential harvesting.

Important considerations:
- Verification codes, OTPs, and 2FA messages from known services are LEGITIMATE. A code expiring in a few minutes is normal, not urgency pressure.
- "Don't share this code" or "we will never ask for your code/password" are standard security disclaimers used by real companies — they are signs of LEGITIMACY, not red flags.
- Not every message with a time limit is a pressure tactic. Distinguish real service messages from scams by looking at the overall context.
- If the message does not ask the user to click a link, provide credentials, send money, or take any risky action, it is very likely legitimate.
- Return an empty red_flags array if nothing is genuinely suspicious.
- NEVER fabricate or paraphrase quotes. Every "text" value in red_flags must appear character-for-character in the content below.

Content to analyze:
{content}"""

    try:
        heuristic_data = heuristic_analysis(content)

        if should_skip_llm(heuristic_data):
            return AnalyzeResponse(
                risk_score=heuristic_data["risk_score"],
                category=heuristic_data["category"],
                red_flags=[RedFlag(**flag) for flag in heuristic_data["red_flags"]],
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
            heuristic_data["red_flags"],
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
