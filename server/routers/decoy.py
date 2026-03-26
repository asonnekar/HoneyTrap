import os
import random
import re
import sys
import unicodedata
from fastapi import APIRouter, HTTPException
from faker import Faker
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from models import DecoyIdentityResponse, StallRequest, StallResponse
import llm

router = APIRouter()
fake = Faker()


def _slug_name_part(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", normalized.lower())


def _build_email(name: str, dob: str) -> str:
    parts = [_slug_name_part(part) for part in name.split()]
    parts = [part for part in parts if part]

    first = parts[0] if parts else "pat"
    last = parts[-1] if len(parts) > 1 else "wilson"
    birth_year = dob[-4:]

    patterns = [
        f"{first}.{last}",
        f"{first}{last}",
        f"{first[0]}{last}",
        f"{first}.{last}{birth_year}",
        f"{first}{last[:1]}{birth_year[-2:]}",
    ]

    local_part = random.choice(patterns)
    domain = fake.free_email_domain()
    return f"{local_part}@{domain}"


@router.post("/decoy/identity", response_model=DecoyIdentityResponse)
async def generate_identity():
    """Generate a realistic but completely fake identity to waste scammers' time."""
    ssn = f"{random.randint(100, 899)}-{random.randint(10, 99)}-{random.randint(1000, 9999)}"
    dob = fake.date_of_birth(minimum_age=65, maximum_age=82).strftime("%m/%d/%Y")
    name = fake.name()
    return DecoyIdentityResponse(
        name=name,
        email=_build_email(name, dob),
        phone=fake.phone_number(),
        address=fake.address().replace("\n", ", "),
        ssn_fake=ssn,
        credit_card_fake=fake.credit_card_number(card_type="visa"),
        dob=dob,
    )


@router.post("/decoy/stall", response_model=StallResponse)
async def generate_stall_reply(request: StallRequest):
    """Generate a lengthy, confusing reply to waste scammers' time."""
    prompt = f"""You are helping protect a potential scam victim by generating a realistic, time-wasting reply to the following scam message.

Write a response from the perspective of an elderly, confused, but well-meaning person. The response should:
1. Seem genuinely interested and eager to help, but keep misunderstanding key details
2. Include 2-3 irrelevant personal anecdotes (mention grandchildren, a recent doctor visit, a neighbor named something like "Earl" or "Marjorie")
3. Ask multiple confusing, off-topic clarifying questions that require the scammer to respond
4. Occasionally mention wrong names, addresses, or account numbers that are clearly made up
5. Be at least 4 paragraphs long to maximize time waste
6. End with a question that requires another response from the scammer

Scam type: {request.scam_category}
Scam message: {request.original_scam}

Write ONLY the reply text. No JSON, no preamble, no meta-commentary."""

    try:
        reply = llm.chat([{"role": "user", "content": prompt}], temperature=0.85)
        return StallResponse(reply=reply)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stall generation error: {str(e)}")
