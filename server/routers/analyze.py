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


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    prompt = f"""You are a scam detection expert. Analyze the following {request.type} content for scam indicators.

Return ONLY a valid JSON object with these exact fields:
- "risk_score": integer 0-100 (0=definitely safe, 100=definite scam)
- "category": one of: "phishing", "impersonation", "prize_fraud", "tech_support", "romance_scam", "investment_fraud", "medicare_scam", "irs_scam", "package_delivery", "legitimate", "suspicious"
- "red_flags": array of objects, each with:
    - "text": exact short phrase (under 60 chars) copied verbatim from the content that is suspicious
    - "reason": one-sentence explanation of why this phrase is a red flag
- "summary": 1-2 sentence verdict explaining the overall assessment

Scoring guidance:
- Credential verification requests, urgent account threats, and suspicious login links should usually score at least 70.
- Threats of suspension, language like "act immediately", and requests to click a link to restore access are strong phishing signals.
- Do not mark content as legitimate if it includes pressure to verify an account through a link.

Only include phrases in red_flags that are literally present in the content below.

Content to analyze:
{request.content}"""

    try:
        llm_data = llm.chat_json([{"role": "user", "content": prompt}], temperature=0.1)
        heuristic_data = heuristic_analysis(request.content)

        llm_score = int(llm_data.get("risk_score", 0))
        heuristic_score = heuristic_data["risk_score"]
        final_score = max(llm_score, heuristic_score)

        llm_category = llm_data.get("category", "suspicious")
        if heuristic_score >= 70 and llm_category in {"legitimate", "suspicious"}:
            final_category = heuristic_data["category"]
        elif heuristic_score >= 45 and llm_category == "legitimate":
            final_category = heuristic_data["category"]
        else:
            final_category = llm_category

        final_flags = merge_red_flags(
            llm_data.get("red_flags", []),
            heuristic_data["red_flags"],
        )

        final_summary = llm_data.get("summary", "").strip()
        if heuristic_score > llm_score and heuristic_data["summary"]:
            final_summary = heuristic_data["summary"]
        elif not final_summary and heuristic_data["summary"]:
            final_summary = heuristic_data["summary"]

        return AnalyzeResponse(
            risk_score=final_score,
            category=final_category,
            red_flags=final_flags,
            summary=final_summary or "This content could not be confidently verified as safe.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
