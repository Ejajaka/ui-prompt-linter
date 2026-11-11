import type {
  AnalysisResult,
  SecurityFinding,
  FindingSeverity,
  RiskLevel
} from '../types/analysis.ts';
import { loadSettings, deepScanAvailable } from './settings.ts';

/**
 * Adapter over the shared Vector rule engine (engine/src), exposed on
 * globalThis.VectorAnalyzer by the classic scripts in index.html, plus the
 * optional deep scan (globalThis.VectorLLM). Same engine, same merge policy as
 * the extension and mobile clients - there is no mock or sample data here.
 */
export class VectorEngineAnalyzer {
  isAvailable(): boolean {
    return typeof globalThis !== 'undefined' && !!(globalThis as any).VectorAnalyzer;
  }

  /** Raw rule-engine report (not mapped). Throws for empty/out-of-scope input. */
  analyzeReport(prompt: string): any {
    const engine = (globalThis as any).VectorAnalyzer;
    if (!engine) throw new Error('The Vector rule engine failed to load.');
    const trimmed = prompt.trim();
    if (!trimmed) throw new Error('Prompt cannot be empty.');
    const report = engine.analyze(trimmed, { strictMode: false });
    if (report.outOfScope) {
      throw new Error(
        (report.feedback && report.feedback[0]) ||
          'This does not look like an AWS infrastructure prompt.'
      );
    }
    return report;
  }

  /** Map an existing engine report to the UI model. */
  resultFromReport(report: any): AnalysisResult {
    return toAnalysisResult(report);
  }

  async analyze(prompt: string): Promise<AnalysisResult> {
    return this.resultFromReport(this.analyzeReport(prompt));
  }

  isNeuralAvailable(): boolean {
    return typeof globalThis !== 'undefined' && !!(globalThis as any).VectorNeural;
  }

  /**
   * Neural-first analysis. There is no keyword-rule fallback: if the neural
   * engine or its AI helper is unavailable, this throws and the caller gates.
   */
  async analyzeNeural(prompt: string, settings: any): Promise<AnalysisResult> {
    const neural = (globalThis as any).VectorNeural;
    if (!neural || typeof neural.analyze !== 'function') {
      throw new Error('The neural engine failed to load.');
    }
    const trimmed = prompt.trim();
    if (!trimmed) throw new Error('Prompt cannot be empty.');
    const report = await neural.analyze(trimmed, settings);
    if (report.unavailable) {
      throw new Error(
        'Neural model unavailable. Add an API key in Settings, or use a build with a trained checkpoint.'
      );
    }
    if (report.outOfScope) {
      throw new Error(
        (report.feedback && report.feedback[0]) ||
          'This does not look like an AWS infrastructure prompt.'
      );
    }
    return toAnalysisResult(report);
  }

  /** True when an on-device model or a hosted API key is configured. */
  isDeepScanAvailable(): boolean {
    const llm = (globalThis as any).VectorLLM;
    return !!llm && deepScanAvailable(loadSettings());
  }

  /**
   * Run the LLM deep scan against an existing rule report, merge with the
   * shared policy, and return the merged UI result. Throws when unavailable.
   */
  async deepScan(
    prompt: string,
    baseReport?: any
  ): Promise<{ result: AnalysisResult; via: string }> {
    const llm = (globalThis as any).VectorLLM;
    const engine = (globalThis as any).VectorAnalyzer;
    if (!llm || !engine) throw new Error('Deep scan is not available in this client.');
    const report = baseReport || this.analyzeReport(prompt);
    const settings = loadSettings();
    const out = await llm.deepScan(report.prompt, settings, report);
    const merged = engine.mergeFindings(report, out.findings);
    if (merged.outOfScope) {
      throw new Error(
        (merged.feedback && merged.feedback[0]) ||
          "AI check: this does not look like an AWS infrastructure prompt."
      );
    }
    return { result: this.resultFromReport(merged), via: out.via };
  }
}

function mapSeverity(value: unknown): FindingSeverity {
  const v = String(value || '').toLowerCase();
  if (v === 'critical' || v === 'high' || v === 'medium' || v === 'low') {
    return v as FindingSeverity;
  }
  return 'medium';
}

function mapFinding(f: any): SecurityFinding {
  return {
    id: String(f.id),
    label: f.label || String(f.id),
    description: f.description || f.clause || '',
    severity: mapSeverity(f.severity),
    dimension: f.dimension,
    tier: f.tier,
    clause: f.clause,
    fix: f.fix,
    appliesTo: f.appliesTo,
    evidence: Array.isArray(f.evidence) ? f.evidence : [],
    status: f.status === 'unknown' || f.status === 'rejected' ? f.status : 'confirmed',
    source: f.source === 'ai' ? 'ai' : 'rule',
    explicitlyRisky: !!f.explicitlyRisky
  };
}

function toAnalysisResult(report: any): AnalysisResult {
  return {
    id: `vec-res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: report.prompt || '',
    riskScore: Math.round(report.riskScore || 0),
    riskLevel: (report.riskLevel || 'MINIMAL') as RiskLevel,
    coverageScore: Math.round(report.coverageScore || 0),
    confidenceScore: Math.round(report.confidenceScore || 0),
    resources: ((report.resources as any[]) || []).map((r: any) => ({
      id: r.id,
      label: r.label,
      category: r.category
    })),
    mentioned: ((report.mentioned as any[]) || []).map(mapFinding),
    missing: ((report.missing as any[]) || []).map(mapFinding),
    riskyFindings: ((report.riskyFindings as any[]) || []).map(mapFinding),
    feedback: (report.feedback as string[]) || [],
    blocked: !!report.blocked,
    outOfScope: !!report.outOfScope,
    predictionStatus: report.predictionStatus,
    actionability: report.actionability,
    confidenceKind: report.confidenceKind,
    riskKind: report.riskKind,
    promptIssues: ((report.promptIssues as any[]) || []).map((i: any) => ({
      id: i.id,
      kind: i.kind,
      label: i.label || String(i.id || "Issue"),
      description: i.description,
      fix: i.fix,
      severity: i.severity
    })),
    sanity: report.sanity
      ? { verdict: report.sanity.verdict, score: report.sanity.score, issues: report.sanity.issues }
      : undefined,
    typos: ((report.typos as any[]) || []).map((t: any) => ({ from: t.from, to: t.to })),
    needsClarification: !!report.needsClarification,
    clarificationQuestions: (report.clarificationQuestions as string[]) || [],
    aiVerdict: report.aiVerdict || null,
    aiValidated: !!report.aiValidated,
    requiresDeepScan: !!report.requiresDeepScan,
    createdAt: new Date().toISOString()
  };
}

export const defaultAnalyzer = new VectorEngineAnalyzer();
