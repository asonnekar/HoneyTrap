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


def _build_phone_number() -> str:
    area_code = random.randint(200, 999)
    exchange = random.randint(200, 999)
    subscriber = random.randint(1000, 9999)
    return f"({area_code}) - {exchange} - {subscriber}"


def _build_delivery_tips(persona_name: str, persona_gender: str) -> list[str]:
    return [
        f"Use a slow, hesitant voice for {persona_name} and pause before important details like account numbers or names.",
        f"If the scammer rushes you, have {persona_name} apologize and ask them to repeat the last instruction more slowly.",
        "Read numbers one digit at a time, then stop, get confused, and restart from the beginning.",
        "Answer one question, drift into a short side story, then ask what you were supposed to do next.",
        f"Lean into the confused-but-cooperative {persona_gender} persona so the scammer stays engaged instead of hanging up.",
        "End with two small clarification questions so the scammer feels they need to keep responding.",
    ]


@router.post("/decoy/identity", response_model=DecoyIdentityResponse)
async def generate_identity():
    """Generate a realistic but completely fake identity to waste scammers' time."""
    ssn = f"{random.randint(100, 899)}-{random.randint(10, 99)}-{random.randint(1000, 9999)}"
    dob = fake.date_of_birth(minimum_age=65, maximum_age=82).strftime("%m/%d/%Y")
    name = fake.name()
    return DecoyIdentityResponse(
        name=name,
        email=_build_email(name, dob),
        phone=_build_phone_number(),
        address=fake.address().replace("\n", ", "),
        ssn_fake=ssn,
        credit_card_fake=fake.credit_card_number(card_type="visa"),
        dob=dob,
    )


@router.post("/decoy/stall", response_model=StallResponse)
async def generate_stall_reply(request: StallRequest):
    """Generate a moderately long, confusing reply to waste scammers' time quickly."""
    persona_gender = random.choice(["grandma", "grandpa"])
    persona_name = fake.first_name_female() if persona_gender == "grandma" else fake.first_name_male()

    reply_prompt = f"""You are helping protect a potential scam victim by generating a realistic, time-wasting reply to the following scam message.

Write a response from the perspective of {persona_name}, an elderly, confused, but well-meaning {persona_gender}. The response should:
1. Be 3-4 paragraphs long
2. Sound eager to help, but misunderstand key details
3. Include 1-2 short irrelevant anecdotes
4. Ask 3-4 clarifying questions that require the scammer to respond
5. Mention at least one wrong number, address, or name and then correct it incorrectly
6. End with a question that keeps the scammer talking

Keep it believable and moderately long, but do not overdo it.

Scam type: {request.scam_category}
Scam message: {request.original_scam}

Write ONLY the reply text. No JSON, no preamble, no meta-commentary."""

    try:
        reply = llm.chat(
            [{"role": "user", "content": reply_prompt}],
            temperature=0.75,
            max_tokens=420,
        )
        delivery_tips = _build_delivery_tips(persona_name, persona_gender)

        return StallResponse(
            reply=reply,
            persona_name=persona_name,
            persona_gender=persona_gender,
            delivery_tips=delivery_tips,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stall generation error: {str(e)}")
