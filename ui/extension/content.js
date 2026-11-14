/* Prompt Linter — floating assistant for AI chat sites.
 *
 * Injects a small "PL" button in the bottom-right corner of ChatGPT, Claude and
 * Gemini. Clicking it reads the prompt currently in the chat composer, runs the
 * same offline Rules engine as the popup, and shows the completeness score,
 * missing details, clarification questions and a validated rewrite to copy.
 */
(function () {
  'use strict';

  if (window.__promptLinterInjected) return;
  window.__promptLinterInjected = true;

  var engine = window.PromptLinterEngine;
  if (!engine) return;

  var LEVEL_COLORS = {
    Critical: '#B94D42',
    High: '#C05621',
    Medium: '#9E7D1B',
    Low: '#2E6F40'
  };
  var BAR_COLORS = {
    completeness: '#49686C',
    vagueness: '#D1B653',
    detection: '#5A8090',
    unresolved: '#C05621'
  };
  var BAR_LABELS = {
    completeness: 'Missing details',
    vagueness: 'Vague details',
    detection: 'Detector uncertainty',
    unresolved: 'Unresolved questions'
  };

  var state = { text: '', answers: {}, round: 1, payload: null };
  var panel = null;
  var resultsEl = null;
  var lastComposer = null;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cap(value) {
    value = String(value || '');
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function rgba(hex, alpha) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  function isComposer(el) {
    if (!el || !el.tagName) return false;
    return el.tagName === 'TEXTAREA' ||
      (el.getAttribute && el.getAttribute('contenteditable') === 'true');
  }

  function visible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && r.bottom > 0 && r.top < window.innerHeight;
  }

  function readComposer(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA') return el.value || '';
    return el.innerText || el.textContent || '';
  }

  // Remember the last composer the user focused so clicking the floating button
  // does not lose track of the prompt they were writing.
  document.addEventListener('focusin', function (event) {
    if (isComposer(event.target)) lastComposer = event.target;
  }, true);

  function readPrompt() {
    if (lastComposer && document.documentElement.contains(lastComposer) && visible(lastComposer)) {
      return readComposer(lastComposer);
    }
    if (isComposer(document.activeElement)) return readComposer(document.activeElement);
    var boxes = Array.prototype.slice
      .call(document.querySelectorAll("textarea, [contenteditable='true']"))
      .filter(visible)
      .sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return rb.width * rb.height - ra.width * ra.height;
      });
    return readComposer(boxes[0]);
  }

  var LOGO =
    '<svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">' +
    '<g fill="#FAD237">' +
    '<rect x="9.23" y="13.86" width="5.21" height="20.28" rx="2.6"/>' +
    '<circle cx="17.84" cy="20.56" r="6.7"/>' +
    '<rect x="25.68" y="13.86" width="5.55" height="20.25" rx="2.78"/>' +
    '<rect x="25.68" y="28.44" width="13.64" height="5.67" rx="2.84"/>' +
    '</g>' +
    '<rect x="14.43" y="18.26" width="4.78" height="4.48" rx="1.61" fill="#185345"/>' +
    '</svg>';

  var PANEL_LOGO =
    '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">' +
    '<rect width="48" height="48" rx="10.1" fill="#185345"/>' +
    '<g fill="#FAD237">' +
    '<rect x="9.23" y="13.86" width="5.21" height="20.28" rx="2.6"/>' +
    '<circle cx="17.84" cy="20.56" r="6.7"/>' +
    '<rect x="25.68" y="13.86" width="5.55" height="20.25" rx="2.78"/>' +
    '<rect x="25.68" y="28.44" width="13.64" height="5.67" rx="2.84"/>' +
    '</g>' +
    '<rect x="14.43" y="18.26" width="4.78" height="4.48" rx="1.61" fill="#185345"/>' +
    '</svg>';

  function buildPanel() {
    var el = document.createElement('div');
    el.id = 'pl-panel';
    el.innerHTML =
      '<div class="pl-head">' +
      '<div class="pl-brand"><span class="pl-mark">' + PANEL_LOGO + '</span>' +
      '<span><b>Prompt Linter</b><small>UI/UX prompt review · rules engine</small></span></div>' +
      '<button class="pl-close" id="pl-close" type="button" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="pl-body">' +
      '<div id="pl-empty" class="pl-hint">Type your UI prompt in the chat box, then review it here.</div>' +
      '<div id="pl-results"></div>' +
      '<div class="pl-actions"><button class="pl-btn primary" id="pl-analyze" type="button">Review composer text</button></div>' +
      '<div class="pl-foot">Offline rules engine · <a href="https://ejajaka.github.io/ui-prompt-linter/" target="_blank" rel="noreferrer">Full app →</a></div>' +
      '</div>';
    document.body.appendChild(el);
    resultsEl = el.querySelector('#pl-results');
    el.querySelector('#pl-close').addEventListener('click', function () {
      el.classList.remove('open');
    });
    el.querySelector('#pl-analyze').addEventListener('click', analyze);
    return el;
  }

  function setBusy(message) {
    panel.querySelector('#pl-empty').classList.add('hidden');
    resultsEl.innerHTML = '<div class="pl-card pl-hint">' + esc(message) + '</div>';
  }

  function showMessage(message) {
    resultsEl.innerHTML = '<div class="pl-card pl-hint">' + esc(message) + '</div>';
  }

  function renderRisk(p) {
    var final = p.risk.final;
    var color = LEVEL_COLORS[final.level] || LEVEL_COLORS.Low;
    var components = final.components || {};
    var bars = ['completeness', 'vagueness', 'detection', 'unresolved'].map(function (key) {
      var value = Math.max(0, Math.min(100, Math.round((components[key] || 0) * 100)));
      return '<div class="pl-bar-row"><div class="pl-bar-label"><span>' + BAR_LABELS[key] +
        '</span><span>' + value + '%</span></div>' +
        '<div class="pl-bar"><i style="width:' + value + '%;background:' + BAR_COLORS[key] + '"></i></div></div>';
    }).join('');
    return '<div class="pl-card">' +
      '<div class="pl-row"><span class="pl-section">Evaluation summary</span>' +
      '<span class="pl-badge" style="background:' + rgba(color, 0.12) + ';border-color:' + rgba(color, 0.45) +
      ';color:' + color + '">● ' + esc(final.level) + ' risk</span></div>' +
      '<div class="pl-score-row">' +
      '<div class="pl-score" style="color:' + color + '"><b>' + Math.round(final.score) + '</b><span>/100</span></div>' +
      '<div class="pl-bars">' + bars + '</div></div>' +
      '<div class="pl-expl">' + esc(p.explanation || final.explanation || '') + '</div>' +
      '</div>';
  }

  function renderElements(p) {
    var elements = p.result.elements || [];
    if (!elements.length) {
      return '<div class="pl-card pl-hint">No supported UI elements detected. Mention a button, navbar, input, card, modal, image, dropdown, sidebar, footer or checkbox.</div>';
    }
    var cards = elements.map(function (el) {
      var complete = el.status === 'complete';
      var chips = Object.keys(el.attributes || {}).map(function (key) {
        return '<span class="pl-chip"><b>' + esc(key) + '</b>: ' + esc(el.attributes[key]) + '</span>';
      }).join('') || '<span class="pl-chip">No attributes detected</span>';
      var messages = (el.messages || []).map(function (m) {
        return '<li>' + esc(m) + '</li>';
      }).join('');
      return '<div class="pl-el">' +
        '<div class="pl-el-head"><div><div class="pl-el-title">' + (complete ? '✓' : '⚠') + ' ' +
        esc(cap(el.type)) + ' #' + el.id + '</div>' +
        '<div class="pl-el-text">“' + esc(el.text) + '”</div></div>' +
        '<span class="pl-status ' + (complete ? 'ok' : 'warn') + '">' +
        (complete ? 'Complete' : 'Missing ' + (el.missing || []).length) + '</span></div>' +
        '<div class="pl-chips">' + chips + '</div>' +
        (messages ? '<ul class="pl-missing">' + messages + '</ul>' : '') +
        '</div>';
    }).join('');
    return '<div class="pl-section pl-section-pad">Detected elements (' + elements.length + ')</div>' + cards;
  }

  function renderQuestions(p) {
    var questions = p.clarification.questions || [];
    var fields = questions.map(function (q) {
      var examples = (q.examples || []).length
        ? '<div class="pl-ex">Examples: ' + esc(q.examples.join(', ')) + '</div>' : '';
      var input;
      if (q.options && q.options.length) {
        input = '<select data-qid="' + esc(q.id) + '"><option value="">Choose…</option>' +
          q.options.map(function (o) {
            return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
          }).join('') +
          '<option value="unknown">I don\'t know / placeholder</option></select>';
      } else {
        input = '<input type="text" data-qid="' + esc(q.id) + '" placeholder="' +
          esc((q.examples || []).join(', ')) + '">';
      }
      return '<div class="pl-q"><div class="pl-q-title">' + esc(q.prompt) + '</div>' + examples + input + '</div>';
    }).join('');
    return '<div class="pl-card">' +
      '<div class="pl-row"><span class="pl-section">A few details are still unclear</span>' +
      '<span class="pl-badge neutral">Round ' + state.round + '</span></div>' +
      '<div class="pl-muted">The analyser re-runs after each answer. Score is withheld until the prompt is unambiguous.</div>' +
      fields +
      '<div class="pl-actions"><button class="pl-btn primary" id="pl-submit" type="button">Submit answers</button>' +
      '<button class="pl-btn ghost" id="pl-placeholders" type="button">Use placeholders</button></div>' +
      '</div>';
  }

  function renderFinal(p) {
    if (!p.final_prompt) {
      return '<div class="pl-card pl-hint">' + esc((p.result.summary && p.result.summary.message) || 'Analysis complete.') + '</div>';
    }
    var recs = (p.recommendations || []).length
      ? '<div class="pl-section">Recommendations</div><ul class="pl-recs">' +
        p.recommendations.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
      : '';
    return '<div class="pl-card">' +
      '<div class="pl-row"><span class="pl-section">Validated prompt</span>' +
      '<span class="pl-badge neutral">Copy-ready</span></div>' +
      '<pre class="pl-final">' + esc(p.final_prompt) + '</pre>' +
      '<div class="pl-actions"><button class="pl-btn primary" id="pl-copy" type="button">Copy prompt</button></div>' +
      recs + '</div>';
  }

  function legacyCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (err) { /* ignore */ }
    document.body.removeChild(area);
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        legacyCopy(text);
        done();
      });
      return;
    }
    legacyCopy(text);
    done();
  }

  function wire() {
    var submit = resultsEl.querySelector('#pl-submit');
    if (submit) submit.addEventListener('click', function () { submitAnswers(false); });
    var placeholders = resultsEl.querySelector('#pl-placeholders');
    if (placeholders) placeholders.addEventListener('click', function () { submitAnswers(true); });
    var copy = resultsEl.querySelector('#pl-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var text = (state.payload && state.payload.final_prompt) || '';
        if (!text) return;
        copyText(text, function () {
          copy.textContent = 'Copied!';
          setTimeout(function () { copy.textContent = 'Copy prompt'; }, 1200);
        });
      });
    }
  }

  function render() {
    var p = state.payload;
    if (!p) return;
    if (p.error) {
      showMessage('The prompt could not be analysed: ' + p.error);
      return;
    }
    var html = '';
    if (p.needs_clarification) {
      html += renderQuestions(p);
      html += renderElements(p);
    } else {
      html += renderRisk(p);
      html += renderElements(p);
      html += renderFinal(p);
    }
    resultsEl.innerHTML = html;
    wire();
    var again = panel.querySelector('#pl-analyze');
    if (again) again.textContent = 'Re-check composer';
  }

  function analyze() {
    var text = readPrompt().trim();
    if (!text) {
      showMessage('Could not read the composer. Type your UI prompt in the chat box first, then review it.');
      return;
    }
    state.text = text;
    state.answers = {};
    state.round = 1;
    state.payload = null;
    setBusy('Reviewing the prompt for missing details…');
    window.setTimeout(function () {
      try {
        state.payload = engine.analyze(text, {}, false);
        render();
      } catch (err) {
        showMessage('Analysis failed: ' + ((err && err.message) || String(err)));
      }
    }, 30);
  }

  function collectAnswers() {
    var values = {};
    Array.prototype.forEach.call(resultsEl.querySelectorAll('[data-qid]'), function (field) {
      var id = field.getAttribute('data-qid');
      var value = String(field.value || '').trim();
      values[id] = value || 'unknown';
    });
    return values;
  }

  function submitAnswers(stop) {
    var values = collectAnswers();
    var allUnknown = Object.keys(values).every(function (key) { return values[key] === 'unknown'; });
    var merged = {};
    Object.keys(state.answers).forEach(function (key) { merged[key] = state.answers[key]; });
    Object.keys(values).forEach(function (key) { merged[key] = values[key]; });
    state.answers = merged;
    state.round += 1;
    try {
      var p = engine.analyze(state.text, merged, false);
      if (p.needs_clarification && !stop && !allUnknown && state.round < 4) {
        state.payload = p;
        render();
        return;
      }
      if (p.needs_clarification) p = engine.analyze(state.text, merged, true);
      state.payload = p;
      render();
    } catch (err) {
      showMessage('Analysis failed: ' + ((err && err.message) || String(err)));
    }
  }

  var fab = document.createElement('button');
  fab.id = 'pl-fab';
  fab.type = 'button';
  fab.title = 'Prompt Linter: review this UI prompt';
  fab.setAttribute('aria-label', 'Open Prompt Linter');
  fab.innerHTML = LOGO;
  fab.addEventListener('click', function () {
    if (!panel) panel = buildPanel();
    var opening = !panel.classList.contains('open');
    panel.classList.toggle('open');
    if (opening) analyze();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && panel) panel.classList.remove('open');
  });
  document.body.appendChild(fab);
})();
