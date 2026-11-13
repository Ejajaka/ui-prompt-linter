"""Router verification: the selected detector is validated against confidence."""
from types import SimpleNamespace

from src.pipeline import analyze_full, selection_score


def test_selection_score_rewards_grounded_detail():
    empty = {"elements": [], "confidence": 0.9}
    one = {"elements": [SimpleNamespace(attributes={"LABEL": []})], "confidence": 0.5}
    assert selection_score(empty) == 0.0
    assert selection_score(one) > 0.0


def test_auto_router_records_candidates():
    payload = analyze_full(
        "Add a red button labelled Sign Up at the top right that opens the form.",
        method="auto",
        allow_llm=False,
        answers={},
        finalize=False,
    )
    router = payload["router"]
    assert router["selected_by"] == "router+confidence"
    assert "candidates" in router
    assert router["selected"] in router["candidates"]
    assert payload["engine"] == router["selected"]
    assert router["selection_score"] > 0


def test_explanation_source_is_reported():
    payload = analyze_full(
        "Add a red button labelled Sign Up at the top right that opens the form.",
        method="auto",
        allow_llm=False,
        answers={},
        finalize=True,
    )
    assert payload["needs_clarification"] is False
    assert payload["explanation_source"] == "deterministic"
    assert payload["explanation"]


def test_clarification_gate_withholds_final_prompt():
    payload = analyze_full("I need a button on my homepage.", method="rules")
    assert payload["needs_clarification"] is True
    assert payload["final_prompt"] is None
    assert payload["clarification"]["questions"]
    assert len(payload["clarification"]["questions"]) <= 6
