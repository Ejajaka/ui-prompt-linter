"""LLM layer tests using mocked clients (no network)."""
import pytest

from src.llm_backend import (
    LLMNotAvailable,
    LLMResponseError,
    explain_and_recommend,
    extract_elements,
)
from src.pipeline import analyze_full


class FakeExtractor:
    model = "fake"

    def chat_json(self, system, user):
        if "UI prompt analyser" in system:
            return {
                "elements": [
                    {
                        "type": "button",
                        "text": "red button",
                        "attributes": {
                            "COLOR": "red",
                            "LABEL": "Sign Up",
                            "ACTION": "opens the signup form",
                            "LOCATION": "top right corner",
                            "UNKNOWN": "ignored",
                        },
                    }
                ]
            }
        return {
            "explanation": "Risk is low.",
            "recommendations": ["Keep the action."],
            "polished_prompt": "Add a red button at the top right corner labelled \"Sign Up\" that opens the signup form.",
        }


class UngroundedExtractor(FakeExtractor):
    def chat_json(self, system, user):
        return {
            "elements": [
                {
                    "type": "button",
                    "text": "red button",
                    "attributes": {"COLOR": "purple"},
                }
            ]
        }


class BadClient:
    model = "bad"

    def chat_json(self, system, user):
        raise LLMNotAvailable("offline")


class BadExplainer(FakeExtractor):
    def chat_json(self, system, user):
        return {"explanation": "", "recommendations": [], "polished_prompt": ""}


TEXT = (
    'Add a red button at the top right corner labelled "Sign Up" '
    "that opens the signup form."
)


def test_grounded_extraction_builds_elements():
    elements, meta = extract_elements(TEXT, FakeExtractor())
    assert len(elements) == 1
    element = elements[0]
    assert element.type == "button"
    assert set(element.attributes) == {"COLOR", "LABEL", "ACTION", "LOCATION"}
    assert meta["grounding_rate"] == 1.0


def test_ungrounded_attribute_is_dropped():
    elements, _ = extract_elements(TEXT, UngroundedExtractor())
    assert len(elements) == 1
    # "purple" is not in the prompt, so it must not be accepted.
    assert "COLOR" not in elements[0].attributes


def test_explain_and_recommend_parses_json():
    result = {"elements": []}
    data = explain_and_recommend(TEXT, result, {"score": 10}, [], FakeExtractor())
    assert data["explanation"] == "Risk is low."
    assert data["recommendations"] == ["Keep the action."]


def test_explain_rejects_empty_explanation():
    with pytest.raises(LLMResponseError):
        explain_and_recommend(TEXT, {"elements": []}, {"score": 10}, [], BadExplainer())


def test_pipeline_llm_mode_uses_mock_and_explains():
    payload = analyze_full(
        TEXT, method="llm", allow_llm=True, client=FakeExtractor(), finalize=True
    )
    # The safety gate prefers Rules when the LLM does not add detail.
    assert payload["engine"] in {"rules", "llm"}
    assert payload["needs_clarification"] is False
    assert "Sign Up" in payload["final_prompt"]
    assert payload["llm_used"] is True


def test_llm_safety_gate_requires_more_grounded_detail():
    from types import SimpleNamespace
    from src.pipeline import _llm_is_better

    llm = {"elements": [SimpleNamespace(attributes={"COLOR": [], "LABEL": []})]}
    rules = {"elements": [SimpleNamespace(attributes={"COLOR": []})]}
    assert _llm_is_better(llm, rules) is True
    assert _llm_is_better(rules, llm) is False


def test_pipeline_survives_unavailable_llm():
    payload = analyze_full(
        "Add a button.", method="llm", allow_llm=True, client=BadClient(), finalize=True
    )
    assert payload["engine"] in {"rules", "bert"}
    assert payload["llm_error"]
    assert payload["final_prompt"]
