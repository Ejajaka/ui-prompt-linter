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

from src.pipeline import BackendNotAvailable, analyze
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


@st.cache_resource(show_spinner="Loading model...")
def load_backend(name: str):
    """Load and cache a backend instance for the whole server process."""
    if name == "bert":
        from src.bert_tagger import BertTagger

        return BertTagger()
    from src.rules_tagger import RulesTagger

    return RulesTagger()


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
    """Return HTML with one coloured span per labelled span.

    The original text is HTML-escaped *before* it is placed in the page, so
    prompts containing ``<`` or ``&`` cannot inject markup.
    """
    ordered = sorted(spans, key=lambda s: s["char_start"])
    parts: list[str] = []
    cursor = 0
    for span in ordered:
        start, end = span["char_start"], span["char_end"]
        if start < cursor or end <= start or end > len(text):
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


def render_result(analysis: dict) -> None:
    """Highlighted prompt, summary banner and element cards."""
    result = analysis["result"]
    summary = result["summary"]

    st.markdown(highlight_prompt(st.session_state["shown_text"], analysis["spans"]),
                unsafe_allow_html=True)
    st.write("")

    if summary["n_elements"] == 0:
        st.info(summary["message"])
        return
    if summary["complete"]:
        st.success(summary["message"])
    else:
        st.warning(summary["message"])

    for element in result["elements"]:
        render_element(element)


def run_analysis(text: str, backend: str) -> dict | None:
    """Call the pipeline and turn backend errors into friendly messages."""
    try:
        if backend == "bert":
            _ensure_model_downloaded()
        backend_obj = load_backend(backend)
        return analyze(text, backend=backend, backend_obj=backend_obj)
    except BackendNotAvailable as exc:
        st.error(str(exc))
    except FileNotFoundError as exc:
        st.error(str(exc))
    except Exception as exc:  # defensive: the UI must never crash
        st.error(f"Could not analyse this prompt: {exc}")
    return None


# --------------------------------------------------------------------------- main
def main() -> None:
    st.set_page_config(page_title="UI Prompt Linter", page_icon="🧹", layout="centered")

    st.title("UI Prompt Linter")
    st.caption(
        "Check a UI prompt for missing colours, locations, labels and actions "
        "before sending it to a UI generator."
    )

    model_available = (
        (PROJECT_ROOT / "models" / "bert_tagger").exists() or bool(BERT_MODEL_URL)
    )

    with st.sidebar:
        st.header("Settings")
        if model_available:
            backend_label = st.radio("Backend", ["Rules", "BERT (DistilBERT)"])
            backend = "bert" if backend_label.startswith("BERT") else "rules"
        else:
            backend = "rules"
            st.radio("Backend", ["Rules"], disabled=True)
            st.caption(
                "BERT is unavailable because `models/bert_tagger` is missing. "
                "Run `python train_bert.py` to enable it."
            )

        live_mode = st.toggle("Live mode (check while typing)", value=False)

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

    if len(text) > MAX_PROMPT_CHARS:
        st.warning(
            f"Prompt is longer than {MAX_PROMPT_CHARS} characters; "
            "only the first part will be analysed."
        )
        shown_text = text[:MAX_PROMPT_CHARS]

    if not shown_text or not shown_text.strip():
        st.info("Type a prompt or pick an example to get started.")
        return

    st.session_state["shown_text"] = shown_text
    analysis = run_analysis(shown_text, backend)
    if analysis is not None:
        render_result(analysis)


if __name__ == "__main__":
    main()
