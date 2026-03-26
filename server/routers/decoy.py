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
    """Generate a lengthy, confusing reply to waste scammers' time, plus delivery tips."""
    persona_gender = random.choice(["grandma", "grandpa"])
    persona_name = fake.first_name_female() if persona_gender == "grandma" else fake.first_name_male()

    reply_prompt = f"""You are helping protect a potential scam victim by generating a realistic, extremely long, time-wasting reply to the following scam message.

Write a response from the perspective of {persona_name}, an elderly, confused, but well-meaning {persona_gender}. The response MUST be very long — at least 8-10 paragraphs. The response should:
1. Seem genuinely interested and eager to help, but keep misunderstanding key details over and over
2. Include 4-5 long, rambling, irrelevant personal anecdotes — mention grandchildren by name, a recent doctor visit with specific details about what the doctor said, a neighbor named something like "Earl" or "Marjorie" and what they've been up to lately, a story about your late spouse, something funny your cat or dog did this morning, a recipe you tried last week, etc.
3. Go off on extended tangents — start answering the scammer's request, then trail off into a completely unrelated story, then circle back but get confused about what you were saying
4. Ask at least 5-6 confusing, off-topic clarifying questions scattered throughout that require the scammer to respond
5. Mention multiple wrong names, addresses, account numbers, and phone numbers that are clearly made up — then "correct" yourself with different wrong details
6. Express repeated confusion about technology — mention you're not sure how to do things on the computer, ask if your grandson can help, wonder if you need to go to the bank in person instead
7. Include at least one long paragraph where you try to explain something completely unrelated like a church event, a TV show you watched, or a problem with your plumbing
8. Repeatedly say you want to help and are very concerned, to keep the scammer hooked
9. End with multiple questions that absolutely require another response from the scammer

Remember: the longer and more rambling the better. Every paragraph should be substantial. Do NOT be concise. Drag everything out. Repeat yourself. Go on tangents within tangents.

Scam type: {request.scam_category}
Scam message: {request.original_scam}

Write ONLY the reply text. No JSON, no preamble, no meta-commentary. Make it VERY long."""

    try:
        reply = llm.chat([{"role": "user", "content": reply_prompt}], temperature=0.85)

        tips_prompt = f"""You are a voice acting coach helping someone impersonate "{persona_name}", a confused elderly {persona_gender}, on a phone call with a scammer. The goal is to waste the scammer's time and be as believable as possible.

Here is the script they will be reading:
---
{reply[:1500]}
---

Generate exactly 6 short, practical, actionable delivery tips for performing this specific script over the phone. Each tip should be one sentence. The tips should:
- Be specific to the persona's gender ({persona_gender}) and name ({persona_name})
- Reference specific moments, names, or anecdotes from the script above
- Cover voice technique (pitch, pace, breathing, trailing off)
- Cover how to handle the scammer pushing back or getting impatient
- Cover how to drag out specific parts of the script (reading numbers slowly, forgetting what you were saying)
- Be funny and encouraging

Respond with ONLY a JSON array of 6 strings. No other text. Example format:
["tip 1", "tip 2", "tip 3", "tip 4", "tip 5", "tip 6"]"""

        tips_result = llm.chat_json([{"role": "user", "content": tips_prompt}], temperature=0.7)

        if isinstance(tips_result, list):
            delivery_tips = [str(t) for t in tips_result[:6]]
        else:
            delivery_tips = [str(tips_result.get(k, "")) for k in list(tips_result.keys())[:6]] if isinstance(tips_result, dict) else []

        if not delivery_tips:
            delivery_tips = [
                f"Use a slow, shaky {persona_gender} voice — speak softly and trail off mid-sentence.",
                "Never hang up no matter what. If they get frustrated, say \"Oh dear, did I say something wrong?\"",
                "Pretend you can't hear well — ask them to repeat everything.",
                "Go on long tangents, then circle back with \"Now what were we talking about?\"",
                f"Stay in character as {persona_name} the entire time — confused but eager to help.",
                "When reading numbers, go painfully slow, then 'correct' yourself and start over.",
            ]

        return StallResponse(
            reply=reply,
            persona_name=persona_name,
            persona_gender=persona_gender,
            delivery_tips=delivery_tips,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stall generation error: {str(e)}")
