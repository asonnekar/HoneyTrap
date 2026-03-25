import os
import sys
from fastapi import APIRouter, HTTPException
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import AnalyzeRequest, AnalyzeResponse, RedFlag
import llm

router = APIRouter()


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_content(request: AnalyzeRequest):
    prompt = f"""You are a scam detection expert. Analyze the following {request.type} content for scam indicators.

Return ONLY a valid JSON object — no markdown, no explanation, just the raw JSON — with these exact fields:
- "risk_score": integer 0-100 (0=definitely safe, 100=definite scam)
- "category": one of: "phishing", "impersonation", "prize_fraud", "tech_support", "romance_scam", "investment_fraud", "medicare_scam", "irs_scam", "package_delivery", "legitimate", "suspicious"
- "red_flags": array of objects, each with:
    - "text": exact short phrase (under 60 chars) copied verbatim from the content that is suspicious
    - "reason": one-sentence explanation of why this phrase is a red flag
- "summary": 1-2 sentence verdict explaining the overall assessment

Only include phrases in red_flags that are literally present in the content below.

Content to analyze:
{request.content}"""

    try:
        data = llm.chat_json([{"role": "user", "content": prompt}], temperature=0.2)
        return AnalyzeResponse(
            risk_score=int(data.get("risk_score", 0)),
            category=data.get("category", "suspicious"),
            red_flags=[RedFlag(**f) for f in data.get("red_flags", [])],
            summary=data.get("summary", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")
