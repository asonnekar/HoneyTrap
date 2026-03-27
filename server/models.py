from pydantic import BaseModel
from typing import Optional, List


class AnalyzeRequest(BaseModel):
    content: str
    type: str  # "email", "sms", "url", "call_script"


class RedFlag(BaseModel):
    text: str
    reason: str


class AnalyzeResponse(BaseModel):
    risk_score: int
    category: str
    red_flags: List[RedFlag]
    summary: str


class DecoyIdentityResponse(BaseModel):
    name: str
    email: str
    phone: str
    address: str
    ssn_fake: str
    credit_card_fake: str
    dob: str


class StallRequest(BaseModel):
    original_scam: str
    scam_category: str


class StallResponse(BaseModel):
    reply: str
    persona_name: str
    persona_gender: str
    delivery_tips: List[str]


class LiveReplyRequest(BaseModel):
    conversation: List[dict]  # [{"role": "scammer"|"persona", "text": "..."}]
    persona_name: str
    persona_gender: str
    scam_category: str


class LiveReplyResponse(BaseModel):
    reply: str


class TTSRequest(BaseModel):
    text: str
    voice_id: str = "XrExE9yKIg1WjnnlVkGX"  # default: "Lily" elderly female


class FeedSubmission(BaseModel):
    content: str
    type: str
    region: Optional[str] = "Unknown"


class FeedItem(BaseModel):
    id: str
    content: str
    type: str
    region: str
    risk_score: int
    category: str
    submitted_at: str
    upvotes: int
