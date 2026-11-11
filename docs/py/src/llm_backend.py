"""Optional LLM layer: grounded extraction, risk explanation and rewriting.

The client speaks the OpenAI-compatible chat API.  By default it points at a
local Ollama server, so no API key or paid service is required.  Extraction is
grounding-only: a value that cannot be found in the prompt is dropped.
"""
from __future__ import annotations

import json
import os
import re
import time
from typing import Any

from .schema import (
    ELEMENT_SCHEMA,
    ELEMENT_TYPES,
    Element,
    Span,
)
from .tokenization import tokenize_with_offsets

DEFAULT_BASE_URL = "http://localhost:11434/v1"
DEFAULT_MODEL = "qwen2.5:3b-instruct"

SYSTEM_EXTRACT = """You are a UI prompt analyser. Extract UI elements and their explicitly stated attributes.
Allowed element types: button, navbar, input, card, modal, image, dropdown, sidebar, footer, checkbox.
Rules:
- Only extract elements that are explicitly mentioned.
- Copy attribute values verbatim from the prompt. Never paraphrase.
- Omit an attribute if it is not stated or is vague (e.g. "some nice colour").
- Do not infer actions from names (a "login button" has no action unless stated).
- Return ONLY valid JSON with this shape:
{"elements":[{"type":"button","text":"exact phrase from the prompt","attributes":{"COLOR":"...","LOCATION":"...","ACTION":"...","LABEL":"..."}}]}
"""

SYSTEM_EXPLAIN = """You explain a deterministic risk score for a UI prompt and give recommendations.
You receive the already-computed score, its components, detected elements, missing details,
unresolved clarification questions, and deterministic suggestions.
Rules:
- Do not recompute or change the score.
- Do not invent elements, attributes, colours, locations, actions or labels.
- Use placeholders for anything unresolved.
- Do not claim the prompt is complete when the score is above 25.
- Mention any unresolved questions.
Return ONLY valid JSON with this shape:
{"explanation":"...", "recommendations":["..."], "polished_prompt":"..."}
"""


class LLMNotAvailable(RuntimeError):
    """Ollama/API is not reachable or no model is installed."""


class LLMResponseError(RuntimeError):
    """The LLM returned something we cannot validate."""


def _strip_code_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = re.sub(r"^```[a-zA-Z0-9]*\s*", "", content)
        content = re.sub(r"\s*```$", "", content)
    return content.strip()


class LLMClient:
    """Thin, lazily created OpenAI-compatible client."""

    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.base_url = base_url or os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL)
        self.model = model or os.environ.get("LLM_MODEL", DEFAULT_MODEL)
        self.api_key = api_key or os.environ.get("LLM_API_KEY", "ollama")
        self.timeout = timeout
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                from openai import OpenAI
            except ImportError as exc:  # pragma: no cover
                raise LLMNotAvailable(
                    "The 'openai' package is not installed. Run: pip install openai"
                ) from exc
            self._client = OpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=self.timeout,
            )
        return self._client

    def available(self) -> bool:
        """Cheap reachability check (does not require a specific model)."""
        try:
            self.client.models.list()
            return True
        except Exception:
            return False

    def chat_json(self, system: str, user: str) -> dict:
        """Send a chat request and parse a JSON object response."""
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ]
        last_error: Exception | None = None
        for attempt in range(2):
            try:
                kwargs: dict[str, Any] = {
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0,
                }
                if attempt == 0:
                    # Ollama and most OpenAI-compatible servers support this.
                    kwargs["response_format"] = {"type": "json_object"}
                response = self.client.chat.completions.create(**kwargs)
                content = response.choices[0].message.content or ""
                data = json.loads(_strip_code_fences(content))
                if not isinstance(data, dict):
                    raise ValueError("response is not a JSON object")
                return data
            except Exception as exc:  # noqa: BLE001 - convert into friendly errors
                last_error = exc
                message = str(exc).lower()
                if any(
                    key in message
                    for key in ("connection", "connect", "timed out", "timeout",
                                "refused", "404", "not found", "model")
                ) and attempt == 1:
                    raise LLMNotAvailable(
                        f"Could not reach the LLM at {self.base_url} with model "
                        f"'{self.model}'. Start Ollama and run: "
                        f"ollama pull {self.model}"
                    ) from exc
                time.sleep(0.2)
        raise LLMResponseError(f"LLM did not return valid JSON: {last_error}")


def _token_range(
    tokens_with_offsets: list[tuple[str, int, int]], char_start: int, char_end: int
) -> tuple[int, int] | None:
    indices = [
        index
        for index, (_, start, end) in enumerate(tokens_with_offsets)
        if start < char_end and end > char_start
    ]
    if not indices:
        return None
    return indices[0], indices[-1] + 1


