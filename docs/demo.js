/* UI Prompt Linter — permanent browser demo using Pyodide.
   Runs the actual Python Rules backend from src/ in the browser. */

const PYODIDE_VERSION = "0.28.3";
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PY_FILES = [
  "__init__.py", "schema.py", "tokenization.py", "bio.py", "messages.py",
  "checker.py", "vague.py", "linking.py", "clarification.py", "risk.py",
  "router.py", "rules_tagger.py", "pipeline.py", "llm_backend.py",
];

const BOOTSTRAP = `
import sys, json
sys.path.insert(0, '/home/pyodide')
from src.pipeline import analyze_full

def run_analysis(text, answers_json, finalize):
    answers = json.loads(answers_json) if answers_json else None
    payload = analyze_full(
        text,
        method="rules",
        allow_llm=False,
        answers=answers,
        finalize=bool(finalize),
    )
    return json.dumps(payload, ensure_ascii=False)
`;

const state = {
  text: "",
  answers: {},
  round: 1,
  ready: false,
};

let runAnalysis = null;

const $ = (id) => document.getElementById(id);
const results = $("results");
const statusEl = $("status");
const analyzeBtn = $("analyze");
const promptEl = $("prompt");
const examplesEl = $("examples");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.className = isError ? "status error" : "status";
}

async function boot() {
  try {
    setStatus("Loading the Python runtime (about 10–20 seconds the first time)…");
    const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
    pyodide.FS.mkdirTree("/home/pyodide/src");
    pyodide.FS.mkdirTree("/home/pyodide/data");

    await Promise.all(
      PY_FILES.map(async (name) => {
        const response = await fetch(`py/src/${name}`);
        if (!response.ok) throw new Error(`Could not load py/src/${name}`);
        pyodide.FS.writeFile(`/home/pyodide/src/${name}`, await response.text());
      })
    );
    const schemaResponse = await fetch("py/data/schema.json");
    if (!schemaResponse.ok) throw new Error("Could not load py/data/schema.json");
    pyodide.FS.writeFile("/home/pyodide/data/schema.json", await schemaResponse.text());

    await pyodide.runPythonAsync(BOOTSTRAP);
    runAnalysis = pyodide.globals.get("run_analysis");
    state.ready = true;
    analyzeBtn.disabled = false;
    setStatus("Ready. Rules engine loaded in your browser.");
    loadExamples();
  } catch (error) {
    console.error(error);
    setStatus(`Could not start the Python runtime: ${error.message}`, true);
  }
}

async function loadExamples() {
  try {
    const response = await fetch("examples.json");
    const examples = await response.json();
    for (const [index, example] of examples.entries()) {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `${example.id}: ${example.text.slice(0, 60)}`;
      examplesEl.appendChild(option);
    }
  } catch (error) {
    console.warn("Could not load examples.json", error);
  }
}

function callPython(finalize) {
  if (!runAnalysis) throw new Error("Python runtime is not ready yet.");
  const raw = runAnalysis(state.text, JSON.stringify(state.answers), finalize);
  return JSON.parse(String(raw));
}

function resetIfNeeded(text) {
  if (text !== state.text) {
    state.text = text;
    state.answers = {};
    state.round = 1;
  }
}

function analyze() {
  const text = promptEl.value.trim();
  if (!text) {
    setStatus("Type a prompt or load an example first.", true);
    return;
  }
  resetIfNeeded(text);
  analyzeBtn.disabled = true;
  setStatus("Analysing…");
  try {
    const payload = callPython(false);
    render(payload);
    setStatus("Done.");
  } catch (error) {
    console.error(error);
    setStatus(`Analysis failed: ${error.message}`, true);
  } finally {
    analyzeBtn.disabled = false;
  }
}

function render(payload) {
  results.classList.remove("hidden");
  renderRisk(payload);
  renderHighlighted(payload);
  renderSummary(payload);
  renderElements(payload);
  $("clarify").innerHTML = "";
  $("final").innerHTML = "";
  if (payload.needs_clarification) {
    renderClarify(payload);
  } else {
    renderFinal(payload);
  }
  renderDetails(payload);
}

function bar(label, value) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return `
    <div class="bar-label"><span>${escapeHtml(label)}</span><span>${pct}%</span></div>
    <div class="bar"><span style="width:${pct}%"></span></div>
  `;
}

