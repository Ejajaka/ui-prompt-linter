"""Streamlit UI for the UI/UX Prompt Linter.

Run with::

    streamlit run app.py
"""
from __future__ import annotations

import html
import json
import os
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import streamlit as st

from src.llm_backend import LLMClient
from src.pipeline import BackendNotAvailable, analyze_full
from src.schema import DATA_DIR, PROJECT_ROOT

try:  # package rename: streamlit-keyup >= 1.0 ships the module as st_keyup
    from st_keyup import st_keyup
except ImportError:  # pragma: no cover - older versions
    from streamlit_keyup import st_keyup

# Optional release asset used by the hosted demo.  The checkpoint is too large
# for the Git repository, so a hosted app downloads it once on first run.
DEFAULT_MODEL_URL = (
    "https://github.com/Ejajaka/ui-prompt-linter/releases/download/"
    "model-v1/bert_tagger.zip"
)
BERT_MODEL_URL = os.environ.get("BERT_MODEL_URL", DEFAULT_MODEL_URL)
MAX_PROMPT_CHARS = 1000

LABEL_STYLES = {
    "ELEMENT": ("rgba(155, 89, 182, 0.35)", "#6c3483"),
    "COLOR": ("rgba(230, 126, 34, 0.35)", "#a04000"),
    "LOCATION": ("rgba(52, 152, 219, 0.35)", "#1a5276"),
    "ACTION": ("rgba(39, 174, 96, 0.35)", "#145a32"),
    "LABEL": ("rgba(231, 76, 154, 0.35)", "#78281f"),
}

EXAMPLE_OPTION = "— choose an example —"
RISK_COMPONENTS = {
    "completeness": "Missing details",
    "vagueness": "Vague details",
    "detection": "Detector uncertainty",
    "unresolved": "Unresolved questions",
}


# --------------------------------------------------------------------------- resources
def _ensure_model_downloaded() -> None:
    """Download the release model once when running on a hosted deployment."""
    model_dir = PROJECT_ROOT / "models" / "bert_tagger"
    if model_dir.exists() or not BERT_MODEL_URL:
        return
    archive = PROJECT_ROOT / "models" / "bert_tagger.zip"
    try:
        with st.spinner("Downloading the fine-tuned BERT model (first run only)..."):
            urlretrieve(BERT_MODEL_URL, archive)
            with zipfile.ZipFile(archive) as zf:
                zf.extractall(PROJECT_ROOT / "models")
        archive.unlink(missing_ok=True)
    except Exception as exc:  # pragma: no cover - network errors
        st.warning(f"Could not download the BERT model automatically: {exc}")


def _secret(name: str) -> str | None:
    """Read an optional Streamlit secret without failing when none exist."""
    try:
        value = st.secrets.get(name)
        return str(value) if value else None
    except Exception:
        return None


@st.cache_resource(show_spinner=False)
def get_llm_client() -> LLMClient:
    """Cache the OpenAI-compatible client.

    Locally this defaults to Ollama. On Streamlit Cloud, configure
    ``LLM_BASE_URL`` / ``LLM_MODEL`` / ``LLM_API_KEY`` in the app secrets to use
    any OpenAI-compatible hosted endpoint.
    """
    return LLMClient(
        base_url=_secret("LLM_BASE_URL") or os.environ.get("LLM_BASE_URL"),
        model=_secret("LLM_MODEL") or os.environ.get("LLM_MODEL"),
        api_key=_secret("LLM_API_KEY") or os.environ.get("LLM_API_KEY"),
        session=_secret("LLM_SESSION") or os.environ.get("LLM_SESSION"),
    )


@st.cache_data
def load_examples() -> list[dict]:
    """Read the hand-written prompts used in the example dropdown."""
    path = DATA_DIR / "handwritten_test.jsonl"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