def _find_value(text: str, value: str, start: int = 0, end: int | None = None) -> tuple[int, int] | None:
    if not value:
        return None
    end = len(text) if end is None else end
    lowered = text.lower()
    index = lowered.find(value.lower(), start, end)
    if index == -1:
        return None
    return index, index + len(value)


def extract_elements(text: str, client: LLMClient) -> tuple[list[Element], dict]:
    """Run grounded LLM extraction and return Elements plus metadata."""
    tokens = tokenize_with_offsets(text)
    data = client.chat_json(
        SYSTEM_EXTRACT,
        json.dumps({"prompt": text}, ensure_ascii=False),
    )
    raw_elements = data.get("elements", [])
    if not isinstance(raw_elements, list):
        raise LLMResponseError("LLM 'elements' is not a list")

    elements: list[Element] = []
    used_starts: set[int] = set()
    attempted_attrs = 0
    grounded_attrs = 0

    for raw in raw_elements:
        if not isinstance(raw, dict):
            continue
        elem_type = str(raw.get("type", "")).lower().strip()
        if elem_type not in ELEMENT_TYPES:
            continue
        surface = str(raw.get("text") or raw.get("element_text") or elem_type).strip().strip('"\'')
        location = _find_value(text, surface)
        if location is None:
            location = _find_value(text, elem_type)
        if location is None:
            continue
        char_start, char_end = location
        if char_start in used_starts:
            continue
        used_starts.add(char_start)
        token_range = _token_range(tokens, char_start, char_end)
        if token_range is None:
            continue

        # Clause ends at the next sentence boundary.
        clause_end = len(text)
        for punct in ".!?":
            pos = text.find(punct, char_end)
            if pos != -1:
                clause_end = min(clause_end, pos)

        attributes: dict[str, list[Span]] = {}
        raw_attributes = raw.get("attributes") or {}
        if isinstance(raw_attributes, dict):
            for attribute in ELEMENT_SCHEMA[elem_type]["allowed"]:
                value = raw_attributes.get(attribute)
                if isinstance(value, str):
                    value = value.strip().strip('"\'')
                if not isinstance(value, str) or not value:
                    continue
                attempted_attrs += 1
                found = _find_value(text, value.strip(), char_start, clause_end)
                if found is None:
                    found = _find_value(text, value.strip(), 0, len(text))
                if found is None:
                    continue
                attr_start, attr_end = found
                attr_tokens = _token_range(tokens, attr_start, attr_end)
                if attr_tokens is None:
                    continue
                grounded_attrs += 1
                attributes.setdefault(attribute, []).append(
                    Span(
                        label=attribute,
                        start=attr_tokens[0],
                        end=attr_tokens[1],
                        text=text[attr_start:attr_end],
                        char_start=attr_start,
                        char_end=attr_end,
                        source="llm",
                    )
                )

        element_span = Span(
            label="ELEMENT",
            start=token_range[0],
            end=token_range[1],
            text=text[char_start:char_end],
            char_start=char_start,
            char_end=char_end,
            source="llm",
        )
        elements.append(Element(id=0, type=elem_type, span=element_span, attributes=attributes))

    elements.sort(key=lambda element: element.span.start)
    for index, element in enumerate(elements, start=1):
        element.id = index

    grounding = grounded_attrs / attempted_attrs if attempted_attrs else 1.0
    metadata = {
        "grounding_rate": round(grounding, 3),
        "raw_elements": len(raw_elements),
        "kept_elements": len(elements),
    }
    return elements, metadata


def explain_and_recommend(
    text: str,
    result: dict,
    risk: dict,
    unresolved: list[dict],
    client: LLMClient,
) -> dict:
    """Ask the LLM to explain the deterministic risk and recommend next steps."""
    payload = {
        "prompt": text,
        "risk": risk,
        "elements": result.get("elements", []),
        "unresolved_questions": unresolved,
    }
    data = client.chat_json(
        SYSTEM_EXPLAIN,
        json.dumps(payload, ensure_ascii=False, indent=2),
    )
    explanation = str(data.get("explanation", "")).strip()
    recommendations = data.get("recommendations", [])
    polished = str(data.get("polished_prompt", "")).strip()
    if not explanation:
        raise LLMResponseError("LLM explanation is empty")
    if risk.get("score", 0) > 25 and re.search(
        r"\b(is|looks|seems)\s+complete\b", explanation.lower()
    ):
        raise LLMResponseError("LLM wrongly claimed the prompt is complete")
    if not isinstance(recommendations, list):
        recommendations = []
    recommendations = [str(item).strip() for item in recommendations if str(item).strip()]
    return {
        "explanation": explanation,
        "recommendations": recommendations,
        "polished_prompt": polished,
        "model": client.model,
    }
