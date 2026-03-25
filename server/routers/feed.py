import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import FeedSubmission, FeedItem

router = APIRouter()

# Pre-seeded demo data
_now = datetime.utcnow()
feed_items: list[dict] = [
    {
        "id": str(uuid.uuid4()),
        "content": "URGENT: Your Amazon account has been locked due to suspicious activity. Verify your identity now at amaz0n-secure-verify.net or your account will be permanently deleted within 24 hours.",
        "type": "sms",
        "region": "Ohio",
        "risk_score": 97,
        "category": "phishing",
        "submitted_at": (_now - timedelta(hours=2)).isoformat(),
        "upvotes": 41,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Congratulations! You've been randomly selected to receive a $500 Walmart Gift Card. This offer expires in 1 hour. Reply YES to claim your prize. Standard msg rates apply.",
        "type": "sms",
        "region": "Michigan",
        "risk_score": 93,
        "category": "prize_fraud",
        "submitted_at": (_now - timedelta(hours=5)).isoformat(),
        "upvotes": 28,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "This is a final notice from the IRS. You owe $3,241 in unpaid federal taxes. Failure to pay within 24 hours will result in immediate arrest. Call 1-888-555-0147 to settle this matter and avoid criminal prosecution.",
        "type": "call_script",
        "region": "Florida",
        "risk_score": 99,
        "category": "irs_scam",
        "submitted_at": (_now - timedelta(hours=8)).isoformat(),
        "upvotes": 67,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Your Microsoft Windows license has expired. Your personal data is at risk. Call our certified technicians immediately at 1-800-555-0199 to renew and protect your computer from viruses.",
        "type": "email",
        "region": "California",
        "risk_score": 91,
        "category": "tech_support",
        "submitted_at": (_now - timedelta(hours=12)).isoformat(),
        "upvotes": 19,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Dear Friend, I am Dr. Emmanuel Okafor, a senior banking official in Lagos. I have $14.5 million in an unclaimed estate account and need a trusted foreign partner to transfer these funds. You will receive 40% commission.",
        "type": "email",
        "region": "Texas",
        "risk_score": 98,
        "category": "impersonation",
        "submitted_at": (_now - timedelta(hours=18)).isoformat(),
        "upvotes": 54,
    },
    {
        "id": str(uuid.uuid4()),
        "content": "Your Medicare benefits are expiring. You may be entitled to a FREE glucose monitor, back brace, and knee support at NO COST to you. Call 1-877-555-0123 to claim your free medical supplies before December 31st.",
        "type": "call_script",
        "region": "Arizona",
        "risk_score": 88,
        "category": "medicare_scam",
        "submitted_at": (_now - timedelta(days=1)).isoformat(),
        "upvotes": 33,
    },
]


@router.get("/feed", response_model=list[FeedItem])
async def get_feed():
    return sorted(feed_items, key=lambda x: x["upvotes"], reverse=True)


@router.post("/feed", response_model=FeedItem)
async def submit_scam(submission: FeedSubmission):
    if not submission.content.strip():
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    new_item = {
        "id": str(uuid.uuid4()),
        "content": submission.content,
        "type": submission.type,
        "region": submission.region or "Unknown",
        "risk_score": 0,  # Will be analyzed separately
        "category": "suspicious",
        "submitted_at": datetime.utcnow().isoformat(),
        "upvotes": 0,
    }
    feed_items.append(new_item)
    return new_item


@router.post("/feed/{item_id}/upvote")
async def upvote(item_id: str):
    for item in feed_items:
        if item["id"] == item_id:
            item["upvotes"] += 1
            return {"upvotes": item["upvotes"]}
    raise HTTPException(status_code=404, detail="Item not found")
