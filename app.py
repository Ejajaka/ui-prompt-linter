"""Streamlit UI for the UI/UX Prompt Linter.

The visual language follows the warm editorial dashboard used by the author's
earlier Vector project: off-white canvas, white cards, teal primary actions and
mustard accents. All content is rewritten for UI/UX prompt review.

Run with::

    streamlit run app.py
"""
from __future__ import annotations

import html
import json
import math
import os
import sys
import zipfile
from pathlib import Path
from urllib.request import urlretrieve

import streamlit as st

# The engine package lives under ``engine/src``; expose it for ``from src.``.
sys.path.insert(0, str(Path(__file__).resolve().parent / "engine"))

from src.llm_backend import LLMClient
from src.pipeline import BackendNotAvailable, analyze_full
from src.schema import DATA_DIR, ELEMENT_SCHEMA, PROJECT_ROOT

try:  # package rename: streamlit-keyup >= 1.0 ships the module as st_keyup
    from st_keyup import st_keyup
except ImportError:  # pragma: no cover - older versions
    from streamlit_keyup import st_keyup

DEFAULT_MODEL_URL = (
    "https://github.com/Ejajaka/ui-prompt-linter/releases/download/"
    "model-v1/bert_tagger.zip"
)
BERT_MODEL_URL = os.environ.get("BERT_MODEL_URL", DEFAULT_MODEL_URL)
MAX_PROMPT_CHARS = 1000

LABEL_STYLES = {
    "ELEMENT": ("rgba(73, 104, 108, 0.22)", "#30494B"),
    "COLOR": ("rgba(209, 182, 83, 0.26)", "#856C16"),
    "LOCATION": ("rgba(90, 128, 132, 0.22)", "#49686C"),
    "ACTION": ("rgba(104, 142, 94, 0.24)", "#3E6B33"),
    "LABEL": ("rgba(201, 104, 57, 0.20)", "#9C4A28"),
}
RISK_COLORS = {
    "Critical": "#B94D42",
    "High": "#C96839",
    "Medium": "#D1B653",
    "Low": "#688E5E",
}
RISK_CLASS = {
    "Critical": "critical",
    "High": "high",
    "Medium": "medium",
    "Low": "low",
}
EXAMPLE_OPTION = "— choose an example —"
PAGES = {
    "analysis": ("New UI Prompt Analysis", "UI/UX Prompt Analyzer"),
    "about": ("About Prompt Linter", "UI/UX Prompt Review"),
    "guidelines": ("Prompt Guidelines", "Completeness Baseline"),
    "settings": ("System Settings", "Engine & Preferences"),
}

CSS = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg-page: #F6F4EC;
  --bg-card: #FFFFFF;
  --bg-subtle: #FAFAF8;
  --bg-hover: #F0EDE3;
  --primary-teal: #49686C;
  --dark-teal: #30494B;
  --accent-mustard: #D1B653;
  --soft-green: #E4EBDD;
  --soft-green-text: #2D5A27;
  --text-main: #283638;
  --text-secondary: #737A72;
  --border-subtle: #E5E2D8;
  --border-strong: #CDC9BC;
  --risk-critical: #B94D42;
  --risk-high: #C96839;
  --risk-medium: #D1B653;
  --risk-low: #688E5E;
}

