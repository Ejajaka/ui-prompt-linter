"""End-to-end smoke tests for the rules backend (and BERT when available)."""
import pytest

from src.pipeline import analyze


def _element(result, index=0):
    return result["elements"][index]


def test_single_button_reports_all_required_attributes():
    analysis = analyze("Add a button.", backend="rules")
    result = analysis["result"]
    assert result["summary"]["n_elements"] == 1
    element = _element(result)
    assert element["type"] == "button"
    assert set(element["missing"]) == {"LABEL", "ACTION", "COLOR", "LOCATION"}
    assert result["summary"]["complete"] is False
    assert len(element["messages"]) == 4


def test_empty_input_does_not_crash():
    analysis = analyze("", backend="rules")
    result = analysis["result"]
    assert analysis["tokens"] == []
    assert result["elements"] == []
    assert result["summary"]["n_elements"] == 0
    assert "No UI elements detected" in result["summary"]["message"]


def test_fully_specified_prompt_is_complete():
    text = (
        'Add a red button at the top right corner labelled "Sign Up" '
        "that opens the signup form."
    )
    analysis = analyze(text, backend="rules")
    element = _element(analysis["result"])
    assert element["status"] == "complete"
    assert element["missing"] == []
    assert analysis["result"]["summary"]["complete"] is True


def test_landmark_guard_keeps_footer_in_location():
    analysis = analyze("Add a blue card above the footer.", backend="rules")
    result = analysis["result"]
    assert result["summary"]["n_elements"] == 1
    element = _element(result)
    assert element["type"] == "card"
    assert element["attributes"]["COLOR"] == "blue"
    assert element["attributes"]["LOCATION"] == "above the footer"
    assert element["missing"] == ["LABEL"]


def test_vague_phrase_is_reported_as_vague():
    analysis = analyze("Add a footer with privacy policy in some nice colour.", backend="rules")
    element = _element(analysis["result"])
    assert "COLOR" in element["missing"]
    assert "COLOR" in element["vague"]
    assert any("too vague" in message for message in element["messages"])


def test_multiple_elements_get_separate_attributes():
    analysis = analyze(
        "Add a red button at the top right corner and a blue navbar at the top.",
        backend="rules",
    )
    elements = analysis["result"]["elements"]
    assert len(elements) == 2
    assert elements[0]["attributes"]["COLOR"] == "red"
    assert elements[1]["attributes"]["COLOR"] == "blue"


def test_json_serialisable():
    import json

    json.dumps(analyze("Add a red button.", backend="rules"))


def test_emoji_and_very_long_input_do_not_crash():
    analysis = analyze("🎨 Add a button 🚀", backend="rules")
    assert analysis["result"]["summary"]["n_elements"] == 1

    long_text = "x " * 1200
    analysis = analyze(long_text, backend="rules")
    assert analysis["result"]["summary"]["n_elements"] == 0
