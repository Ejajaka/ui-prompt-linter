/* Vector — analysis runner for the floating assistant.
 *
 * Runs the same router-first pipeline as the popup, web app and Android app:
 *   auto router -> Rules / BERT / LLM -> clarification rounds -> LLM explanation.
 *
 * The runner lives in an extension-origin iframe so the host page's CSP cannot
 * block the BERT model download or the optional LLM request.
 */
(function () {
  'use strict';

  var engine = window.VectorEngine;
  if (!engine) return;

  var DEFAULTS = Object.assign({
    engine: 'auto',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'openai/gpt-oss-120b',
    apiKey: '',
    configVersion: 2
  }, window.VECTOR_AI_DEFAULTS || {});
  DEFAULTS.configVersion = 2;
  if (DEFAULTS.apiKey === '__VECTOR_API_KEY__') DEFAULTS.apiKey = '';

  var planCache = null;

  function post(message) {
    window.parent.postMessage(message, '*');
  }

  function progress(id, message) {
    if (id) post({ type: 'vector:progress', id: id, message: message });
  }

  function aiReady() {
    return new Promise(function (resolve, reject) {
      if (window.VectorAI) return resolve(window.VectorAI);
      var started = Date.now();
      var timer = setInterval(function () {
        if (window.VectorAI) { clearInterval(timer); resolve(window.VectorAI); }
        else if (Date.now() - started > 20000) {
          clearInterval(timer);
          reject(new Error('AI module failed to load.'));
        }
      }, 100);
    });
  }

  function allowLlm(settings) {
    return !!(settings && settings.baseUrl && settings.model && settings.apiKey);
  }

  function loadSettings() {
    return new Promise(function (resolve) {
      var finish = function (saved) {
        saved = saved || {};
        // v1 stored a manual engine choice; migrate to the router default.
        if (saved.configVersion !== 2) saved.engine = DEFAULTS.engine;
        resolve(Object.assign({}, DEFAULTS, saved, { configVersion: 2 }));
      };
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['promptLinterAI'], function (data) {
          finish((data && data.promptLinterAI) || {});
        });
      } else {
        finish({});
      }
    });
  }

  // Router-first detection: score the prompt, run the winning detector, then
  // verify the router's prediction against the actual confidence + detail.
  function planDetection(text, settings, id) {
    var engineName = settings.engine || 'auto';
    if (planCache && planCache.text === text && planCache.engine === engineName) {
      return Promise.resolve(planCache.plan);
    }

    var route = engine.routePrompt(text, allowLlm(settings));
    var baseline = engine.analyze(text, {}, false);
    var compared = { rules: engine.selectionScore(baseline) };
    var target = engineName === 'auto' ? route.method : (engineName === 'api' ? 'llm' : engineName);
    var plan = {
      mode: engineName,
      selected: 'rules',
      route: route,
      compared: compared,
      reason: route.reason,
      fallback: null,
      baseline: baseline
    };
    var prepare = Promise.resolve();

    if (target === 'bert') {
      prepare = aiReady().then(function (ai) {
        return ai.runBert(text, function (p) {
          progress(id, 'Downloading BERT ' + p.percent + '% (one time)');
        }).then(function (bert) {
          var candidate = engine.analyzeFromSpans(text, bert.spans, bert.confidence, 'bert', {}, false);
          compared.bert = engine.selectionScore(candidate);
          plan.spans = bert.spans;
          plan.confidence = bert.confidence;
          plan.selected = 'bert';
          plan.reason = route.reason + ' BERT detected ' + candidate.result.elements.length + ' element(s).';
          if (engineName === 'auto' && compared.bert + 0.02 < compared.rules) {
            plan.selected = 'rules';
            plan.spans = null;
            plan.fallback = 'rules-over-bert';
            plan.reason = 'Router predicted BERT, but Rules scored higher (' +
              compared.rules.toFixed(2) + ' vs ' + compared.bert.toFixed(2) + ').';
          }
        });
      }).catch(function (err) {
        plan.fallback = 'BERT unavailable: ' + (err.message || String(err));
        plan.reason = route.reason + ' Falling back to Rules.';
      });
    } else if (target === 'llm') {
      if (!allowLlm(settings)) {
        plan.fallback = 'LLM not configured — add a key in the engine settings.';
        plan.reason = route.reason + ' Falling back to Rules.';
      } else {
        prepare = aiReady().then(function (ai) {
          progress(id, 'Running LLM extraction…');
          return ai.extractSpansApi(text, settings).then(function (llm) {
            var candidate = engine.analyzeFromSpans(
              text, llm.spans, llm.confidence, 'llm', {}, false, llm.meta || null
            );
            compared.llm = engine.selectionScore(candidate);
            plan.spans = llm.spans;
            plan.confidence = llm.confidence;
            plan.selected = 'llm';
            plan.meta = llm.meta || null;
            plan.reason = route.reason + ' The LLM grounded ' + llm.spans.length + ' span(s).';
            if (engineName === 'auto' && (
              compared.llm + 0.02 < compared.rules ||
              candidate.result.elements.length < baseline.result.elements.length
            )) {
              plan.selected = 'rules';
              plan.spans = null;
              plan.fallback = 'rules-over-llm';
              plan.reason = 'Router predicted the LLM, but it covered fewer elements than Rules (' +
                candidate.result.elements.length + ' vs ' + baseline.result.elements.length +
                ') or scored lower (' + compared.rules.toFixed(2) + ' vs ' + compared.llm.toFixed(2) + ').';
            }
          });
        }).catch(function (err) {
          plan.fallback = 'LLM unavailable: ' + (err.message || String(err));
          plan.reason = route.reason + ' Falling back to Rules.';
        });
      }
    }

    return prepare.then(function () {
      planCache = { text: text, engine: engineName, plan: plan };
      return plan;
    });
  }

  function runPlan(text, plan, answers, finalize) {
    if (plan.selected !== 'rules' && plan.spans && plan.spans.length) {
      return engine.analyzeFromSpans(
        text, plan.spans, plan.confidence, plan.selected, answers || {}, !!finalize, plan.meta || null
      );
    }
    if (!Object.keys(answers || {}).length && !finalize && plan.baseline) return plan.baseline;
    return engine.analyze(text, answers || {}, !!finalize);
  }

  function attachRouter(payload, plan) {
    payload.router = {
      method: plan.mode,
      selected: plan.selected,
      selected_by: plan.mode === 'auto' ? 'router+confidence' : 'manual',
      reason: plan.reason,
      scores: plan.route.scores,
      candidates: plan.compared,
      fallback: plan.fallback
    };
    return payload;
  }

  // The final explanation is always requested from the LLM. If no key is
  // configured (or the call fails) the deterministic text is labelled instead.
  function explainFinal(payload, text, settings, id) {
    if (!allowLlm(settings)) {
      payload.explanation_source = 'deterministic';
      return Promise.resolve(payload);
    }
    return aiReady().then(function (ai) {
      progress(id, 'Writing the LLM explanation…');
      return ai.explainResult(
        text, payload.result, payload.risk.final, payload.clarification.unresolved, settings
      ).then(function (out) {
        payload.explanation = out.explanation || payload.explanation;
        if (out.recommendations && out.recommendations.length) payload.recommendations = out.recommendations;
        payload.llm_used = true;
        payload.explanation_source = 'llm';
        return payload;
      });
    }).catch(function () {
      payload.explanation_source = 'deterministic';
      return payload;
    });
  }

  function analyze(text, answers, finalize, id) {
    return loadSettings().then(function (settings) {
      return planDetection(text, settings, id).then(function (plan) {
        var payload = attachRouter(runPlan(text, plan, answers, finalize), plan);
        payload.explanation_source = payload.explanation_source || 'deterministic';
        if (payload.needs_clarification) return payload;
        return explainFinal(payload, text, settings, id);
      });
    });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window.parent) return;
    var data = event.data || {};
    if (data.type !== 'vector:analyze' || !data.id) return;
    analyze(String(data.text || ''), data.answers || {}, !!data.finalize, data.id).then(function (payload) {
      post({ type: 'vector:result', id: data.id, payload: payload });
    }, function (err) {
      post({ type: 'vector:result', id: data.id, error: String((err && err.message) || err) });
    });
  });
})();