function renderRisk(payload) {
  const initial = payload.risk.initial;
  const final = payload.risk.final;
  const components = final.components || {};
  const explanation = payload.explanation || final.explanation || "";
  const label = payload.llm_used ? "LLM explanation" : "Why this score";
  $("risk").innerHTML = `
    <div class="card">
      <div class="risk-grid">
        <div>
          <p class="risk-score">${final.score}<span style="font-size:1rem"> / 100</span></p>
          <p class="risk-level">${escapeHtml(final.level)}</p>
          <p class="status">Initial ${initial.score} (${escapeHtml(initial.level)})</p>
        </div>
        <div>
          ${bar("Missing details", components.completeness || 0)}
          ${bar("Vague details", components.vagueness || 0)}
          ${bar("Detector uncertainty", components.detection || 0)}
          ${bar("Unresolved questions", components.unresolved || 0)}
        </div>
      </div>
      <p><strong>${label}</strong></p>
      <p>${escapeHtml(explanation)}</p>
    </div>
  `;
}

function renderHighlighted(payload) {
  const spans = (payload.spans || [])
    .filter((span) => span.char_start >= 0)
    .sort((a, b) => a.char_start - b.char_start);
  const text = state.text;
  let cursor = 0;
  let html = "";
  for (const span of spans) {
    if (span.char_start < cursor || span.char_end <= span.char_start) continue;
    html += escapeHtml(text.slice(cursor, span.char_start));
    const label = escapeHtml(span.label);
    html += `<span class="span-${label}" title="${label}">${escapeHtml(
      text.slice(span.char_start, span.char_end)
    )}</span>`;
    cursor = span.char_end;
  }
  html += escapeHtml(text.slice(cursor));
  $("highlighted").innerHTML = `<div class="highlighted">${html.replaceAll("\n", "<br>")}</div>`;
}

function renderSummary(payload) {
  const summary = payload.result.summary;
  let cls = "info";
  if (summary.n_elements === 0) cls = "info";
  else if (summary.complete) cls = "success";
  else cls = "warn";
  $("summary").innerHTML = `<div class="banner ${cls}">${escapeHtml(summary.message)}</div>`;
}

function renderElements(payload) {
  const elements = payload.result.elements || [];
  if (!elements.length) {
    $("elements").innerHTML = "";
    return;
  }
  $("elements").innerHTML = elements
    .map((element) => {
      const chips = Object.entries(element.attributes || {})
        .map(
          ([key, value]) =>
            `<span class="chip"><b>${escapeHtml(key)}</b>: ${escapeHtml(value)}</span>`
        )
        .join("");
      const missing = (element.messages || [])
        .map((message) => `<li>${escapeHtml(message)}</li>`)
        .join("");
      return `
        <div class="element">
          <h3>${element.status === "complete" ? "✅" : "⚠️"}
            ${escapeHtml(element.type)} #${element.id} — “${escapeHtml(element.text)}”</h3>
          <p class="caption">${element.status === "complete" ? "Complete" : `Missing ${element.missing.length} detail(s)`}</p>
          <div class="chips">${chips || '<span class="chip">No attributes detected</span>'}</div>
          ${missing ? `<ul class="missing">${missing}</ul>` : ""}
          <p><strong>Suggested rewrite</strong></p>
          <div class="suggestion">${escapeHtml(element.suggestion)}</div>
        </div>
      `;
    })
    .join("");
}

function questionField(question) {
  const previous = state.answers[question.id];
  const isUnknown = previous === "unknown";
  const options = question.options || [];
  if (options.length) {
    const optionHtml = options
      .map(
        (option) =>
          `<option value="${escapeHtml(option)}" ${
            previous === option ? "selected" : ""
          }>${escapeHtml(option)}</option>`
      )
      .join("");
    return `
      <label for="q-${escapeHtml(question.id)}">${escapeHtml(question.prompt)}</label>
      <select id="q-${escapeHtml(question.id)}" data-qid="${escapeHtml(question.id)}">
        <option value="">Choose…</option>
        ${optionHtml}
        <option value="unknown" ${isUnknown ? "selected" : ""}>I don't know / use placeholder</option>
      </select>
    `;
  }
  const examples = (question.examples || []).join(", ");
  return `
    <label for="q-${escapeHtml(question.id)}">${escapeHtml(question.prompt)}</label>
    ${examples ? `<p class="hint">Examples: ${escapeHtml(examples)}</p>` : ""}
    <input id="q-${escapeHtml(question.id)}" type="text" data-qid="${escapeHtml(
      question.id
    )}" value="${isUnknown ? "" : escapeHtml(previous || "")}"
      placeholder="${escapeHtml(examples)}">
    <label class="unknown-label">
      <input type="checkbox" data-unknown="${escapeHtml(question.id)}" ${
        isUnknown ? "checked" : ""
      }>
      I don't know (use placeholder)
    </label>
  `;
}

