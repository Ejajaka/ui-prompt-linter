"""Tests for the prompt-level router."""
from src.router import route


def test_hex_colour_prefers_rules():
    decision = route("Add a #2E86C1 card above the footer.")
    assert decision["method"] == "rules"


def test_held_out_colour_prefers_rules():
    decision = route("Add a maroon navigation bar at the top.")
    assert decision["method"] == "rules"


def test_repeated_noun_flags_bert():
    decision = route("Add a photo depicting a team photo.")
    assert decision["features"]["repeated_noun"] is True
    assert decision["scores"]["bert"] > decision["scores"]["rules"]


def test_list_without_cue_flags_bert():
    decision = route("Add a black navbar with Shop, Cart and Profile.")
    assert decision["features"]["list_without_cue"] is True
    assert decision["scores"]["bert"] > decision["scores"]["rules"]


def test_bert_requires_a_decisive_margin():
    # BERT is weaker on this dataset, so a small score edge is not enough.
    decision = route("Add a photo depicting a team photo.")
    assert decision["method"] == "rules"


def test_no_ui_noun_can_choose_llm():
    decision = route("Make the page look nice.")
    assert decision["method"] == "llm"


def test_allow_llm_false_never_returns_llm():
    decision = route("Make the page look nice.", allow_llm=False)
    assert decision["method"] in {"rules", "bert"}


def test_router_is_deterministic():
    text = "Add a red button at the top right corner."
    assert route(text) == route(text)
