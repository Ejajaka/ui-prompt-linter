/**
 * Optional in-browser LLM detector (bring-your-own-key). Mirrors the grounded
 * extraction + explanation in `engine/src/llm_backend.py`, but calls an
 * OpenAI-compatible endpoint directly from the browser using the key the user
 * stores locally in Settings.
 */

import { loadSettings, type AppSettings } from './settings';
import type { DetectedSpan } from './bertEngine';

const SYSTEM_EXTRACT = `You are a UI prompt analyser. Extract UI elements and their explicitly stated attributes.
Allowed element types: button, navbar, input, card, modal, image, dropdown, sidebar, footer, checkbox.
Constraints:
- Only extract elements that are explicitly mentioned.
- Copy attribute values verbatim from the prompt. Never paraphrase.
- Omit an attribute if it is not stated or is vague (e.g. "some nice colour").
- Do not infer actions from names (a "login button" has no action unless stated).
- Return ONLY valid JSON with this shape:
{"elements":[{"type":"button","text":"exact phrase from the prompt","attributes":{"COLOR":"...","LOCATION":"...","ACTION":"...","LABEL":"..."}}]}`;

const SYSTEM_EXPLAIN = `You explain a deterministic risk score for a UI prompt and give recommendations.
You receive the already-computed score, its components, detected elements, missing details,
unresolved clarification questions, and deterministic suggestions.
Constraints:
- Do not recompute or change the score.
- Do not invent elements, attributes, colours, locations, actions or labels.
- Use placeholders for anything unresolved.
- Do not claim the prompt is complete when the score is above 25.
- Mention any unresolved questions.
Return ONLY valid JSON with this shape:
{"explanation":"...", "recommendations":["..."], "polished_prompt":"..."}`;

const ELEMENT_TYPES = new Set([
  'button', 'navbar', 'input', 'card', 'modal', 'image', 'dropdown', 'sidebar', 'footer', 'checkbox',
]);

// "allowed" attributes per element type (mirrors data/schema.json).
const ELEMENT_ATTRIBUTES: Record<string, string[]> = {
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

export interface LLMSpansResult {
  spans: DetectedSpan[];
  confidence: number;
  meta: Record<string, unknown>;
}

export function isLLMConfigured(settings: AppSettings): boolean {
  return !!(settings.apiKey && settings.baseUrl && settings.model);
}

function stripCodeFences(content: string): string {
  let c = content.trim();
  if (c.startsWith('```')) {
    c = c.replace(/^```[a-zA-Z0-9]*\s*/, '').replace(/\s*```$/, '');
  }
  return c.trim();
}

async function chatJson(system: string, user: string, settingsOverride?: AppSettings): Promise<any> {
  const settings = settingsOverride || loadSettings();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
  };
  if (settings.baseUrl.includes('opencode.ai')) {
    headers['x-opencode-session'] = 'vector';
  }
  const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      ...(settings.baseUrl.includes('opencode.ai') || settings.baseUrl.includes('ollama')
        ? { response_format: { type: 'json_object' } }
        : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM request failed (${res.status}). Check your base URL and API key in Settings.`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  return JSON.parse(stripCodeFences(content));
}

function findValue(
  text: string,
  value: string,
  start = 0,
  end = text.length,
): [number, number] | null {
  const v = value.trim();
  if (!v) return null;
  const idx = text.toLowerCase().indexOf(v.toLowerCase(), start);
  if (idx === -1 || idx + v.length > end) return null;
  return [idx, idx + v.length];
}

/** Run grounded LLM extraction and return spans + grounding confidence. */
export async function extractSpans(text: string, settingsOverride?: AppSettings): Promise<LLMSpansResult> {
  const data = await chatJson(SYSTEM_EXTRACT, JSON.stringify({ prompt: text }), settingsOverride);
  const rawElements: any[] = Array.isArray(data?.elements) ? data.elements : [];
  const spans: DetectedSpan[] = [];
  const usedStarts = new Set<number>();
  let attempted = 0;
  let grounded = 0;

  for (const raw of rawElements) {
    if (!raw || typeof raw !== 'object') continue;
    const type = String(raw.type ?? '').toLowerCase().trim();
    if (!ELEMENT_TYPES.has(type)) continue;

    const surface = String(raw.text || raw.element_text || type).trim().replace(/^["']|["']$/g, '');
    let loc = findValue(text, surface);
    if (!loc) loc = findValue(text, type);
    if (!loc) continue;
    const [charStart, charEnd] = loc;
    if (usedStarts.has(charStart)) continue;
    usedStarts.add(charStart);

    // Clause end = next sentence boundary.
    let clauseEnd = text.length;
    for (const punct of '.!?') {
      const pos = text.indexOf(punct, charEnd);
      if (pos !== -1) clauseEnd = Math.min(clauseEnd, pos);
    }

    spans.push({
      label: 'ELEMENT',
      char_start: charStart,
      char_end: charEnd,
      text: text.slice(charStart, charEnd),
    });

    const rawAttributes = raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : {};
    for (const attribute of ELEMENT_ATTRIBUTES[type] ?? []) {
      const value = String(rawAttributes[attribute] ?? '').trim().replace(/^["']|["']$/g, '');
      if (!value) continue;
      attempted += 1;
      let found = findValue(text, value, charStart, clauseEnd);
      if (!found) found = findValue(text, value, 0, text.length);
      if (!found) continue;
      const [aStart, aEnd] = found;
      grounded += 1;
      spans.push({
        label: attribute,
        char_start: aStart,
        char_end: aEnd,
        text: text.slice(aStart, aEnd),
      });
    }
  }

  const confidence = attempted ? grounded / attempted : 0;
  return {
    spans,
    confidence,
    meta: { grounding_rate: confidence, raw_elements: rawElements.length, kept_elements: usedStarts.size },
  };
}

/** Optional: ask the LLM to explain the deterministic risk and recommend edits. */
export async function explain(
  text: string,
  result: any,
  risk: any,
  unresolved: any[],
): Promise<{ explanation: string; recommendations: string[]; polished_prompt: string } | null> {
  const data = await chatJson(
    SYSTEM_EXPLAIN,
    JSON.stringify({ prompt: text, risk, elements: result?.elements ?? [], unresolved_questions: unresolved }),
  );
  const explanation = String(data?.explanation ?? '').trim();
  if (!explanation) return null;
  if ((risk?.score ?? 0) > 25 && /\b(is|looks|seems)\s+complete\b/.test(explanation.toLowerCase())) {
    return null;
  }
  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations.map((r: any) => String(r).trim()).filter(Boolean)
    : [];
  return {
    explanation,
    recommendations,
    polished_prompt: String(data?.polished_prompt ?? '').trim(),
  };
}