# --------------------------------------------------------------------------- rendering
def highlight_prompt(text: str, spans: list[dict]) -> str:
    """Return HTML with one coloured span per labelled span."""
    ordered = sorted(spans, key=lambda s: s["char_start"] if s["char_start"] >= 0 else 10**9)
    parts: list[str] = []
    cursor = 0
    for span in ordered:
        start, end = span["char_start"], span["char_end"]
        if start < 0 or start < cursor or end <= start or end > len(text):
            continue
        parts.append(html.escape(text[cursor:start]))
        background, _ = LABEL_STYLES.get(span["label"], ("rgba(180,180,180,0.3)", "#333"))
        label = html.escape(span["label"])
        parts.append(
            f'<span title="{label}" style="background-color:{background};'
            'padding:2px 3px;border-radius:4px;">'
            f"{html.escape(text[start:end])}</span>"
        )
        cursor = end
    parts.append(html.escape(text[cursor:]))
    body = "".join(parts).replace("\n", "<br>")
    return (
        '<div style="line-height:2.1;font-size:1.05rem;padding:0.75rem 1rem;'
        'border:1px solid rgba(128,128,128,0.3);border-radius:8px;">'
        f"{body}</div>"
    )


def render_legend() -> None:
    """Small colour legend shown in the sidebar."""
    items = []
    for label, (background, colour) in LABEL_STYLES.items():
        items.append(
            f'<span style="background:{background};color:{colour};padding:2px 7px;'
            'margin:2px;border-radius:10px;font-size:0.8rem;font-weight:600;">'
            f"{label}</span>"
        )
    st.markdown(" ".join(items), unsafe_allow_html=True)


def render_attributes(attributes: dict[str, str]) -> None:
    """Attribute chips for one element."""
    if not attributes:
        st.caption("No attributes detected.")
        return
    chips = []
    for attribute, value in attributes.items():
        chips.append(
            '<span style="display:inline-block;background:rgba(128,128,128,0.15);'
            'padding:2px 9px;margin:2px 4px 2px 0;border-radius:12px;font-size:0.85rem;">'
            f"<b>{html.escape(attribute)}</b>: {html.escape(value)}</span>"
        )
    st.markdown(" ".join(chips), unsafe_allow_html=True)


def render_element(element: dict) -> None:
    """One status card per detected element."""
    complete = element["status"] == "complete"
    icon = "✅" if complete else "⚠️"
    title = (
        f"{icon} {element['type'].capitalize()} #{element['id']} — "
        f'"{html.escape(element["text"])}"'
    )
    with st.container(border=True):
        st.markdown(f"#### {title}")
        st.caption("Complete" if complete else f"Missing {len(element['missing'])} detail(s)")
        render_attributes(element["attributes"])
        if element["missing"]:
            st.markdown("**What is missing**")
            for message in element["messages"]:
                st.markdown(f"- {message}")
        st.markdown("**Suggested rewrite**")
        st.code(element["suggestion"], language=None)


def render_risk(payload: dict) -> None:
    """Risk gauge, component bars and explanation."""
    initial = payload["risk"]["initial"]
    final = payload["risk"]["final"]
    delta = final["score"] - initial["score"]

    col1, col2 = st.columns([1, 2])
    with col1:
        st.metric(
            "Prompt risk",
            f"{final['score']:.0f} / 100",
            delta=f"{delta:+.0f}",
            delta_color="inverse",
        )
        st.caption(f"**{final['level']}** · initial {initial['score']:.0f}")
    with col2:
        st.progress(min(1.0, max(0.0, final["score"] / 100.0)))
        for key, label in RISK_COMPONENTS.items():
            value = final["components"].get(key, 0.0)
            st.progress(min(1.0, max(0.0, value)), text=f"{label}: {value * 100:.0f}%")

    explanation = payload.get("explanation") or final.get("explanation", "")
    if explanation:
        label = "LLM explanation" if payload.get("llm_used") else "Why this score"
        st.markdown(f"**{label}**")
        st.info(explanation)


