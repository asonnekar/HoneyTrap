"""
Shared Ollama client using the OpenAI-compatible API.
Ollama runs at http://localhost:11434 by default.
Set OLLAMA_MODEL in .env to change the model (default: llama3.2).
"""
import os
import re
import json
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def get_client() -> OpenAI:
    return OpenAI(base_url=OLLAMA_BASE_URL, api_key="ollama")


def chat(messages: list[dict], temperature: float = 0.3, max_tokens: int | None = None) -> str:
    """Send a chat request and return the raw text response."""
    client = get_client()
    request_args = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if max_tokens is not None:
        request_args["max_tokens"] = max_tokens

    response = client.chat.completions.create(
        **request_args,
    )
    return response.choices[0].message.content


def _extract_json_object(text: str) -> dict:
    """Extract and parse the first JSON object from a model response."""
    text = (text or "").strip()
    if not text:
        raise ValueError("Ollama returned an empty response.")

    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()

    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        text = brace.group(0)

    return json.loads(text)


def chat_json(messages: list[dict], temperature: float = 0.2, max_tokens: int | None = None) -> dict:
    """
    Send a chat request expecting a JSON response.
    Handles models that wrap JSON in markdown code fences.
    """
    text = chat(messages, temperature=temperature, max_tokens=max_tokens)

    try:
        return _extract_json_object(text)
    except Exception:
        # Ask the model to repair its prior response into valid JSON only.
        repair_messages = [
            {
                "role": "system",
                "content": (
                    "Convert the user's content into a single valid JSON object only. "
                    "Return raw JSON with no markdown, no explanation, and no extra text."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Rewrite this into valid JSON only:\n\n"
                    f"{text}"
                ),
            },
        ]
        repaired_text = chat(repair_messages, temperature=0, max_tokens=max_tokens)
        try:
            return _extract_json_object(repaired_text)
        except Exception as repair_error:
            raise ValueError(
                "The model did not return valid JSON. "
                "Check that Ollama is running, the selected model is installed, "
                "and try again with a longer scam-like sample."
            ) from repair_error
