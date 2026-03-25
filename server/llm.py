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


def chat(messages: list[dict], temperature: float = 0.3) -> str:
    """Send a chat request and return the raw text response."""
    client = get_client()
    response = client.chat.completions.create(
        model=OLLAMA_MODEL,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content


def chat_json(messages: list[dict], temperature: float = 0.2) -> dict:
    """
    Send a chat request expecting a JSON response.
    Handles models that wrap JSON in markdown code fences.
    """
    text = chat(messages, temperature=temperature)

    # Strip markdown fences if present: ```json ... ``` or ``` ... ```
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()

    # Extract the first {...} block in case of preamble text
    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        text = brace.group(0)

    return json.loads(text)
