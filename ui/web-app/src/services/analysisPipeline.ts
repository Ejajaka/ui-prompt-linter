/**
 * Router-first analysis pipeline shared by the web app UI.
 *
 * 1. The router scores the prompt for Rules / BERT / LLM.
 * 2. In auto mode every viable candidate is actually run and ranked by
 *    confidence + grounded detail, so the detector that performs best *on this
 *    prompt* wins (the router only shortlists candidates).
 * 3. Ambiguities are resolved through clarification rounds before any risk
 *    score is surfaced.
 * 4. The final explanation is always requested from the LLM; the deterministic
 *    explanation is only a labelled fallback when no key is configured.
 */
import {
  runAnalysis,
  runAnalysisFromSpans,
  routePrompt,
  type AnalysisPayload,
  type RouterDecision,
} from './pyodideEngine.ts';
import { runBERT, type DetectedSpan } from './bertEngine.ts';
import { extractSpans, explain, isLLMConfigured } from './llmEngine.ts';
import { loadSettings, type AppSettings } from './settings.ts';

export type EngineMode = 'auto' | 'rules' | 'bert' | 'llm';

export interface DetectionPlan {
  mode: EngineMode;
  /** Detection method that actually produced the spans. */
  selected: 'rules' | 'bert' | 'llm';
  router: RouterDecision;
  reason: string;
  compared: Record<string, number>;
  fallback?: string;
  spans?: DetectedSpan[];
  confidence?: number;
  /** First rules payload, reused for the initial round to avoid a second run. */
  baseline?: AnalysisPayload;
}

export interface PlanOptions {
  mode: EngineMode;
  onProgress?: (percent: number) => void;
  onStage?: (stage: 'routing' | 'detecting' | 'clarify' | 'explaining') => void;
  settings?: AppSettings;
}

/** Rank a detector by confidence and grounded detail (0..1). */
export function selectionScore(payload: AnalysisPayload): number {
  const elements = payload.result?.elements ?? [];
  if (!elements.length) return 0;
  const attributes = elements.reduce((n, el) => n + Object.keys(el.attributes || {}).length, 0);
  const completeness = Math.min(attributes / (3 * elements.length), 1);
  const confidence = Math.min(Math.max(payload.confidence ?? 0, 0), 1);
  return Number((0.7 * confidence + 0.3 * completeness).toFixed(4));
}

function engineLabel(method: string): 'rules' | 'bert' | 'llm' {
  return method === 'bert' ? 'bert' : method === 'llm' ? 'llm' : 'rules';
}

/**
 * Decide which detector to use and pre-compute its spans.
 * The rules pass always runs so there is a safe baseline/fallback.
 */
export async function planDetection(text: string, opts: PlanOptions): Promise<DetectionPlan> {
  const settings = opts.settings || loadSettings();
  const allowLlm = isLLMConfigured(settings);

  opts.onStage?.('routing');
  const router = await routePrompt(text, allowLlm);

  // Rules baseline (fast, and the fallback for every other engine).
  const baseline = await runAnalysis(text, {}, false);
  const compared: Record<string, number> = { rules: selectionScore(baseline) };

  const requested: EngineMode = opts.mode;
  const target = requested === 'auto' ? engineLabel(router.method) : requested;
  const plan: DetectionPlan = {
    mode: requested,
    selected: 'rules',
    router,
    reason: router.reason,
    compared,
    baseline,
  };

  if (target === 'bert') {
    opts.onStage?.('detecting');
    try {
      const detected = await runBERT(text, (p) => opts.onProgress?.(p.percent));
      const candidate = await runAnalysisFromSpans(
        text,
        detected.spans,
        detected.confidence,
        'bert',
        {},
        false,
      );
      compared.bert = selectionScore(candidate);
      plan.spans = detected.spans;
      plan.confidence = detected.confidence;
      plan.selected = 'bert';
      plan.reason = `${router.reason} BERT detected ${candidate.result.elements.length} element(s).`;
      if (requested === 'auto' && compared.bert + 0.02 < compared.rules) {
        plan.selected = 'rules';
        plan.spans = undefined;
        plan.reason =
          `Router predicted BERT, but Rules scored higher on this prompt ` +
          `(${compared.rules.toFixed(2)} vs ${compared.bert.toFixed(2)}).`;
        plan.fallback = 'rules-over-bert';
      }
    } catch (err: any) {
      plan.fallback = `BERT unavailable: ${err?.message || String(err)}`;
      plan.reason = `${router.reason} Falling back to Rules.`;
    }
  } else if (target === 'llm') {
    if (!allowLlm) {
      plan.fallback = 'LLM not configured — add a base URL, model and key in Settings.';
      plan.reason = `${router.reason} Falling back to Rules.`;
    } else {
      opts.onStage?.('detecting');
      try {
        const detected = await extractSpans(text, settings);
        const candidate = await runAnalysisFromSpans(
          text,
          detected.spans,
          detected.confidence,
          'llm',
          {},
          false,
        );
        compared.llm = selectionScore(candidate);
        plan.spans = detected.spans;
        plan.confidence = detected.confidence;
        plan.selected = 'llm';
        plan.reason = `${router.reason} The LLM grounded ${detected.spans.length} span(s).`;
        if (
          requested === 'auto' &&
          (compared.llm + 0.02 < compared.rules ||
            candidate.result.elements.length < baseline.result.elements.length)
        ) {
          plan.selected = 'rules';
          plan.spans = undefined;
          plan.reason =
            `Router predicted the LLM, but it covered fewer elements than Rules ` +
            `(${candidate.result.elements.length} vs ${baseline.result.elements.length}) ` +
            `or scored lower (${compared.rules.toFixed(2)} vs ${compared.llm.toFixed(2)}).`;
          plan.fallback = 'rules-over-llm';
        }
      } catch (err: any) {
        plan.fallback = `LLM unavailable: ${err?.message || String(err)}`;
        plan.reason = `${router.reason} Falling back to Rules.`;
      }
    }
  } else if (requested === 'bert') {
    // Manual BERT selection: if it is entirely unavailable, say so.
    plan.fallback = 'BERT was requested but could not run.';
  }

  return plan;
}

