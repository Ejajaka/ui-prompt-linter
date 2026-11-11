/* Prompt Linter popup — wires the Rules engine to the UI. */
(function () {
  'use strict';

  var engine = window.PromptLinterEngine;

  var RISK_META = {
    Critical: { color: '#B94D42', badge: 'background:#FDF2F0;border-color:#F0C4BF;color:#B94D42' },
    High:     { color: '#C96839', badge: 'background:#FFF7ED;border-color:#FED7AA;color:#C96839' },
    Medium:   { color: '#D1B653', badge: 'background:#FEFCE8;border-color:#FEF08A;color:#856C16' },
    Low:      { color: '#688E5E', badge: 'background:#F4F9F1;border-color:#CFE2C8;color:#3E6B33' },
  };
  var BAR_COLORS = { completeness: '#49686C', vagueness: '#D1B653', detection: '#5A8090', unresolved: '#C96839' };
  var SPAN_STYLES = {
    ELEMENT: 'background:rgba(73,104,108,.20)',
    COLOR: 'background:rgba(209,182,83,.30)',
    LOCATION: 'background:rgba(90,128,132,.22)',
    ACTION: 'background:rgba(104,142,94,.26)',
    LABEL: 'background:rgba(201,104,57,.22)',
  };

  var $ = function (id) { return document.getElementById(id); };
  var promptEl = $('prompt'), analyzeBtn = $('analyze'), resultsEl = $('results');

  var state = { text: '', answers: {}, round: 1, payload: null };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------------------------------------------------------------- rendering
  function gauge(score, color) {
    var size = 86, r = 36, circ = 2 * Math.PI * r;
    var off = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;
    return (
      '<div class="gauge">' +
      '<svg width="' + size + '" height="' + size + '">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" stroke="#E5E2D8" stroke-width="8" fill="none"/>' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" stroke="' + color + '" stroke-width="8" fill="none" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '" stroke-linecap="round"/>' +
      '</svg>' +
      '<div class="val"><b>' + Math.round(score) + '</b><span>/ 100</span></div>' +
      '</div>'
    );
  }

  function renderRisk(p) {
    var final = p.risk.final;
    var meta = RISK_META[final.level] || RISK_META.Low;
    var components = final.components || {};
    var bars = ['completeness', 'vagueness', 'detection', 'unresolved'].map(function (k) {
      var v = Math.max(0, Math.min(100, Math.round((components[k] || 0) * 100)));
      return (
        '<div><div class="bar-label"><span>' + ({
          completeness: 'Missing details', vagueness: 'Vague details', detection: 'Detector uncertainty', unresolved: 'Unresolved questions',
        }[k]) + '</span><span class="mono">' + v + '%</span></div>' +
        '<div class="bar"><span style="width:' + v + '%;background:' + BAR_COLORS[k] + '"></span></div></div>'
      );
    }).join('');

    $('risk').innerHTML =
      '<div class="card">' +
      '<div class="risk-head"><span class="section-title" style="margin:0">Evaluation Summary</span>' +
      '<span class="risk-level" style="' + meta.badge + '">● ' + final.level + ' risk</span></div>' +
      '<div class="risk-grid">' + gauge(final.score, meta.color) +
      '<div class="risk-bars">' + bars + '</div></div>' +
      '<div class="risk-expl">' + esc(p.explanation || final.explanation || '') + '</div>' +
      '</div>';
  }

  function renderHighlighted(p) {
    var text = state.text;
    var ordered = (p.spans || []).filter(function (s) { return s.charStart >= 0 && s.charEnd > s.charStart; })
      .sort(function (a, b) { return a.charStart - b.charStart; });
    var html = '', cursor = 0;
    ordered.forEach(function (s) {
      if (s.charStart < cursor) return;
      if (s.charStart > cursor) html += esc(text.slice(cursor, s.charStart));
      html += '<span class="span-' + esc(s.label) + '">' + esc(text.slice(s.charStart, s.charEnd)) + '</span>';
      cursor = s.charEnd;
    });
    html += esc(text.slice(cursor));
    var legend = Object.keys(SPAN_STYLES).map(function (k) {
      return '<span style="' + SPAN_STYLES[k] + '">' + k + '</span>';
    }).join('');
    $('highlighted').innerHTML =
      '<div class="card"><div class="section-title">Prompt under review</div>' +
      '<div class="prompt-view">' + html.replace(/\n/g, '<br>') + '</div>' +
      '<div class="legend">' + legend + '</div></div>';
  }

  function renderElements(p) {
    var els = p.result.elements || [];
    if (!els.length) {
      $('elements').innerHTML = '<div class="card empty">No supported UI elements detected. Try mentioning a button, navbar or input field.</div>';
      return;
    }
    var cards = els.map(function (el) {
      var complete = el.status === 'complete';
      var chips = Object.keys(el.attributes).map(function (k) {
        return '<span class="chip"><b>' + esc(k) + '</b>: ' + esc(el.attributes[k]) + '</span>';
      }).join('') || '<span class="chip">No attributes detected</span>';
      var missing = (el.messages || []).map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('');
      return (
        '<div class="element">' +
        '<div class="element-head"><div><div class="element-title">' + (complete ? '✅' : '⚠️') + ' ' + esc(cap(el.type)) + ' #' + el.id + '</div>' +
        '<div class="element-text">“' + esc(el.text) + '”</div></div>' +
        '<span class="status ' + (complete ? 'ok' : 'warn') + '">' + (complete ? 'Complete' : 'Missing ' + (el.missing || []).length + ' detail(s)') + '</span></div>' +
        '<div class="chips">' + chips + '</div>' +
        (missing ? '<ul class="missing">' + missing + '</ul>' : '') +
        '<div class="sugg-label">Suggested rewrite</div><div class="suggestion">' + esc(el.suggestion) + '</div>' +
        '</div>'
      );
    }).join('');
    $('elements').innerHTML =
      '<div class="section-title">Detected elements (' + els.length + ')</div>' + cards;
  }

  function renderClarify(p) {
    var qs = p.clarification.questions || [];
    var fields = qs.map(function (q, idx) {
      var ex = (q.examples || []).length ? '<div class="ex">Examples: ' + esc(q.examples.join(', ')) + '</div>' : '';
      var input;
      if (q.options && q.options.length) {
        var opts = q.options.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
        input = '<select data-qid="' + esc(q.id) + '"><option value="">Choose…</option>' + opts + '<option value="unknown">I don\'t know / placeholder</option></select>';
      } else {
        input = '<input type="text" data-qid="' + esc(q.id) + '" placeholder="' + esc((q.examples || []).join(', ')) + '">' +
          '<label class="unknown-row"><input type="checkbox" data-unknown="' + esc(q.id) + '"> I don\'t know (placeholder)</label>';
      }
      return '<div class="question"><div class="q">' + esc(q.prompt) + '</div>' + ex + input + '</div>';
    }).join('');
    $('clarify').innerHTML =
      '<div class="card"><div class="section-title">A few details are still unclear</div>' +
      '<div class="element-text" style="margin-bottom:4px">Round ' + state.round + ' of 3 · answer to unlock the final prompt.</div>' +
      fields +
      '<div class="form-actions"><button type="button" id="submit-answers" class="primary">Submit answers</button>' +
      '<button type="button" id="use-placeholders" class="btn-ghost">Stop asking</button></div></div>';

    $('submit-answers').addEventListener('click', function () { submitAnswers(false); });
    $('use-placeholders').addEventListener('click', function () { submitAnswers(true); });
  }

  function renderFinal(p) {
    var unresolved = p.clarification.unresolved || [];
    var urHtml = unresolved.length
      ? '<div class="unresolved"><b>Unresolved:</b> ' + unresolved.map(function (q) { return esc(q.prompt); }).join(' · ') + '</div>'
      : '';
    var promptHtml = p.final_prompt
      ? '<div class="final-prompt">' + esc(p.final_prompt) + '</div>' +
        '<div class="copy-row"><button type="button" id="copy-prompt" class="btn-ghost">Copy prompt</button></div>'
      : '<div class="empty">' + esc(p.result.summary.message) + '</div>';
    var recs = (p.recommendations || []).length
      ? '<div class="sugg-label" style="margin-top:10px">Recommendations</div><ul class="recs">' +
        p.recommendations.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
      : '';
    $('final').innerHTML =
      '<div class="card"><div class="section-title">Best prompt</div>' + urHtml + promptHtml + recs + '</div>';

    var copyBtn = $('copy-prompt');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(p.final_prompt).then(function () {
          copyBtn.textContent = 'Copied!';
          setTimeout(function () { copyBtn.textContent = 'Copy prompt'; }, 1200);
        });
      });
    }
  }

  function render(p) {
    resultsEl.classList.remove('hidden');
    renderRisk(p);
    renderHighlighted(p);
    renderElements(p);
    $('clarify').innerHTML = '';
    $('final').innerHTML = '';
    if (p.needs_clarification) renderClarify(p);
    else renderFinal(p);
  }

  // ----------------------------------------------------------------- actions
  function analyze(text, answers, finalize) {
    var p = engine.analyze(text, answers || {}, !!finalize);
    state.payload = p;
    render(p);
  }

  function handleAnalyze() {
    var text = promptEl.value.trim();
    if (!text) return;
    state.text = text; state.answers = {}; state.round = 1;
    analyze(text, {}, false);
  }

  function collectAnswers() {
    var values = {};
    document.querySelectorAll('#clarify [data-qid]').forEach(function (field) {
      var qid = field.getAttribute('data-qid');
      var checkbox = document.querySelector('[data-unknown="' + qid + '"]');
      var v = field.value.trim();
      if (checkbox && checkbox.checked) v = 'unknown';
      if (!v) v = 'unknown';
      values[qid] = v;
    });
    return values;
  }

  function submitAnswers(usePlaceholders) {
    var values = collectAnswers();
    var allUnknown = Object.keys(values).every(function (k) { return values[k] === 'unknown'; });
    var stop = usePlaceholders || allUnknown;
    var merged = {};
    Object.keys(state.answers).forEach(function (k) { merged[k] = state.answers[k]; });
    Object.keys(values).forEach(function (k) { merged[k] = values[k]; });
    state.answers = merged;
    state.round += 1;

    var p = engine.analyze(state.text, merged, false);
    if (p.needs_clarification && !stop && state.round <= 3) { state.payload = p; render(p); return; }
    if (p.needs_clarification) p = engine.analyze(state.text, merged, true);
    state.payload = p;
    render(p);
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ------------------------------------------------------------------- wiring
  analyzeBtn.addEventListener('click', handleAnalyze);

  promptEl.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleAnalyze(); }
  });

  document.querySelectorAll('.example').forEach(function (btn) {
    btn.addEventListener('click', function () {
      promptEl.value = btn.getAttribute('data-prompt');
      promptEl.focus();
    });
  });
})();
