/* Vector popup — wires the Rules engine to the UI. */
(function () {
  'use strict';

  var engine = window.VectorEngine;

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

  var $ = function (id) {
    return document.getElementById(id.charAt(0) === '#' ? id.slice(1) : id);
  };
  var promptEl = $('prompt'), analyzeBtn = $('analyze'), resultsEl = $('results');

  var AI_DEFAULTS = Object.assign({
    engine: 'auto', baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-120b', apiKey: '', configVersion: 2
  }, window.VECTOR_AI_DEFAULTS || {});
  AI_DEFAULTS.configVersion = 2;
  if (AI_DEFAULTS.apiKey === '__VECTOR_API_KEY__') AI_DEFAULTS.apiKey = '';
  var state = { text: '', answers: {}, round: 1, payload: null, engine: 'auto', settings: AI_DEFAULTS, plan: null, stage: 'idle' };

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

  function renderTasks(p) {
    var steps = [
      { id: 'route', label: '1 · Route' },
      { id: 'detect', label: '2 · Detect' },
      { id: 'clarify', label: '3 · Clarify' },
      { id: 'explain', label: '4 · Explain' }
    ];
    var current = p.needs_clarification ? 'clarify' : 'explain';
    var html = steps.map(function (s) {
      var idx = steps.map(function (x) { return x.id; }).indexOf(s.id);
      var curIdx = steps.map(function (x) { return x.id; }).indexOf(current);
      var cls = s.id === current ? 'active' : idx < curIdx ? 'done' : '';
      return '<span class="stage-chip ' + cls + '">' + s.label + '</span>';
    }).join('<span class="stage-arrow">→</span>');
    var note = p.needs_clarification
      ? 'Ambiguity found — score is withheld until you answer.'
      : 'Final score and LLM explanation ready.';
    $('stage').innerHTML = '<div class="card stage-card">' + html +
      '<span class="stage-note">' + esc(note) + '</span></div>';
  }

  function renderRoute(p) {
    var r = p.router || {};
    var compared = r.candidates || {};
    var rows = Object.keys(compared).map(function (k) {
      return '<span class="route-chip"><b>' + esc(k) + '</b> ' + Number(compared[k]).toFixed(2) + '</span>';
    }).join('');
    $('route').innerHTML =
      '<div class="card route-card">' +
      '<div class="route-head"><span class="section-title" style="margin:0">How this prompt was routed</span>' +
      '<span class="route-selected">' + esc(r.selected || p.engine || 'rules') + '</span></div>' +
      '<div class="route-reason">' + esc(r.reason || 'Router scored the prompt before detection.') + '</div>' +
      (rows ? '<div class="route-candidates"><span class="hint">Candidates:</span>' + rows + '</div>' : '') +
      (r.fallback ? '<div class="route-fallback">Fallback: ' + esc(r.fallback) + '</div>' : '') +
      '</div>';
  }

  function renderRisk(p) {
    if (p.needs_clarification) {
      $('risk').innerHTML =
        '<div class="card risk-gate"><div class="section-title" style="margin:0">Score withheld</div>' +
        '<div class="element-text">Answer the clarification questions below. The analyser re-runs after each round and only then computes the risk score and explanation.</div></div>';
      return;
    }
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
      '<div class="risk-expl"><b>' + (p.explanation_source === 'llm' ? 'LLM explanation' : 'Deterministic explanation') + '</b> ' +
      esc(p.explanation || final.explanation || '') + '</div>' +
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
      '<div class="element-text" style="margin-bottom:4px">Round ' + state.round + ' · the analyser re-runs after each answer.</div>' +
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
    renderTasks(p);
    renderRoute(p);
    renderRisk(p);
    renderHighlighted(p);
    renderElements(p);
    $('clarify').innerHTML = '';
    $('final').innerHTML = '';
    if (p.needs_clarification) renderClarify(p);
    else renderFinal(p);
  }

  // ----------------------------------------------------------------- actions
  function setStatus(text) {
    var el = $('ai-status');
    if (el) el.textContent = text || '';
  }

  function aiReady() {
    return new Promise(function (resolve, reject) {
      if (window.VectorAI) return resolve(window.VectorAI);
      var started = Date.now();
      var timer = setInterval(function () {
        if (window.VectorAI) { clearInterval(timer); resolve(window.VectorAI); }
        else if (Date.now() - started > 20000) { clearInterval(timer); reject(new Error('AI module failed to load.')); }
      }, 100);
    });
  }

  function allowLlm() {
    return !!(state.settings && state.settings.baseUrl && state.settings.model && state.settings.apiKey);
  }

  // Router-first detection: score the prompt, run the winning detector, then
  // verify the router's prediction against the actual confidence + detail.
  async function planDetection(text) {
    var route = engine.routePrompt(text, allowLlm());
    var baseline = engine.analyze(text, {}, false);
    var compared = { rules: engine.selectionScore(baseline) };
    var target = state.engine === 'auto' ? route.method : (state.engine === 'api' ? 'llm' : state.engine);
    var plan = {
      mode: state.engine, selected: 'rules', route: route, compared: compared,
      reason: route.reason, fallback: '', baseline: baseline
    };

    if (target === 'bert') {
      try {
        var ai = await aiReady();
        var bert = await ai.runBert(text, function (p) {
          setStatus('Downloading BERT ' + p.percent + '% (one time)');
        });
        var cand = engine.analyzeFromSpans(text, bert.spans, bert.confidence, 'bert', {}, false);
        compared.bert = engine.selectionScore(cand);
        plan.spans = bert.spans; plan.confidence = bert.confidence;
        plan.selected = 'bert';
        plan.reason = route.reason + ' BERT detected ' + cand.result.elements.length + ' element(s).';
        if (state.engine === 'auto' && compared.bert + 0.02 < compared.rules) {
          plan.selected = 'rules'; plan.spans = null;
          plan.fallback = 'rules-over-bert';
          plan.reason = 'Router predicted BERT, but Rules scored higher (' +
            compared.rules.toFixed(2) + ' vs ' + compared.bert.toFixed(2) + ').';
        }
      } catch (e) {
        plan.fallback = 'BERT unavailable: ' + (e.message || String(e));
        plan.reason = route.reason + ' Falling back to Rules.';
      }
    } else if (target === 'llm') {
      if (!allowLlm()) {
        plan.fallback = 'LLM not configured — add a key in the engine settings.';
        plan.reason = route.reason + ' Falling back to Rules.';
      } else {
        try {
          var ai2 = await aiReady();
          setStatus('Running LLM extraction…');
          var llm = await ai2.extractSpansApi(text, state.settings);
          var cand2 = engine.analyzeFromSpans(text, llm.spans, llm.confidence, 'llm', {}, false, llm.meta || null);
          compared.llm = engine.selectionScore(cand2);
          plan.spans = llm.spans; plan.confidence = llm.confidence;
          plan.selected = 'llm';
          plan.reason = route.reason + ' The LLM grounded ' + llm.spans.length + ' span(s).';
          if (state.engine === 'auto' && (
            compared.llm + 0.02 < compared.rules ||
            cand2.result.elements.length < baseline.result.elements.length
          )) {
            plan.selected = 'rules'; plan.spans = null;
            plan.fallback = 'rules-over-llm';
            plan.reason = 'Router predicted the LLM, but it covered fewer elements than Rules (' +
              cand2.result.elements.length + ' vs ' + baseline.result.elements.length +
              ') or scored lower (' + compared.rules.toFixed(2) + ' vs ' + compared.llm.toFixed(2) + ').';
          }
        } catch (e) {
          plan.fallback = 'LLM unavailable: ' + (e.message || String(e));
          plan.reason = route.reason + ' Falling back to Rules.';
        }
      }
    }
    setStatus('');
    state.plan = plan;
    return plan;
  }

  function runPlan(text, plan, answers, finalize) {
    if (plan.selected !== 'rules' && plan.spans && plan.spans.length) {
      return engine.analyzeFromSpans(text, plan.spans, plan.confidence, plan.selected, answers || {}, !!finalize);
    }
    if (!Object.keys(answers || {}).length && !finalize && plan.baseline) return plan.baseline;
    return engine.analyze(text, answers || {}, !!finalize);
  }

  // The final explanation is always requested from the LLM. If no key is
  // configured (or the call fails) the deterministic text is labelled instead.
  async function explainFinal(p) {
    if (!allowLlm()) { p.explanation_source = 'deterministic'; return p; }
    try {
      setStatus('Writing the LLM explanation…');
      var ai = await aiReady();
      var out = await ai.explainResult(
        state.text, p.result, p.risk.final, p.clarification.unresolved, state.settings
      );
      p.explanation = out.explanation || p.explanation;
      if (out.recommendations && out.recommendations.length) p.recommendations = out.recommendations;
      p.llm_used = true;
      p.explanation_source = 'llm';
    } catch (e) {
      p.explanation_source = 'deterministic';
    }
    setStatus('');
    return p;
  }

  async function analyze(text, answers, finalize) {
    resultsEl.classList.remove('hidden');
    $('stage').innerHTML = '<div class="card empty">Analyzing with ' +
      esc(state.engine === 'auto' ? 'the router' : state.engine.toUpperCase()) + '…</div>';
    try {
      var plan = state.plan || await planDetection(text);
      var p = runPlan(text, plan, answers, finalize);
      p.router = {
        method: plan.mode,
        selected: plan.selected,
        selected_by: plan.mode === 'auto' ? 'router+confidence' : 'manual',
        reason: plan.reason,
        scores: plan.route.scores,
        candidates: plan.compared,
        fallback: plan.fallback
      };
      if (!p.needs_clarification) p = await explainFinal(p);
      state.payload = p;
      render(p);
    } catch (e) {
      $('stage').innerHTML = '<div class="card empty">' + esc(e.message || String(e)) + '</div>';
      setStatus(e.message || String(e));
    }
  }

  function handleAnalyze() {
    var text = promptEl.value.trim();
    if (!text) return;
    state.text = text; state.answers = {}; state.round = 1; state.plan = null;
    analyze(text, {}, false);
  }

  function renderSettings(s) {
    $('#ai-engine').value = s.engine || 'auto';
    $('#ai-base-url').value = s.baseUrl || '';
    $('#ai-model').value = s.model || '';
    $('#ai-api-key').value = s.apiKey || '';
    state.engine = s.engine || 'auto';
    state.settings = s;
  }

  function loadAiSettings() {
    return new Promise(function (resolve) {
      var finish = function (saved) {
        saved = saved || {};
        // v1 stored a manual engine choice; migrate to the router default.
        if (saved.configVersion !== 2) saved.engine = AI_DEFAULTS.engine;
        resolve(Object.assign({}, AI_DEFAULTS, saved, { configVersion: 2 }));
      };
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['promptLinterAI'], function (d) {
          finish((d && d.promptLinterAI) || {});
        });
      } else {
        try { finish(JSON.parse(localStorage.getItem('promptLinterAI') || '{}')); }
        catch (e) { finish({}); }
      }
    });
  }

  $('#ai-save').addEventListener('click', function () {
    var s = {
      engine: $('#ai-engine').value,
      baseUrl: $('#ai-base-url').value.trim() || AI_DEFAULTS.baseUrl,
      model: $('#ai-model').value.trim() || AI_DEFAULTS.model,
      apiKey: $('#ai-api-key').value.trim(),
      configVersion: 2,
    };
    state.engine = s.engine; state.settings = s; state.plan = null;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ promptLinterAI: s });
    } else {
      try { localStorage.setItem('promptLinterAI', JSON.stringify(s)); } catch (e) {}
    }
    setStatus('Saved');
    setTimeout(function () { setStatus(''); }, 1200);
  });

  $('#ai-engine').addEventListener('change', function () {
    state.engine = $('#ai-engine').value;
    state.plan = null;
  });

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

  async function submitAnswers(usePlaceholders) {
    var values = collectAnswers();
    var allUnknown = Object.keys(values).every(function (k) { return values[k] === 'unknown'; });
    var stop = usePlaceholders || allUnknown;
    var merged = {};
    Object.keys(state.answers).forEach(function (k) { merged[k] = state.answers[k]; });
    Object.keys(values).forEach(function (k) { merged[k] = values[k]; });
    state.answers = merged;
    state.round += 1;

    try {
      var plan = state.plan || await planDetection(state.text);
      var p = runPlan(state.text, plan, merged, false);
      p.router = {
        method: plan.mode,
        selected: plan.selected,
        selected_by: plan.mode === 'auto' ? 'router+confidence' : 'manual',
        reason: plan.reason,
        scores: plan.route.scores,
        candidates: plan.compared,
        fallback: plan.fallback
      };
      var maxRounds = 4;
      if (!p.needs_clarification || stop || state.round >= maxRounds) {
        if (p.needs_clarification) p = runPlan(state.text, plan, merged, true);
        p = await explainFinal(p);
      }
      state.payload = p;
      render(p);
    } catch (e) {
      $('stage').innerHTML = '<div class="card empty">' + esc(e.message || String(e)) + '</div>';
    }
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ------------------------------------------------------------------- wiring
  loadAiSettings().then(renderSettings);
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