def render_questions(payload: dict) -> None:
    """Render the blocking clarification form."""
    questions = payload["clarification"]["questions"]
    if not questions:
        return
    round_no = st.session_state.get("round", 1)
    st.warning(
        "Answer these questions so I can produce a safe final recommendation. "
        f"Round {round_no} of 3."
    )
    with st.form(key=f"clarify_{round_no}"):
        values: dict[str, str] = {}
        for question in questions:
            qid = question["id"]
            if question.get("options"):
                options = question["options"] + ["I don't know / use placeholder"]
                choice = st.selectbox(question["prompt"], options, key=f"q_{round_no}_{qid}")
                values[qid] = "unknown" if choice.startswith("I don't know") else choice
            else:
                examples = ", ".join(question.get("examples") or [])
                text = st.text_input(
                    question["prompt"],
                    key=f"q_{round_no}_{qid}",
                    placeholder=examples,
                    help=f"Examples: {examples}" if examples else None,
                )
                unknown = st.checkbox(
                    "I don't know (use placeholder)",
                    key=f"unk_{round_no}_{qid}",
                )
                values[qid] = "unknown" if unknown or not text.strip() else text.strip()

        submitted = st.form_submit_button("Submit answers", type="primary")
        skipped = st.form_submit_button("Stop asking (use placeholders)")

    if submitted or skipped:
        st.session_state["answers"] = values
        st.session_state["round"] = round_no + 1
        if skipped or round_no >= 3:
            st.session_state["finalized"] = True
        st.rerun()


def render_final(payload: dict) -> None:
    """Final recommendation, explanation and unresolved items."""
    unresolved = payload["clarification"]["unresolved"]
    if unresolved:
        st.warning("Some questions remain unresolved; the final prompt uses placeholders.")
        for question in unresolved:
            st.markdown(f"- {question['prompt']}")

    st.subheader("Best prompt")
    if payload.get("final_prompt"):
        st.code(payload["final_prompt"], language=None)
    else:
        st.info(payload["result"]["summary"]["message"])

    recommendations = payload.get("recommendations") or []
    if recommendations:
        st.markdown("**Recommendations**")
        for recommendation in recommendations:
            st.markdown(f"- {recommendation}")


def render_details(payload: dict) -> None:
    """Collapsed engine / router / LLM diagnostics."""
    router = payload.get("router", {})
    with st.expander("Why this engine?"):
        st.write(f"**Engine used:** `{payload.get('engine', '?')}`")
        st.write(f"**Method requested:** `{router.get('method', 'auto')}`")
        st.write(f"**Reason:** {router.get('reason', 'manual selection')}")
        st.write(f"**Detector confidence:** {payload.get('confidence', 0):.2f}")
        if router.get("scores"):
            st.write(f"**Router scores:** `{router['scores']}`")
        if payload.get("llm_meta"):
            st.write(f"**LLM metadata:** `{payload['llm_meta']}`")
        if payload.get("llm_error"):
            st.warning(f"LLM unavailable: {payload['llm_error']}")
        elif payload.get("llm_used"):
            st.caption("The final explanation/rewrite was produced by the LLM and validated.")
        elif payload.get("engine") == "llm" or payload.get("needs_clarification"):
            st.caption("LLM explanation was not used in this view.")


def _run(text: str, method: str, allow_llm: bool, answers: dict, finalize: bool) -> dict | None:
    try:
        if method in {"auto", "bert"}:
            _ensure_model_downloaded()
        return analyze_full(
            text,
            method=method,
            allow_llm=allow_llm,
            answers=answers or None,
            finalize=finalize,
            client=get_llm_client() if allow_llm else None,
        )
    except BackendNotAvailable as exc:
        st.error(str(exc))
    except Exception as exc:  # defensive: the UI must never crash
        st.error(f"Could not analyse this prompt: {exc}")
    return None


