/**
 * Shared browser AI engine for the Prompt Linter extension and Android WebView.
 *
 * - BERT: fine-tuned DistilBERT token classifier, loaded once from the public
 *   GitHub Pages copy and cached by the browser.
 * - API: grounded extraction through an OpenAI-compatible endpoint.
 *
 * Both return character-offset spans. The existing rules engine then performs
 * linking, checking, clarification and scoring, so results stay comparable.
 */
import {
  AutoModelForTokenClassification,
  AutoTokenizer,
  Tensor,
  env,
} from './transformers.web.min.js';

const REMOTE_HOST = 'https://ejajaka.github.io/ui-prompt-linter';
const MODEL_ID = 'models/bert_tagger';
const MAX_LENGTH = 128;
const TOKEN_RE = /[\w]+(?:'[\w]+)?|[^\w\s]/g;
const ID2LABEL = [
  'O', 'B-ELEMENT', 'I-ELEMENT', 'B-COLOR', 'I-COLOR', 'B-LOCATION',
  'I-LOCATION', 'B-ACTION', 'I-ACTION', 'B-LABEL', 'I-LABEL',
];

const ELEMENT_TYPES = new Set([
  'button', 'navbar', 'input', 'card', 'modal', 'image', 'dropdown', 'sidebar', 'footer', 'checkbox',
]);
const ELEMENT_ATTRIBUTES = {
  button: ['COLOR', 'LOCATION', 'LABEL', 'ACTION'],
  navbar: ['COLOR', 'LOCATION', 'LABEL'],
  input: ['LABEL', 'LOCATION', 'COLOR'],
  card: ['COLOR', 'LOCATION', 'LABEL'],
  modal: ['ACTION', 'LABEL', 'COLOR'],
  image: ['LOCATION', 'LABEL'],
  dropdown: ['LABEL', 'LOCATION', 'ACTION'],
  sidebar: ['LOCATION', 'COLOR', 'LABEL'],
  footer: ['COLOR', 'LABEL'],
  checkbox: ['LABEL', 'LOCATION', 'COLOR'],
};

const SYSTEM_EXTRACT = `You are a UI prompt analyser. Extract UI elements and their explicitly stated attributes.
Allowed element types: button, navbar, input, card, modal, image, dropdown, sidebar, footer, checkbox.
Rules:
- Only extract elements that are explicitly mentioned.
- Copy attribute values verbatim from the prompt. Never paraphrase.
- Omit an attribute if it is not stated or is vague (e.g. "some nice colour").
- Do not infer actions from names (a "login button" has no action unless stated).
- Return ONLY valid JSON with this shape:
{"elements":[{"type":"button","text":"exact phrase from the prompt","attributes":{"COLOR":"...","LOCATION":"...","ACTION":"...","LABEL":"..."}}]}`;

let modelPromise = null;

function softmax(values) {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((v) => v / sum);
}

function argmax(values) {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}

function tokenizeWords(text) {
  const words = [];
  TOKEN_RE.lastIndex = 0;
  let m;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    words.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return words;
}

function loadBert(onProgress) {
  if (modelPromise) return modelPromise;
  modelPromise = (async () => {
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteHost = REMOTE_HOST;
    env.remotePathTemplate = '{model}/';
    try {
      env.backends.onnx.wasm.wasmPaths =
        'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.0-dev.20260914-8d85527a0/dist/';
    } catch (ignored) {}
    const report = (p) => {
      if (!onProgress || p?.status !== 'progress' || !p.total) return;
      onProgress({ percent: Math.round((p.loaded / p.total) * 100), file: String(p.file ?? '') });
    };
    const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
    const model = await AutoModelForTokenClassification.from_pretrained(MODEL_ID, {
      dtype: 'q8',
      progress_callback: report,
    });
    return {
      tokenizer,
      model,
      clsId: tokenizer.convert_tokens_to_ids('[CLS]'),
      sepId: tokenizer.convert_tokens_to_ids('[SEP]'),
    };
  })();
  return modelPromise;
}

function tagsToSpans(text, words, tags) {
  const spans = [];
  let i = 0;
  while (i < tags.length) {
    if (tags[i] === 'O') { i++; continue; }
    const label = tags[i].replace(/^[BI]-/, '');
    let j = i;
    while (j < tags.length && tags[j] !== 'O' && tags[j].replace(/^[BI]-/, '') === label) j++;
    const start = words[i].start;
    const end = words[j - 1].end;
    spans.push({ label, char_start: start, char_end: end, text: text.slice(start, end) });
    i = j;
  }
  return spans;
}

export async function runBert(text, onProgress) {
  const words = tokenizeWords(text);
  if (!words.length) return { spans: [], confidence: 0 };
  const { tokenizer, model, clsId, sepId } = await loadBert(onProgress);
  const inputIds = [clsId];
  const wordIds = [null];
  for (let wi = 0; wi < words.length; wi++) {
    const subs = tokenizer.tokenize(words[wi].text, { add_special_tokens: false });
    const ids = tokenizer.convert_tokens_to_ids(subs);
    for (const id of ids) { inputIds.push(id); wordIds.push(wi); }
  }
  inputIds.push(sepId);
  wordIds.push(null);
  if (inputIds.length > MAX_LENGTH) {
    inputIds.length = MAX_LENGTH;
    wordIds.length = MAX_LENGTH;
    inputIds[MAX_LENGTH - 1] = sepId;
    wordIds[MAX_LENGTH - 1] = null;
  }
  const seqLen = inputIds.length;
  const idsTensor = new Tensor('int64', BigInt64Array.from(inputIds.map((n) => BigInt(n))), [1, seqLen]);
  const maskTensor = new Tensor('int64', BigInt64Array.from(inputIds.map(() => 1n)), [1, seqLen]);
  const output = await model({ input_ids: idsTensor, attention_mask: maskTensor });
  const logits = output.logits;
  const data = logits.data;
  const nClasses = logits.dims[2] ?? 11;
  const tags = words.map(() => 'O');
  const seen = new Set();
  const probs = [];
  for (let pos = 0; pos < seqLen; pos++) {
    const wi = wordIds[pos];
    if (wi === null || wi === undefined || seen.has(wi)) continue;
    seen.add(wi);
    const start = pos * nClasses;
    const values = Array.from(data.slice(start, start + nClasses));
    const best = argmax(values);
    tags[wi] = ID2LABEL[best] ?? 'O';
    if (tags[wi] !== 'O') probs.push(softmax(values)[best]);
  }
  const confidence = probs.length ? probs.reduce((a, b) => a + b, 0) / probs.length : 0;
  return { spans: tagsToSpans(text, words, tags), confidence };
}

function stripCodeFences(content) {
  let c = String(content || '').trim();
  if (c.startsWith('```')) c = c.replace(/^```[a-zA-Z0-9]*\s*/, '').replace(/\s*```$/, '');
  return c.trim();
}

function findValue(text, value, start = 0, end = text.length) {
  const v = String(value || '').trim();
  if (!v) return null;
  const idx = text.toLowerCase().indexOf(v.toLowerCase(), start);
  if (idx === -1 || idx + v.length > end) return null;
  return [idx, idx + v.length];
}

export async function extractSpansApi(text, settings) {
  const base = String(settings.baseUrl || '').replace(/\/+$/, '');
  const key = String(settings.apiKey || '');
  const model = String(settings.model || '');
  if (!base || !key || !model) throw new Error('Add a base URL, model and API key in Settings.');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (base.includes('opencode.ai')) headers['x-opencode-session'] = 'ui-prompt-linter';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_EXTRACT },
        { role: 'user', content: JSON.stringify({ prompt: text }) },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status}). Check the endpoint and key.`);
  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content ?? '';
  let data;
  try { data = JSON.parse(stripCodeFences(content)); } catch { throw new Error('LLM returned invalid JSON.'); }
  const rawElements = Array.isArray(data?.elements) ? data.elements : [];
  const spans = [];
  const usedStarts = new Set();
  let attempted = 0;
  let grounded = 0;
  for (const raw of rawElements) {
    if (!raw || typeof raw !== 'object') continue;
    const type = String(raw.type || '').toLowerCase().trim();
    if (!ELEMENT_TYPES.has(type)) continue;
    const surface = String(raw.text || raw.element_text || type).trim().replace(/^["']|["']$/g, '');
    const loc = findValue(text, surface) || findValue(text, type);
    if (!loc) continue;
    const [charStart, charEnd] = loc;
    if (usedStarts.has(charStart)) continue;
    usedStarts.add(charStart);
    let clauseEnd = text.length;
    for (const punct of '.!?') {
      const pos = text.indexOf(punct, charEnd);
      if (pos !== -1) clauseEnd = Math.min(clauseEnd, pos);
    }
    spans.push({ label: 'ELEMENT', char_start: charStart, char_end: charEnd, text: text.slice(charStart, charEnd) });
    const attrs = raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : {};
    for (const attribute of ELEMENT_ATTRIBUTES[type] || []) {
      const value = String(attrs[attribute] || '').trim().replace(/^["']|["']$/g, '');
      if (!value) continue;
      attempted += 1;
      const found = findValue(text, value, charStart, clauseEnd) || findValue(text, value);
      if (!found) continue;
      grounded += 1;
      spans.push({ label: attribute, char_start: found[0], char_end: found[1], text: text.slice(found[0], found[1]) });
    }
  }
  const confidence = attempted ? grounded / attempted : 0;
  return {
    spans,
    confidence,
    meta: { grounding_rate: confidence, raw_elements: rawElements.length, kept_elements: usedStarts.size },
  };
}

const SYSTEM_EXPLAIN = `You explain a deterministic risk score for a UI prompt and give recommendations.
You receive the already-computed score, its components, detected elements, missing details,
unresolved clarification questions, and deterministic suggestions.
Rules:
- Do not recompute or change the score.
- Do not invent elements, attributes, colours, locations, actions or labels.
- Use placeholders for anything unresolved.
- Do not claim the prompt is complete when the score is above 25.
- Mention any unresolved questions.
Return ONLY valid JSON with this shape:
{"explanation":"...", "recommendations":["..."], "polished_prompt":"..."}`;

function isConfigured(settings) {
  return !!(settings && settings.baseUrl && settings.model && settings.apiKey);
}

async function explainResult(text, result, risk, unresolved, settings) {
  if (!isConfigured(settings)) throw new Error('Add a base URL, model and API key in Settings.');
  const base = String(settings.baseUrl || '').replace(/\/+$/, '');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` };
  if (base.includes('opencode.ai')) headers['x-opencode-session'] = 'ui-prompt-linter';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: SYSTEM_EXPLAIN },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: text,
            risk,
            elements: (result && result.elements) || [],
            unresolved_questions: unresolved || [],
          }),
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`LLM request failed (${res.status}).`);
  const body = await res.json();
  const content = body?.choices?.[0]?.message?.content ?? '';
  let data;
  try { data = JSON.parse(stripCodeFences(content)); } catch { throw new Error('LLM returned invalid JSON.'); }
  const explanation = String(data?.explanation || '').trim();
  if (!explanation) throw new Error('The LLM returned an empty explanation.');
  if ((risk?.score || 0) > 25 && /\b(is|looks|seems)\s+complete\b/i.test(explanation)) {
    throw new Error('The LLM explanation contradicted the score.');
  }
  return {
    explanation,
    recommendations: Array.isArray(data?.recommendations)
      ? data.recommendations.map((r) => String(r).trim()).filter(Boolean)
      : [],
    polished_prompt: String(data?.polished_prompt || '').trim(),
  };
}

const AI = { runBert, extractSpansApi, explainResult, isConfigured };
if (typeof window !== 'undefined') window.PromptLinterAI = AI;
export default AI;