function renderClarify(payload) {
  const questions = payload.clarification.questions || [];
  const fields = questions.map((question) => `<div class="question">${questionField(question)}</div>`).join("");
  $("clarify").innerHTML = `
    <div class="card">
      <div class="badges"><span class="pill">Clarification · round ${state.round} of 3</span></div>
      <p class="status">Answer these questions so the final recommendation is safe and specific.</p>
      <div id="clarify-form">${fields}</div>
      <div class="form-actions">
        <button class="primary" id="submit-answers">Submit answers</button>
        <button id="use-placeholders">Stop asking (use placeholders)</button>
      </div>
    </div>
  `;
  $("submit-answers").addEventListener("click", () => submitAnswers(false));
  $("use-placeholders").addEventListener("click", () => submitAnswers(true));
}

function collectAnswers() {
  const values = {};
  document.querySelectorAll("#clarify-form [data-qid]").forEach((field) => {
    const qid = field.dataset.qid;
    const checkbox = document.querySelector(`[data-unknown="${qid}"]`);
    let value = field.value.trim();
    if (checkbox && checkbox.checked) value = "unknown";
    if (!value) value = "unknown";
    values[qid] = value;
  });
  return values;
}

function submitAnswers(usePlaceholders) {
  const values = collectAnswers();
  if (Object.values(values).every((value) => value === "unknown")) {
    usePlaceholders = true;
  }
  state.answers = { ...state.answers, ...values };
  state.round += 1;
  try {
    let payload = callPython(false);
    if (payload.needs_clarification && !usePlaceholders && state.round <= 3) {
      render(payload);
      return;
    }
    if (payload.needs_clarification) {
      payload = callPython(true);
    }
    render(payload);
  } catch (error) {
    console.error(error);
    setStatus(`Could not merge answers: ${error.message}`, true);
  }
}

function renderFinal(payload) {
  const unresolved = payload.clarification.unresolved || [];
  const recommendations = payload.recommendations || [];
  const unresolvedHtml = unresolved.length
    ? `<div class="banner warn">Some questions remain unresolved; placeholders were used.</div>
       <ul class="missing">${unresolved
         .map((question) => `<li>${escapeHtml(question.prompt)}</li>`)
         .join("")}</ul>`
    : "";
  const recHtml = recommendations.length
    ? `<p><strong>Recommendations</strong></p><ul class="recs">${recommendations
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul>`
    : "";
  const promptHtml = payload.final_prompt
    ? `<p><strong>Best prompt</strong></p>
       <pre class="prompt" id="best-prompt">${escapeHtml(payload.final_prompt)}</pre>
       <div class="form-actions"><button id="copy-prompt">Copy prompt</button></div>`
    : `<div class="banner info">${escapeHtml(payload.result.summary.message)}</div>`;
  $("final").innerHTML = `<div class="card">${unresolvedHtml}${promptHtml}${recHtml}</div>`;
  const copy = $("copy-prompt");
  if (copy) {
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(payload.final_prompt);
        copy.textContent = "Copied!";
        setTimeout(() => (copy.textContent = "Copy prompt"), 1200);
      } catch {
        copy.textContent = "Select and copy manually";
      }
    });
  }
}

function renderDetails(payload) {
  const router = payload.router || {};
  $("details").innerHTML = `
    <details>
      <summary>Why this result?</summary>
      <p><b>Engine:</b> ${escapeHtml(payload.engine || "rules")} · <b>Confidence:</b> ${Number(
        payload.confidence || 0
      ).toFixed(2)}</p>
      <p><b>Router:</b> ${escapeHtml(router.reason || "manual selection")}</p>
      <p>Browser demo uses the Rules backend. BERT and LLM modes are available in the
        <a href="https://github.com/Ejajaka/ui-prompt-linter">full Streamlit app</a>.</p>
    </details>
  `;
}

examplesEl.addEventListener("change", () => {
  if (!examplesEl.value) return;
  const option = examplesEl.options[examplesEl.selectedIndex];
  promptEl.value = option.textContent.split(": ").slice(1).join(": ");
  promptEl.focus();
});

analyzeBtn.addEventListener("click", analyze);
promptEl.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") analyze();
});

boot();