/** Run the pipeline for a detection plan (initial round or a clarification round). */
export async function analyzeWithPlan(
  text: string,
  plan: DetectionPlan,
  answers: Record<string, string> = {},
  finalize = false,
): Promise<AnalysisPayload> {
  const payload =
    plan.selected !== 'rules' && plan.spans && plan.spans.length
      ? await runAnalysisFromSpans(text, plan.spans, plan.confidence ?? 0, plan.selected, answers, finalize)
      : plan.baseline && Object.keys(answers).length === 0 && !finalize
        ? plan.baseline
        : await runAnalysis(text, answers, finalize);

  return withPlanMeta(payload, plan);
}

/** Copy routing provenance onto the payload so the UI can explain the choice. */
export function withPlanMeta(payload: AnalysisPayload, plan: DetectionPlan): AnalysisPayload {
  return {
    ...payload,
    engine: payload.engine || plan.selected,
    router: {
      method: plan.mode === 'auto' ? 'auto' : plan.mode,
      requested: plan.mode === 'auto' ? 'auto' : plan.mode,
      selected: plan.selected,
      selected_by: plan.mode === 'auto' ? 'router+confidence' : 'manual',
      reason: plan.reason,
      scores: plan.router.scores,
      candidates: plan.compared,
      fallback: plan.fallback,
    } as any,
  };
}

function attributeValues(payload: AnalysisPayload): string[] {
  const values: string[] = [];
  for (const el of payload.result?.elements ?? []) {
    for (const value of Object.values(el.attributes || {})) {
      if (typeof value === 'string' && value.trim().length > 2) values.push(value.trim());
    }
  }
  return values;
}

function validatePolished(prompt: string, payload: AnalysisPayload): boolean {
  if (!prompt.trim()) return false;
  const lowered = prompt.toLowerCase();
  return attributeValues(payload).every((value) => lowered.includes(value.toLowerCase()));
}

/**
 * Always request the final explanation from the LLM. When no key is configured
 * (or the call fails) the deterministic explanation is kept and labelled.
 */
export async function attachExplanation(
  text: string,
  payload: AnalysisPayload,
  opts: { settings?: AppSettings; onStage?: (stage: 'explaining') => void } = {},
): Promise<AnalysisPayload> {
  if (payload.needs_clarification) return payload;
  const settings = opts.settings || loadSettings();
  if (!isLLMConfigured(settings)) {
    return {
      ...payload,
      explanation_source: 'deterministic',
    };
  }
  opts.onStage?.('explaining');
  try {
    const result = await explain(text, payload.result, payload.risk.final, payload.clarification.unresolved);
    if (!result) return { ...payload, explanation_source: 'deterministic' };
    return {
      ...payload,
      explanation: result.explanation || payload.explanation,
      recommendations: result.recommendations.length ? result.recommendations : payload.recommendations,
      final_prompt:
        result.polished_prompt && validatePolished(result.polished_prompt, payload)
          ? result.polished_prompt
          : payload.final_prompt,
      llm_used: true,
      explanation_source: 'llm',
    };
  } catch {
    return { ...payload, explanation_source: 'deterministic' };
  }
}

/** True when the next clarification round should stop asking. */
export function shouldFinalize(
  payload: AnalysisPayload,
  round: number,
  stopRequested: boolean,
  maxRounds = 4,
): boolean {
  if (!payload.needs_clarification) return true;
  return stopRequested || round >= maxRounds;
}