html, body, .stApp {
  background: var(--bg-page) !important;
  color: var(--text-main);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
[data-testid="stHeader"] { background: transparent !important; }
#MainMenu, footer, [data-testid="stAppDeployButton"] { visibility: hidden; }
.block-container { padding-top: 1.2rem !important; padding-bottom: 3rem !important; max-width: 1500px; }

[data-testid="stSidebar"] {
  background: var(--bg-card) !important;
  border-right: 1px solid var(--border-subtle);
}
[data-testid="stSidebar"] > div:first-child { padding-top: .5rem; }
[data-testid="stSidebar"] .block-container { padding-top: .5rem; }

/* Sidebar brand */
.brand { display:flex; align-items:center; gap:.7rem; padding:.2rem .2rem .9rem; border-bottom:1px solid var(--border-subtle); margin-bottom:.8rem; }
.brand-logo { width:36px; height:36px; border-radius:10px; background:var(--dark-teal); display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(40,54,56,.18); }
.brand-name { font-weight:800; font-size:1rem; letter-spacing:-.02em; line-height:1.1; color:var(--text-main); }
.brand-sub { font-size:.6rem; letter-spacing:.14em; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-top:.2rem; }

/* Sidebar nav buttons */
[data-testid="stSidebar"] .stButton > button {
  width:100%; justify-content:flex-start; border:0 !important; background:transparent !important;
  color:var(--text-main) !important; font-weight:600; font-size:.86rem; padding:.55rem .7rem;
  border-radius:8px; box-shadow:none !important;
}
[data-testid="stSidebar"] .stButton > button:hover { background:var(--bg-hover) !important; }
[data-testid="stSidebar"] .stButton > button[kind="primary"] {
  background:var(--primary-teal) !important; color:#fff !important;
}
[data-testid="stSidebar"] .stButton > button[kind="primary"] p { color:#fff !important; }

.sidebar-label { font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin:.8rem 0 .35rem; }
.sidebar-note { font-size:.7rem; color:var(--text-secondary); line-height:1.45; }

/* Topbar */
.topbar {
  display:flex; align-items:center; justify-content:space-between; gap:1rem;
  background:rgba(255,255,255,.86); backdrop-filter:blur(8px);
  border:1px solid var(--border-subtle); border-radius:12px;
  padding:.65rem .9rem; margin-bottom:1.1rem; position:sticky; top:.4rem; z-index:20;
}
.topbar-left { display:flex; align-items:center; gap:.55rem; min-width:0; }
.topbar-title { font-weight:700; font-size:.95rem; color:var(--text-main); white-space:nowrap; }
.topbar-sep { color:var(--border-strong); }
.topbar-sub { font-size:.72rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.topbar-right { display:flex; align-items:center; gap:.45rem; flex-wrap:wrap; justify-content:flex-end; }
.pill { display:inline-flex; align-items:center; gap:.35rem; padding:.22rem .6rem; border-radius:6px; font-size:.67rem; font-weight:600; border:1px solid var(--border-subtle); background:var(--bg-subtle); color:var(--primary-teal); white-space:nowrap; }
.pill-green { background:#F4F9F1; border-color:#CFE2C8; color:#3E6B33; }
.dot { width:6px; height:6px; border-radius:50%; background:#3E6B33; display:inline-block; }

/* Cards */
div[data-testid="stVerticalBlockBorderWrapper"] {
  background:var(--bg-card); border:1px solid var(--border-subtle) !important;
  border-radius:12px; box-shadow:0 1px 2px rgba(40,54,56,.05);
  padding:.95rem 1.1rem !important;
}
.card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:12px; padding:1.1rem 1.2rem; box-shadow:0 1px 2px rgba(40,54,56,.05); margin-bottom:1rem; }
.card-eyebrow { font-size:.62rem; letter-spacing:.14em; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:.3rem; }
.card-title { font-size:1.05rem; font-weight:800; color:var(--text-main); letter-spacing:-.015em; }
.card-sub { font-size:.76rem; color:var(--text-secondary); margin-top:.15rem; }
.muted { color:var(--text-secondary); }

/* Page header */
.page-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin:.2rem 0 1rem; }
.page-title { font-size:clamp(1.35rem, 2.4vw, 1.8rem); font-weight:800; letter-spacing:-.03em; color:var(--text-main); display:flex; align-items:center; gap:.55rem; flex-wrap:wrap; }
.page-badge { font-size:.68rem; font-weight:700; padding:.2rem .55rem; border-radius:6px; background:var(--soft-green); color:var(--soft-green-text); border:1px solid #CFE2C8; letter-spacing:.02em; }
.page-sub { font-size:.82rem; color:var(--text-secondary); margin-top:.2rem; max-width:70ch; }

/* Editor */
.editor-head { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:.6rem; }
.editor-title { font-size:.98rem; font-weight:800; color:var(--text-main); }
.editor-sub { font-size:.75rem; color:var(--text-secondary); margin-top:.1rem; }
.char-count { font-size:.72rem; color:var(--text-secondary); font-family:'JetBrains Mono', monospace; }
.stTextArea textarea, .stTextInput input, .stSelectbox [data-baseweb="select"] > div {
  background:var(--bg-subtle) !important; border:1px solid var(--border-subtle) !important;
  color:var(--text-main) !important; border-radius:8px !important; font-family:'Plus Jakarta Sans', sans-serif !important;
}
.stTextArea textarea:focus, .stTextInput input:focus { border-color:var(--primary-teal) !important; box-shadow:0 0 0 2px rgba(73,104,108,.12) !important; }
.stTextArea textarea { font-size:.88rem !important; line-height:1.55 !important; }
.stSelectbox label, .stTextInput label, .stTextArea label, .stRadio label { color:var(--text-main) !important; font-size:.78rem !important; font-weight:600 !important; }
[data-testid="stSidebar"] label { font-size:.72rem !important; }

/* Buttons */
.stButton > button, .stDownloadButton > button {
  border-radius:8px !important; border:1px solid var(--border-subtle) !important;
  background:var(--bg-card) !important; color:var(--text-main) !important;
  font-weight:700 !important; font-size:.78rem !important; box-shadow:0 1px 2px rgba(40,54,56,.04) !important;
}
.stButton > button:hover, .stDownloadButton > button:hover { background:var(--bg-hover) !important; border-color:var(--border-strong) !important; }
.stButton > button[kind="primary"] { background:var(--primary-teal) !important; border-color:var(--primary-teal) !important; color:#fff !important; }
.stButton > button[kind="primary"]:hover { background:var(--dark-teal) !important; }
.stButton > button p, .stDownloadButton > button p { color:inherit !important; font-weight:700 !important; }

/* Risk overview */
.risk-head { display:flex; align-items:center; justify-content:space-between; gap:.75rem; flex-wrap:wrap; padding-bottom:.75rem; border-bottom:1px solid var(--border-subtle); margin-bottom:.9rem; }
.risk-title { font-size:1.05rem; font-weight:800; letter-spacing:-.015em; }
.risk-sub { font-size:.75rem; color:var(--text-secondary); margin-top:.1rem; }
.badge { display:inline-flex; align-items:center; gap:.35rem; padding:.25rem .6rem; border-radius:6px; font-size:.68rem; font-weight:800; letter-spacing:.02em; border:1px solid; white-space:nowrap; }
.badge.critical { background:#FDF2F0; border-color:#F0C4BF; color:#B94D42; }
.badge.high { background:#FFF7ED; border-color:#FED7AA; color:#C96839; }
.badge.medium { background:#FEFCE8; border-color:#FEF08A; color:#856C16; }
.badge.low { background:#F4F9F1; border-color:#CFE2C8; color:#3E6B33; }
.risk-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:.8rem; align-items:stretch; }
@media (max-width: 900px) { .risk-grid { grid-template-columns:repeat(2, minmax(0,1fr)); } }
@media (max-width: 560px) { .risk-grid { grid-template-columns:1fr; } }
.gauge-card, .stat-card { background:var(--bg-subtle); border:1px solid var(--border-subtle); border-radius:10px; padding:.8rem; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.gauge-label { font-size:.75rem; font-weight:700; margin-top:.35rem; }
.gauge-sub { font-size:.65rem; color:var(--text-secondary); }
.gauge-note { font-size:.6rem; color:var(--text-secondary); margin-top:.35rem; }
.stat-card { align-items:stretch; justify-content:flex-start; text-align:left; }
.stat-title { font-size:.72rem; font-weight:800; margin-bottom:.35rem; }
.stat-row { display:flex; align-items:center; justify-content:space-between; padding:.3rem .4rem; border:1px solid var(--border-subtle); border-radius:6px; background:#fff; margin-bottom:.3rem; font-size:.68rem; color:var(--text-secondary); }
.stat-row b { color:var(--text-main); font-family:'JetBrains Mono', monospace; }
.bar-track { height:7px; background:var(--border-subtle); border-radius:999px; overflow:hidden; margin:.25rem 0 .55rem; }
.bar-fill { height:100%; background:var(--primary-teal); border-radius:999px; }
.assessment { margin-top:.85rem; display:flex; gap:.6rem; align-items:flex-start; background:var(--bg-page); border:1px solid var(--border-subtle); border-radius:10px; padding:.7rem .8rem; }
.assessment-icon { width:24px; height:24px; border-radius:6px; background:var(--border-subtle); color:var(--dark-teal); display:flex; align-items:center; justify-content:center; flex:0 0 auto; font-size:.7rem; }
.assessment-title { font-size:.72rem; font-weight:800; color:var(--dark-teal); }
.assessment-text { font-size:.74rem; color:var(--text-main); line-height:1.55; margin-top:.1rem; }

/* Highlighted prompt */
.prompt-view { font-size:1rem; line-height:2.1; padding:.85rem 1rem; border-radius:10px; border:1px solid var(--border-subtle); background:var(--bg-subtle); }
.span-ELEMENT { background:rgba(73,104,108,.20); padding:2px 3px; border-radius:4px; }
.span-COLOR { background:rgba(209,182,83,.28); padding:2px 3px; border-radius:4px; }
.span-LOCATION { background:rgba(90,128,132,.22); padding:2px 3px; border-radius:4px; }
.span-ACTION { background:rgba(104,142,94,.24); padding:2px 3px; border-radius:4px; }
.span-LABEL { background:rgba(201,104,57,.20); padding:2px 3px; border-radius:4px; }

/* Element / finding cards */
.finding-card { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:10px; padding:.85rem .95rem; margin-bottom:.65rem; box-shadow:0 1px 2px rgba(40,54,56,.04); }
.finding-head { display:flex; align-items:flex-start; justify-content:space-between; gap:.6rem; }
.finding-title { font-size:.9rem; font-weight:800; color:var(--text-main); }
.finding-sub { font-size:.72rem; color:var(--text-secondary); margin-top:.05rem; }
.finding-status { font-size:.64rem; font-weight:800; padding:.18rem .5rem; border-radius:5px; border:1px solid; white-space:nowrap; }
.finding-status.ok { background:#F4F9F1; border-color:#CFE2C8; color:#3E6B33; }
.finding-status.warn { background:#FEFCE8; border-color:#FEF08A; color:#856C16; }
.chips { display:flex; flex-wrap:wrap; gap:.3rem; margin:.5rem 0; }
.chip { background:var(--bg-subtle); border:1px solid var(--border-subtle); padding:.16rem .5rem; border-radius:999px; font-size:.66rem; color:var(--text-main); }
.chip b { color:var(--primary-teal); }
.missing-list { margin:.4rem 0 .2rem; padding-left:1rem; color:var(--text-secondary); font-size:.73rem; line-height:1.5; }
.missing-list li { margin:.22rem 0; }
.suggestion { background:var(--bg-page); border:1px dashed var(--border-strong); border-radius:8px; padding:.55rem .65rem; font-family:'JetBrains Mono', monospace; font-size:.68rem; color:var(--text-main); line-height:1.5; }
.empty-state { text-align:center; padding:1.4rem .8rem; color:var(--text-secondary); font-size:.8rem; }

/* Forms */
.question-block { border-top:1px solid var(--border-subtle); padding-top:.6rem; margin-top:.6rem; }
.question-block:first-child { border-top:0; padding-top:0; margin-top:0; }
.question-text { font-size:.76rem; font-weight:700; color:var(--text-main); margin-bottom:.15rem; }
.question-hint { font-size:.66rem; color:var(--text-secondary); margin-bottom:.3rem; }
.unknown-label { font-size:.68rem; color:var(--text-secondary); }
.stCheckbox label { font-size:.72rem !important; color:var(--text-secondary) !important; }

/* Code / final prompt */
[data-testid="stCode"] pre, [data-testid="stCode"] code { background:var(--bg-subtle) !important; border-radius:8px !important; font-family:'JetBrains Mono', monospace !important; font-size:.76rem !important; white-space:pre-wrap !important; word-break:break-word !important; overflow-x:hidden !important; }
.rec-list { margin:.4rem 0 0; padding-left:1.1rem; font-size:.76rem; color:var(--text-main); line-height:1.55; }
.rec-list li { margin:.3rem 0; }
.unresolved { background:#FEFCE8; border:1px solid #FEF08A; color:#856C16; border-radius:8px; padding:.55rem .65rem; font-size:.72rem; margin-bottom:.6rem; }
.banner-note { background:#FFF8E1; border:1px solid #F0D58C; color:#856C16; border-radius:8px; padding:.6rem .7rem; font-size:.74rem; margin-bottom:.7rem; }

/* About / guidelines */
.hero { background:linear-gradient(135deg, rgba(73,104,108,.10), rgba(209,182,83,.10)); border:1px solid var(--border-subtle); border-radius:14px; padding:1.4rem 1.5rem; margin-bottom:1rem; }
.hero h1 { margin:0; font-size:clamp(1.5rem,3vw,2.2rem); letter-spacing:-.04em; }
.hero p { color:var(--text-secondary); max-width:75ch; margin:.5rem 0 0; font-size:.86rem; line-height:1.6; }
.feature-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.8rem; }
@media (max-width:900px){ .feature-grid { grid-template-columns:1fr; } }
.feature { background:var(--bg-card); border:1px solid var(--border-subtle); border-radius:10px; padding:.8rem .9rem; }
.feature-title { font-size:.82rem; font-weight:800; margin-bottom:.2rem; }
.feature-text { font-size:.72rem; color:var(--text-secondary); line-height:1.5; }
table.schema { width:100%; border-collapse:collapse; font-size:.74rem; }
table.schema th { text-align:left; padding:.45rem .5rem; border-bottom:1px solid var(--border-strong); color:var(--text-secondary); font-size:.66rem; text-transform:uppercase; letter-spacing:.08em; }
table.schema td { padding:.45rem .5rem; border-bottom:1px solid var(--border-subtle); vertical-align:top; }
table.schema td:first-child { font-weight:700; color:var(--text-main); }
table.schema tr:last-child td { border-bottom:0; }
.steps { counter-reset:step; display:grid; gap:.55rem; }
.step { display:flex; gap:.6rem; align-items:flex-start; font-size:.76rem; color:var(--text-main); }
.step-num { width:22px; height:22px; border-radius:6px; background:var(--soft-green); color:var(--soft-green-text); font-weight:800; font-size:.68rem; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
.footer-note { font-size:.66rem; color:var(--text-secondary); text-align:center; margin-top:1.2rem; }
</style>
"""


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
    try:
        value = st.secrets.get(name)
        return str(value) if value else None
    except Exception:
        return None


@st.cache_resource(show_spinner=False)
def get_llm_client() -> LLMClient:
    return LLMClient(
        base_url=_secret("LLM_BASE_URL") or os.environ.get("LLM_BASE_URL"),
        model=_secret("LLM_MODEL") or os.environ.get("LLM_MODEL"),
        api_key=_secret("LLM_API_KEY") or os.environ.get("LLM_API_KEY"),
        session=_secret("LLM_SESSION") or os.environ.get("LLM_SESSION"),
    )


@st.cache_data
def load_examples() -> list[dict]:
    path = DATA_DIR / "handwritten_test.jsonl"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


# --------------------------------------------------------------------------- html helpers
def esc(value) -> str:
    return html.escape(str(value if value is not None else ""))


def compact_html(markup: str) -> str:
    """Collapse indented HTML so Streamlit/Markdown does not turn it into code."""
    return " ".join(line.strip() for line in markup.splitlines() if line.strip())


def risk_badge(level: str) -> str:
    return f'<span class="badge {RISK_CLASS.get(level, "low")}">● {esc(level)} risk</span>'


def gauge(score: float, label: str, sublabel: str, color: str, size: int = 104) -> str:
    score = max(0, min(100, int(round(score))))
    radius = (size - 9) / 2
    circumference = 2 * math.pi * radius
    offset = circumference - (score / 100) * circumference
    return f"""
    <div class="gauge-card">
      <div style="position:relative;width:{size}px;height:{size}px;">
        <svg width="{size}" height="{size}" style="transform:rotate(-90deg)" aria-hidden="true">
          <circle cx="{size/2}" cy="{size/2}" r="{radius}" stroke="#E5E2D8" stroke-width="9" fill="transparent"/>
          <circle cx="{size/2}" cy="{size/2}" r="{radius}" stroke="{color}" stroke-width="9"
            stroke-dasharray="{circumference:.2f}" stroke-dashoffset="{offset:.2f}"
            stroke-linecap="round" fill="transparent"/>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-family:'JetBrains Mono',monospace; font-size:1.25rem; font-weight:800;">{score}</div>
          <div style="font-size:.55rem; color:#737A72; letter-spacing:.08em;">/ 100</div>
        </div>
      </div>
      <div class="gauge-label">{esc(label)}</div>
      <div class="gauge-sub">{esc(sublabel)}</div>
    </div>
    """


def highlight_prompt(text: str, spans: list[dict]) -> str:
    ordered = sorted(spans, key=lambda s: s["char_start"] if s["char_start"] >= 0 else 10**9)
    parts: list[str] = []
    cursor = 0
    for span in ordered:
        start, end = span["char_start"], span["char_end"]
        if start < 0 or start < cursor or end <= start or end > len(text):
            continue
        parts.append(esc(text[cursor:start]))
        label = span["label"]
        parts.append(
            f'<span class="span-{esc(label)}" title="{esc(label)}">'
            f"{esc(text[start:end])}</span>"
        )
        cursor = end
    parts.append(esc(text[cursor:]))
    body = "".join(parts).replace("\n", "<br>")
    return f'<div class="prompt-view">{body}</div>'


def sidebar_legend() -> None:
    chips = []
    for label, (background, colour) in LABEL_STYLES.items():
        chips.append(
            f'<span style="background:{background};color:{colour};padding:2px 7px;'
            'margin:2px;border-radius:5px;font-size:.62rem;font-weight:700;">'
            f"{esc(label)}</span>"
        )
    st.markdown(" ".join(chips), unsafe_allow_html=True)


# --------------------------------------------------------------------------- report
def report_markdown(text: str, payload: dict) -> str:
    result = payload["result"]
    risk = payload["risk"]["final"]
    lines = [
        "# Prompt Linter Report",
        "",
        "## Original prompt",
        "```",
        text,
        "```",
        "",
        "## Risk",
        f"- Score: {risk['score']} / 100 ({risk['level']})",
        f"- Missing required details: {risk['counts']['missing']}",
        f"- Vague details: {risk['counts']['vague']}",
        f"- Unresolved questions: {risk['counts']['unresolved']}",
        f"- Engine: {payload.get('engine')}",
        "",
        "## Detected elements",
    ]
    for element in result["elements"]:
        attrs = ", ".join(f"{k}={v}" for k, v in element["attributes"].items())
        lines.append(
            f"- **{element['type']} #{element['id']}** “{element['text']}” — "
            f"{attrs or 'no attributes'}; missing: {', '.join(element['missing']) or 'none'}"
        )
    lines += ["", "## Best prompt", "```", payload.get("final_prompt") or "(pending clarification)", "```", ""]
    if payload.get("recommendations"):
        lines.append("## Recommendations")
        lines.extend(f"- {item}" for item in payload["recommendations"])
    return "\n".join(lines)


# --------------------------------------------------------------------------- sidebar
def render_sidebar() -> tuple[str, bool, bool]:
    st.session_state.setdefault("page", "analysis")
    with st.sidebar:
        st.markdown(
            """
            <div class="brand">
              <div class="brand-logo">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FACB43" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="2"/>
                  <path d="M3 9h18M9 9v11"/>
                </svg>
              </div>
              <div>
                <div class="brand-name">Prompt Linter</div>
                <div class="brand-sub">UI/UX Prompt Review</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        nav = [
            ("analysis", "◈  New Analysis"),
            ("about", "▦  About & Overview"),
            ("guidelines", "▤  Prompt Guidelines"),
            ("settings", "⚙  Settings"),
        ]
        for key, label in nav:
            if st.button(
                label,
                key=f"nav_{key}",
                use_container_width=True,
                type="primary" if st.session_state.page == key else "secondary",
            ):
                st.session_state.page = key
                st.rerun()

        st.markdown('<div class="sidebar-label">Engine</div>', unsafe_allow_html=True)
        engine_label = st.selectbox(
            "Detection engine",
            ["Auto (choose best)", "Rules", "BERT (DistilBERT)"],
            label_visibility="collapsed",
            key="engine_select",
        )
        method = (
            "auto" if engine_label.startswith("Auto")
            else "bert" if engine_label.startswith("BERT")
            else "rules"
        )
        allow_llm = st.toggle("Allow LLM (OpenCode / Ollama)", value=True, key="allow_llm")
        live_mode = st.toggle("Live check while typing", value=False, key="live_mode")
        if allow_llm:
            st.markdown(
                '<div class="sidebar-note">LLM explanations and low-confidence fallback. '
                "Configure a hosted key in Settings → Secrets.</div>",
                unsafe_allow_html=True,
            )

        st.markdown('<div class="sidebar-label">Examples</div>', unsafe_allow_html=True)
        examples = load_examples()
        options = [EXAMPLE_OPTION] + [f"{row['id']}: {row['text'][:55]}" for row in examples]
        choice = st.selectbox(
            "Load an example",
            options,
            label_visibility="collapsed",
            key="example_select",
        )
        if choice != EXAMPLE_OPTION and st.session_state.get("last_example") != choice:
            index = options.index(choice) - 1
            example_text = examples[index]["text"]
            st.session_state["live_prompt"] = example_text
            st.session_state["batch_prompt"] = example_text
            st.session_state["analysis_text"] = example_text
            st.session_state["last_example"] = choice
            st.session_state["answers"] = {}
            st.session_state["round"] = 1
            st.session_state["finalized"] = False
            st.session_state["state_key"] = None

        st.markdown('<div class="sidebar-label">Legend</div>', unsafe_allow_html=True)
        sidebar_legend()

        st.markdown(
            """
            <div style="margin-top:1.2rem;padding-top:.7rem;border-top:1px solid #E5E2D8;
                        display:flex;align-items:center;justify-content:space-between;
                        font-size:.63rem;color:#737A72;">
              <span style="font-family:'JetBrains Mono',monospace;">v2.0</span>
              <span style="display:inline-flex;align-items:center;gap:.3rem;color:#49686C;font-weight:600;">
                <span style="width:6px;height:6px;border-radius:50%;background:#3E6B33;display:inline-block;"></span>
                Engine ready
              </span>
            </div>
            """,
            unsafe_allow_html=True,
        )
    return method, allow_llm, live_mode


# --------------------------------------------------------------------------- topbar
def render_topbar(page: str, method: str) -> None:
    title, subtitle = PAGES.get(page, PAGES["analysis"])
    engine = {"auto": "Auto · Rules/BERT/LLM", "rules": "Rules", "bert": "BERT"}[method]
    st.markdown(
        f"""
        <div class="topbar">
          <div class="topbar-left">
            <span class="topbar-title">{esc(title)}</span>
            <span class="topbar-sep">/</span>
            <span class="topbar-sub">{esc(subtitle)}</span>
          </div>
          <div class="topbar-right">
            <span class="pill">UI · UX Prompt Review</span>
            <span class="pill pill-green"><span class="dot"></span> {esc(engine)}</span>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def page_header(title: str, badge: str, subtitle: str) -> None:
    st.markdown(
        f"""
        <div class="page-head">
          <div>
            <div class="page-title">{esc(title)} <span class="page-badge">{esc(badge)}</span></div>
            <div class="page-sub">{esc(subtitle)}</div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# --------------------------------------------------------------------------- analysis rendering
def render_action_bar(text: str, payload: dict) -> None:
    result = payload["result"]
    summary = result["summary"]
    n_missing = sum(len(element["missing"]) for element in result["elements"])
    st.markdown(
        f"""
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:.7rem;flex-wrap:wrap;padding:.7rem .9rem;">
          <div style="display:flex;align-items:center;gap:.55rem;font-size:.75rem;color:#737A72;">
            <span class="dot" style="background:#49686C;"></span>
            <b style="color:#283638;">Diagnosis complete</b>
            <span>· {len(result['elements'])} element(s) · {n_missing} missing detail(s)</span>
          </div>
          <div style="font-size:.68rem;color:#737A72;">{esc(summary['message'])}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    col1, col2, _ = st.columns([1, 1, 5])
    with col1:
        st.download_button(
            "JSON",
            data=json.dumps(payload, ensure_ascii=False, indent=2),
            file_name="ui-prompt-report.json",
            mime="application/json",
            use_container_width=True,
        )
    with col2:
        st.download_button(
            "Markdown",
            data=report_markdown(text, payload),
            file_name="ui-prompt-report.md",
            mime="text/markdown",
            use_container_width=True,
        )


def render_risk_overview(payload: dict) -> None:
    initial = payload["risk"]["initial"]
    final = payload["risk"]["final"]
    components = final["components"]
    counts = final["counts"]
    completeness = round(100 * (1 - components.get("completeness", 1)))
    confidence = round(100 * float(payload.get("confidence", 0)))
    risk = final["score"]
    level = final["level"]
    risk_color = RISK_COLORS.get(level, "#49686C")
    coverage_color = "#30494B" if completeness >= 75 else "#49686C" if completeness >= 50 else "#D1B653"
    explanation = payload.get("explanation") or final.get("explanation", "")
    initial_note = (
        f'<div class="banner-note"><b>Initial assessment.</b> Answer the clarification '
        f"questions to unlock the final recommendation. Initial risk: {initial['score']}/100.</div>"
        if payload.get("needs_clarification")
        else ""
    )
    st.markdown(
        compact_html(
        f"""
        <div class="card">
          <div class="risk-head">
            <div>
              <div class="risk-title">Evaluation Summary {risk_badge(level)}</div>
              <div class="risk-sub">Shared risk score across Rules, BERT and LLM detection.</div>
            </div>
            <div class="pill">Initial {initial['score']} → Final {final['score']}</div>
          </div>
          {initial_note}
          <div class="risk-grid">
            {gauge(risk, "Risk index", "Lower is safer", risk_color)}
            {gauge(completeness, "Completeness", "Required details stated", coverage_color)}
            <div class="stat-card">
              <div class="stat-title">Detector confidence</div>
              <div class="bar-track"><div class="bar-fill" style="width:{confidence}%;"></div></div>
              <div style="font-size:.68rem;color:#737A72;line-height:1.45;">
                {confidence}% confidence from the selected engine. This is a heuristic, not a
                calibrated probability.
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-title">Detected findings</div>
              <div class="stat-row"><span>UI elements</span><b>{len(payload['result']['elements'])}</b></div>
              <div class="stat-row"><span>Missing details</span><b>{counts.get('missing', 0)}</b></div>
              <div class="stat-row"><span>Vague details</span><b>{counts.get('vague', 0)}</b></div>
              <div class="stat-row"><span>Unresolved questions</span><b>{counts.get('unresolved', 0)}</b></div>
            </div>
          </div>
          <div class="assessment">
            <div class="assessment-icon">i</div>
            <div>
              <div class="assessment-title">Evaluation assessment</div>
              <div class="assessment-text">{esc(explanation)}</div>
            </div>
          </div>
        </div>
        """
        ),
        unsafe_allow_html=True,
    )


def render_highlighted_card(text: str, payload: dict) -> None:
    st.markdown(
        f"""
        <div class="card">
          <div class="card-eyebrow">Prompt under review</div>
          <div class="card-title" style="margin-bottom:.45rem;">Your interface request</div>
          {highlight_prompt(text, payload['spans'])}
          <div style="margin-top:.5rem;font-size:.66rem;color:#737A72;">
            Highlighted spans show the elements and attributes detected by the
            {'Auto router' if payload.get('router', {}).get('method') == 'auto' else payload.get('engine', 'selected')} engine.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def element_card(element: dict) -> str:
    complete = element["status"] == "complete"
    chips = "".join(
        f'<span class="chip"><b>{esc(key)}</b>: {esc(value)}</span>'
        for key, value in element["attributes"].items()
    )
    missing = "".join(f"<li>{esc(message)}</li>" for message in element["messages"])
    return f"""
    <div class="finding-card">
      <div class="finding-head">
        <div>
          <div class="finding-title">{'✅' if complete else '⚠️'} {esc(element['type'].capitalize())} #{element['id']}</div>
          <div class="finding-sub">“{esc(element['text'])}”</div>
        </div>
        <span class="finding-status {'ok' if complete else 'warn'}">
          {'Complete' if complete else f"Missing {len(element['missing'])} detail(s)"}
        </span>
      </div>
      <div class="chips">{chips or '<span class="chip">No attributes detected</span>'}</div>
      {f'<ul class="missing-list">{missing}</ul>' if missing else ''}
      <div style="font-size:.64rem;font-weight:800;color:#737A72;text-transform:uppercase;letter-spacing:.1em;margin:.3rem 0 .25rem;">Suggested rewrite</div>
      <div class="suggestion">{esc(element['suggestion'])}</div>
    </div>
    """


def render_elements(result: dict) -> None:
    elements = result["elements"]
    if not elements:
        st.markdown(
            '<div class="card"><div class="empty-state">No supported UI elements were '
            "detected. Try mentioning a button, navbar, input field, card, modal, "
            "image, dropdown, sidebar, footer or checkbox.</div></div>",
            unsafe_allow_html=True,
        )
        return
    cards = "".join(element_card(element) for element in elements)
    st.markdown(
        f"""
        <div style="display:flex;align-items:center;justify-content:space-between;margin:.2rem 0 .5rem;">
          <div class="card-title" style="font-size:.95rem;">Detected elements ({len(elements)})</div>
          <div style="font-size:.66rem;color:#737A72;">Extracted by the selected NLP engine</div>
        </div>
        {cards}
        """,
        unsafe_allow_html=True,
    )


def render_questions_form(payload: dict) -> None:
    questions = payload["clarification"]["questions"]
    if not questions:
        return
    round_no = st.session_state.get("round", 1)
    st.markdown(
        f"""
        <div class="card-eyebrow">Clarification needed</div>
        <div class="card-title">A few details are still unclear</div>
        <div class="card-sub">Round {round_no} of 3 · answer these to unlock the final recommendation.</div>
        """,
        unsafe_allow_html=True,
    )
    with st.form(key=f"clarify_{round_no}"):
        values: dict[str, str] = {}
        for question in questions:
            qid = question["id"]
            st.markdown('<div class="question-block">', unsafe_allow_html=True)
            st.markdown(f'<div class="question-text">{esc(question["prompt"])}</div>', unsafe_allow_html=True)
            if question.get("examples"):
                st.markdown(
                    f'<div class="question-hint">Examples: {esc(", ".join(question["examples"]))}</div>',
                    unsafe_allow_html=True,
                )
            if question.get("options"):
                options = question["options"] + ["I don't know / use placeholder"]
                choice = st.selectbox(
                    "Answer", options, key=f"q_{round_no}_{qid}", label_visibility="collapsed"
                )
                values[qid] = "unknown" if choice.startswith("I don't know") else choice
            else:
                text = st.text_input(
                    "Answer",
                    key=f"q_{round_no}_{qid}",
                    placeholder=", ".join(question.get("examples") or []),
                    label_visibility="collapsed",
                )
                unknown = st.checkbox(
                    "I don't know (use placeholder)",
                    key=f"unk_{round_no}_{qid}",
                )
                values[qid] = "unknown" if unknown or not text.strip() else text.strip()
            st.markdown("</div>", unsafe_allow_html=True)
        submitted = st.form_submit_button("Submit answers", type="primary", use_container_width=True)
        skipped = st.form_submit_button("Stop asking (use placeholders)", use_container_width=True)

    if submitted or skipped:
        st.session_state["answers"] = values
        st.session_state["round"] = round_no + 1
        if skipped or round_no >= 3:
            st.session_state["finalized"] = True
        st.rerun()


def render_final_card(payload: dict) -> None:
    unresolved = payload["clarification"]["unresolved"]
    st.markdown(
        f"""
        <div class="card-eyebrow">Validated recommendation</div>
        <div class="card-title">Best prompt</div>
        <div class="card-sub">Built from confirmed details, with placeholders for anything unresolved.</div>
        """,
        unsafe_allow_html=True,
    )
    if unresolved:
        items = "".join(f"<div>• {esc(q['prompt'])}</div>" for q in unresolved)
        st.markdown(
            f'<div class="unresolved"><b>Unresolved:</b>{items}</div>',
            unsafe_allow_html=True,
        )
    if payload.get("final_prompt"):
        st.code(payload["final_prompt"], language=None)
    else:
        st.info(payload["result"]["summary"]["message"])
    recommendations = payload.get("recommendations") or []
    if recommendations:
        items = "".join(f"<li>{esc(item)}</li>" for item in recommendations)
        st.markdown(
            f'<div style="font-size:.64rem;font-weight:800;color:#737A72;text-transform:uppercase;'
            f'letter-spacing:.1em;margin:.7rem 0 .25rem;">Recommendations</div>'
            f'<ul class="rec-list">{items}</ul>',
            unsafe_allow_html=True,
        )
    st.markdown(
        '<div style="font-size:.62rem;color:#737A72;text-align:center;margin-top:.6rem;">'
        "Ready to paste into your UI generator, Figma prompt or code assistant.</div>",
        unsafe_allow_html=True,
    )


def render_explanation_card(payload: dict) -> None:
    explanation = payload.get("explanation")
    if not explanation:
        return
    label = "LLM explanation" if payload.get("llm_used") else "Why this score"
    st.markdown(
        f"""
        <div class="card" style="background:#FAFAF8;">
          <div class="card-eyebrow">{label}</div>
          <div class="assessment-text" style="font-size:.76rem;">{esc(explanation)}</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_details(payload: dict) -> None:
    router = payload.get("router", {})
    with st.expander("Why this engine and score?"):
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
        st.write("**Risk components:**")
        st.json(payload["risk"]["final"]["components"])


# --------------------------------------------------------------------------- analysis page
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


def render_analysis_page(
    method: str, allow_llm: bool, live_mode: bool, embedded: bool = False
) -> None:
    if not embedded:
        page_header(
            "New UI Prompt Analysis",
            "UI/UX Prompt Analyzer",
            "Review your interface request for missing elements, unclear details and risky assumptions before generating UI.",
        )

    st.session_state.setdefault("live_prompt", "")
    st.session_state.setdefault("batch_prompt", "")

    with st.container(border=True):
        st.markdown(
            """
            <div class="editor-head">
              <div>
                <div class="editor-title">Describe the UI you want</div>
                <div class="editor-sub">Enter a natural-language UI request: screen, elements, colours, placement and behaviour.</div>
              </div>
              <div class="char-count" id="char-count"></div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        if live_mode:
            text = st_keyup(
                "Your prompt",
                value=st.session_state["live_prompt"],
                key="live_prompt",
                debounce=400,
                placeholder='e.g. Add a red button at the top right corner labelled "Sign Up" that opens the signup form.',
                label_visibility="collapsed",
            )
            shown_text = text
        else:
            text = st.text_area(
                "Your prompt",
                key="batch_prompt",
                height=130,
                placeholder='e.g. Add a red button at the top right corner labelled "Sign Up" that opens the signup form.',
                label_visibility="collapsed",
            )
            cols = st.columns([1, 1, 4])
            with cols[0]:
                analyze_clicked = st.button("Analyze prompt", type="primary", use_container_width=True)
            with cols[1]:
                if st.button("Clear", use_container_width=True):
                    st.session_state["batch_prompt"] = ""
                    st.session_state["analysis_text"] = ""
                    st.session_state["answers"] = {}
                    st.session_state["state_key"] = None
                    st.rerun()
            if analyze_clicked:
                st.session_state["analysis_text"] = text
                st.session_state["answers"] = {}
                st.session_state["round"] = 1
                st.session_state["finalized"] = False
            shown_text = st.session_state.get("analysis_text", "")

    if len(text) > MAX_PROMPT_CHARS or len(shown_text) > MAX_PROMPT_CHARS:
        st.warning(
            f"Prompt is longer than {MAX_PROMPT_CHARS} characters; only the first part will be analysed."
        )
    shown_text = shown_text[:MAX_PROMPT_CHARS]

    if not shown_text or not shown_text.strip():
        st.markdown(
            """
            <div class="card" style="text-align:center;padding:1.6rem;">
              <div style="font-size:1.6rem;margin-bottom:.4rem;">⌘</div>
              <div style="font-weight:800;font-size:.95rem;">Start with a UI request</div>
              <div style="color:#737A72;font-size:.78rem;margin-top:.25rem;">
                Type a prompt, load an example, or switch on live mode in the sidebar.
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )
        return

    state_key = f"{method}|{shown_text}"
    if st.session_state.get("state_key") != state_key:
        st.session_state["state_key"] = state_key
        st.session_state["answers"] = {}
        st.session_state["round"] = 1
        st.session_state["finalized"] = False

    effective_llm = allow_llm and not live_mode
    answers = st.session_state.get("answers", {}) if not live_mode else {}
    finalize = st.session_state.get("finalized", False) if not live_mode else False

    with st.spinner("Analysing the prompt..."):
        payload = _run(shown_text, method, effective_llm, answers, finalize)
    if payload is None:
        return

    render_action_bar(shown_text, payload)
    render_risk_overview(payload)
    render_highlighted_card(shown_text, payload)

    left, right = st.columns([7, 5], gap="large")
    with left:
        render_elements(payload["result"])
    with right:
        with st.container(border=True):
            if payload["needs_clarification"]:
                if live_mode:
                    st.markdown(
                        '<div class="card-eyebrow">Clarification needed</div>'
                        '<div class="card-title">Answer these to unlock the prompt</div>'
                        '<div class="card-sub">Turn off live mode to submit answers.</div>',
                        unsafe_allow_html=True,
                    )
                    for question in payload["clarification"]["questions"]:
                        st.markdown(f"- {esc(question['prompt'])}")
                else:
                    render_questions_form(payload)
            else:
                render_final_card(payload)
        render_explanation_card(payload)

    render_details(payload)


# --------------------------------------------------------------------------- about page
def render_about_page() -> None:
    page_header(
        "About Prompt Linter",
        "UI/UX Prompt Review",
        "A pre-generation completeness checker for natural-language UI requests.",
    )
    st.markdown(
        """
        <div class="hero">
          <h1>Better prompts, better interfaces.</h1>
          <p>
            Prompt Linter reads a UI request before it reaches a generator. It detects the
            interface elements, links colours, locations, actions and labels to the right
            element, asks about anything ambiguous, and scores the prompt before producing a
            validated rewrite.
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("Start a new analysis", type="primary"):
        st.session_state.page = "analysis"
        st.rerun()

    st.markdown(
        """
        <div class="feature-grid" style="margin-top:1rem;">
          <div class="feature"><div class="feature-title">Detect elements</div><div class="feature-text">Button, navbar, input, card, modal, image, dropdown, sidebar, footer and checkbox.</div></div>
          <div class="feature"><div class="feature-title">Link attributes</div><div class="feature-text">Attach colour, location, action and label to the correct element, not just the nearest noun.</div></div>
          <div class="feature"><div class="feature-title">Clear doubts</div><div class="feature-text">Missing, vague or low-confidence details become targeted questions, not silent guesses.</div></div>
          <div class="feature"><div class="feature-title">Score the risk</div><div class="feature-text">A shared 0–100 score combines completeness, vagueness, detector confidence and unresolved questions.</div></div>
          <div class="feature"><div class="feature-title">Validate the rewrite</div><div class="feature-text">The final prompt uses confirmed values and placeholders; the LLM cannot invent details.</div></div>
          <div class="feature"><div class="feature-title">Compare engines</div><div class="feature-text">Rules, a fine-tuned DistilBERT tagger, and an optional grounded LLM router.</div></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="card" style="margin-top:1rem;">
          <div class="card-title" style="margin-bottom:.5rem;">How it works</div>
          <div class="steps">
            <div class="step"><div class="step-num">1</div><div>Tokenise the prompt and choose the best detection engine from prompt features.</div></div>
            <div class="step"><div class="step-num">2</div><div>Detect UI elements and link each attribute to its element.</div></div>
            <div class="step"><div class="step-num">3</div><div>Check the required-attribute schema and identify missing or vague details.</div></div>
            <div class="step"><div class="step-num">4</div><div>Ask clarification questions and merge the answers structurally.</div></div>
            <div class="step"><div class="step-num">5</div><div>Recompute the risk score and produce a validated final prompt.</div></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.markdown(
        """
        <div class="card">
          <div class="card-title" style="margin-bottom:.5rem;">Evaluation snapshot</div>
          <table class="schema">
            <tr><th>Test set</th><th>Rules</th><th>BERT</th><th>Auto</th></tr>
            <tr><td>Entity F1 (synthetic)</td><td>0.973</td><td>0.900</td><td>0.971</td></tr>
            <tr><td>Missing-detail F1</td><td>0.989</td><td>0.977</td><td>0.989</td></tr>
            <tr><td>Exact missing-set accuracy</td><td>0.975</td><td>0.910</td><td>0.975</td></tr>
            <tr><td>Handwritten entity F1</td><td>0.837</td><td>0.718</td><td>0.828</td></tr>
          </table>
          <div class="card-sub" style="margin-top:.5rem;">Full metrics and error analysis are in results/RESULTS.md.</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# --------------------------------------------------------------------------- guidelines page
def render_guidelines_page() -> None:
    page_header(
        "Prompt Guidelines",
        "Completeness Baseline",
        "What a UI prompt needs before it is safe to generate.",
    )
    rows = "".join(
        f"<tr><td>{esc(element)}</td><td>{esc(', '.join(info['required']))}</td></tr>"
        for element, info in ELEMENT_SCHEMA.items()
    )
    st.markdown(
        f"""
        <div class="card">
          <div class="card-title" style="margin-bottom:.5rem;">Required attributes</div>
          <table class="schema">
            <tr><th>Element</th><th>Required attributes</th></tr>
            {rows}
          </table>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown(
        """
        <div class="card">
          <div class="card-title" style="margin-bottom:.5rem;">Annotation rules</div>
          <div class="steps">
            <div class="step"><div class="step-num">1</div><div><b>No inference.</b> “A login button” does not imply an action.</div></div>
            <div class="step"><div class="step-num">2</div><div><b>Vague values are missing.</b> “Some nice colour” is asked about, not guessed.</div></div>
            <div class="step"><div class="step-num">3</div><div><b>Landmarks are locations.</b> “Above the footer” is a location, not a footer element.</div></div>
            <div class="step"><div class="step-num">4</div><div><b>Clause ownership.</b> An attribute belongs to the element in its clause.</div></div>
            <div class="step"><div class="step-num">5</div><div><b>Only the words.</b> Quotes and function words remain outside the labelled spans.</div></div>
            <div class="step"><div class="step-num">6</div><div><b>No coreference.</b> “Make it blue” is out of scope; the user is asked to be explicit.</div></div>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown(
        """
        <div class="card">
          <div class="card-title" style="margin-bottom:.5rem;">Examples</div>
          <div style="font-size:.76rem;line-height:1.7;color:#283638;">
            <p><b>Incomplete:</b> “Add a button.” <span style="color:#737A72;">→ ask for label, action, colour and location.</span></p>
            <p><b>Vague:</b> “Put a card somewhere with some text.” <span style="color:#737A72;">→ ask for location and content.</span></p>
            <p><b>Complete:</b> “Add a red button at the top right corner labelled ‘Sign Up’ that opens the signup form.”</p>
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# --------------------------------------------------------------------------- settings page
def render_settings_page(method: str, allow_llm: bool, live_mode: bool) -> None:
    page_header(
        "System Settings",
        "Engine & Preferences",
        "Engine selection, LLM configuration and session controls.",
    )
    engine = {"auto": "Auto (choose best)", "rules": "Rules", "bert": "BERT (DistilBERT)"}[method]
    endpoint = _secret("LLM_BASE_URL") or os.environ.get("LLM_BASE_URL") or "local Ollama / not configured"
    model = _secret("LLM_MODEL") or os.environ.get("LLM_MODEL") or "qwen2.5:3b-instruct (local)"
    st.markdown(
        f"""
        <div class="card">
          <div class="card-title" style="margin-bottom:.5rem;">Current engine</div>
          <div class="stat-row"><span>Detection</span><b>{esc(engine)}</b></div>
          <div class="stat-row"><span>LLM enabled</span><b>{'Yes' if allow_llm else 'No'}</b></div>
          <div class="stat-row"><span>Live mode</span><b>{'On' if live_mode else 'Off'}</b></div>
          <div class="stat-row"><span>LLM endpoint</span><b style="font-size:.6rem;">{esc(endpoint)}</b></div>
          <div class="stat-row"><span>LLM model</span><b style="font-size:.6rem;">{esc(model)}</b></div>
          <div class="card-sub" style="margin-top:.4rem;">
            Change the engine and toggles in the sidebar. On a hosted deployment, add
            LLM_BASE_URL, LLM_MODEL, LLM_API_KEY and LLM_SESSION under app secrets.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown(
        """
        <div class="card">
          <div class="card-title" style="margin-bottom:.4rem;">Privacy</div>
          <div class="card-sub" style="font-size:.76rem;line-height:1.6;">
            Rules and BERT run locally or on the Streamlit host. If LLM mode is enabled,
            the prompt is sent to the configured OpenAI-compatible endpoint. If no endpoint
            is configured, the app uses deterministic explanations and never invents details.
          </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("Reset current analysis", type="secondary"):
        st.session_state["answers"] = {}
        st.session_state["round"] = 1
        st.session_state["finalized"] = False
        st.session_state["state_key"] = None
        st.session_state["analysis_text"] = ""
        st.success("Clarification state cleared. Return to New Analysis to start again.")


# --------------------------------------------------------------------------- main
def main() -> None:
    st.set_page_config(
        page_title="Prompt Linter — UI/UX",
        page_icon="◈",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    st.markdown(CSS, unsafe_allow_html=True)

    embed_value = st.query_params.get("uiembed")
    embed = embed_value == "1" or embed_value == ["1"]
    if embed:
        st.markdown(
            """
            <style>
            [data-testid="stSidebar"], [data-testid="stHeader"] { display:none !important; }
            .block-container { padding-top:.4rem !important; padding-bottom:1rem !important;
                                max-width:100% !important; }
            </style>
            """,
            unsafe_allow_html=True,
        )
        render_analysis_page("auto", True, False, embedded=True)
        return

    method, allow_llm, live_mode = render_sidebar()
    page = st.session_state.get("page", "analysis")
    render_topbar(page, method)

    if page == "analysis":
        render_analysis_page(method, allow_llm, live_mode)
    elif page == "about":
        render_about_page()
    elif page == "guidelines":
        render_guidelines_page()
    else:
        render_settings_page(method, allow_llm, live_mode)


if __name__ == "__main__":
    main()