# --------------------------------------------------------------------------- main
def main() -> None:
    st.set_page_config(page_title="UI Prompt Linter", page_icon="🧹", layout="centered")

    st.title("UI Prompt Linter")
    st.caption(
        "Analyse a UI prompt, resolve unclear details, and get a risk-rated final "
        "recommendation before sending it to a UI generator."
    )

    model_available = (
        (PROJECT_ROOT / "models" / "bert_tagger").exists() or bool(BERT_MODEL_URL)
    )

    with st.sidebar:
        st.header("Settings")
        backend_labels = ["Auto (choose best)"]
        if model_available:
            backend_labels += ["Rules", "BERT (DistilBERT)"]
        else:
            backend_labels += ["Rules"]
            st.caption("BERT is unavailable: `models/bert_tagger` is missing.")
        backend_label = st.radio("Detection engine", backend_labels)
        method = (
            "auto" if backend_label.startswith("Auto")
            else "bert" if backend_label.startswith("BERT")
            else "rules"
        )

        allow_llm = st.toggle("Allow LLM fallback / explanation (Ollama)", value=True)
        live_mode = st.toggle("Live mode (check while typing)", value=False)
        if live_mode and allow_llm:
            st.caption("LLM calls are disabled in live mode to avoid repeated requests.")
        if allow_llm:
            st.caption(
                "LLM provider: local Ollama (`qwen2.5:3b-instruct` by default). "
                "On a hosted deployment, set `LLM_BASE_URL`, `LLM_MODEL` and "
                "`LLM_API_KEY` in App settings ? Secrets."
            )

        st.divider()
        st.subheader("Examples")
        examples = load_examples()
        options = [EXAMPLE_OPTION] + [
            f"{row['id']}: {row['text'][:60]}" for row in examples
        ]
        choice = st.selectbox("Load an example prompt", options)
        if choice != EXAMPLE_OPTION and st.session_state.get("last_example") != choice:
            index = options.index(choice) - 1
            example_text = examples[index]["text"]
            st.session_state["live_prompt"] = example_text
            st.session_state["batch_prompt"] = example_text
            st.session_state["analysis_text"] = example_text
            st.session_state["last_example"] = choice

        st.divider()
        st.subheader("Legend")
        render_legend()

    st.session_state.setdefault("live_prompt", "")
    st.session_state.setdefault("batch_prompt", "")

    if live_mode:
        text = st_keyup(
            "Your prompt",
            value=st.session_state["live_prompt"],
            key="live_prompt",
            debounce=400,
            placeholder="e.g. Add a red button at the top right corner...",
        )
        shown_text = text
    else:
        text = st.text_area(
            "Your prompt",
            key="batch_prompt",
            height=140,
            placeholder="e.g. Add a red button at the top right corner...",
        )
        if st.button("Check prompt", type="primary"):
            st.session_state["analysis_text"] = text
        shown_text = st.session_state.get("analysis_text", "")

    if len(text) > MAX_PROMPT_CHARS or len(shown_text) > MAX_PROMPT_CHARS:
        st.warning(
            f"Prompt is longer than {MAX_PROMPT_CHARS} characters; "
            "only the first part will be analysed."
        )
    shown_text = shown_text[:MAX_PROMPT_CHARS]

    if not shown_text or not shown_text.strip():
        st.info("Type a prompt or pick an example to get started.")
        return

    # Reset clarification state when the prompt or engine changes.
    state_key = f"{method}|{shown_text}"
    if st.session_state.get("state_key") != state_key:
        st.session_state["state_key"] = state_key
        st.session_state["answers"] = {}
        st.session_state["round"] = 1
        st.session_state["finalized"] = False

    effective_llm = allow_llm and not live_mode
    answers = st.session_state.get("answers", {}) if not live_mode else {}
    finalize = st.session_state.get("finalized", False) if not live_mode else False

    st.session_state["shown_text"] = shown_text
    with st.spinner("Analysing the prompt..."):
        payload = _run(shown_text, method, effective_llm, answers, finalize)
    if payload is None:
        return

    st.markdown(highlight_prompt(shown_text, payload["spans"]), unsafe_allow_html=True)
    st.write("")
    render_risk(payload)

    result = payload["result"]
    summary = result["summary"]
    if summary["n_elements"] == 0:
        st.info(summary["message"])
    elif summary["complete"]:
        st.success(summary["message"])
    else:
        st.warning(summary["message"])

    for element in result["elements"]:
        render_element(element)

    if payload["needs_clarification"]:
        if live_mode:
            st.info(
                "Turn off live mode to answer the clarification questions and get "
                "the final recommendation."
            )
            for question in payload["clarification"]["questions"]:
                st.markdown(f"- {question['prompt']}")
        else:
            render_questions(payload)
    else:
        render_final(payload)

    render_details(payload)


if __name__ == "__main__":
    main()
