import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  Play,
  RotateCcw,
  Download,
  FileDown,
  Info,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  getRunner,
  type AnalysisPayload,
  type Span,
  type ClarificationQuestion,
} from '../services/pyodideEngine.ts';
import {
  planDetection,
  analyzeWithPlan,
  attachExplanation,
  shouldFinalize,
  type DetectionPlan,
  type EngineMode,
} from '../services/analysisPipeline.ts';
import { CircularScoreGauge } from '../components/ui/CircularScoreGauge.tsx';
import { historyStorage } from '../services/historyStorage.ts';
import type { AnalysisResult, RiskLevel } from '../types/analysis.ts';
import { ENGINE_URL } from '../config.ts';

interface NewAnalysisPageProps {
  initialResult?: AnalysisResult | null;
  onClearInitialResult?: () => void;
  onViewHistory?: () => void;
}

const EXAMPLES = [
  {
    key: 'A',
    title: 'Complete button',
    tag: 'Complete',
    prompt: 'Add a red button at the top right corner labelled "Sign Up" that opens the signup form.',
  },
  {
    key: 'B',
    title: 'Navbar',
    tag: 'Detailed',
    prompt: 'Create a blue navbar at the top of the page with links Home, About and Contact.',
  },
  {
    key: 'C',
    title: 'Vague button',
    tag: 'Vague',
    prompt: 'I need a button on my homepage.',
  },
];

const SPAN_STYLES: Record<string, string> = {
  ELEMENT: 'bg-[#49686C]/20 text-[#30494B]',
  COLOR: 'bg-[#D1B653]/30 text-[#856C16]',
  LOCATION: 'bg-[#5A8090]/25 text-[#3E6470]',
  ACTION: 'bg-[#688E5E]/25 text-[#3E6B33]',
  LABEL: 'bg-[#C96839]/20 text-[#9C4A28]',
};

const RISK_META: Record<string, { badge: string; color: string }> = {
  Critical: { badge: 'bg-[#FDF2F0] border-[#F0C4BF] text-[#B94D42]', color: '#B94D42' },
  High: { badge: 'bg-[#FFF7ED] border-[#FED7AA] text-[#C96839]', color: '#C96839' },
  Medium: { badge: 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]', color: '#D1B653' },
  Low: { badge: 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]', color: '#688E5E' },
};

function toRiskLevel(level: string): RiskLevel {
  switch (level) {
    case 'Critical':
      return 'CRITICAL';
    case 'High':
      return 'HIGH';
    case 'Medium':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
}

function riskBadge(level: string) {
  const meta = RISK_META[level] || RISK_META.Low;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-bold ${meta.badge}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {level} risk
    </span>
  );
}

function HighlightedPrompt({ text, spans }: { text: string; spans: Span[] }) {
  const ordered = spans
    .filter((s) => s.char_start >= 0 && s.char_end > s.char_start && s.char_end <= text.length)
    .sort((a, b) => a.char_start - b.char_start);
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ordered.forEach((span, i) => {
    if (span.char_start < cursor) return;
    if (span.char_start > cursor) {
      nodes.push(<span key={`t${i}`}>{text.slice(cursor, span.char_start)}</span>);
    }
    nodes.push(
      <span
        key={`s${i}`}
        className={`px-1 py-0.5 rounded ${SPAN_STYLES[span.label] || 'bg-[#49686C]/15'}`}
        title={span.label}
      >
        {text.slice(span.char_start, span.char_end)}
      </span>
    );
    cursor = span.char_end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return <div className="leading-loose text-[15px] whitespace-pre-wrap break-words">{nodes}</div>;
}

function ComponentBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-[#737A72]">{label}</span>
        <span className="font-mono text-[#283638] font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#E5E2D8] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ElementCard({ el }: { el: AnalysisPayload['result']['elements'][number] }) {
  const complete = el.status === 'complete';
  const chips = Object.entries(el.attributes);
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[#283638]">
            {complete ? '✅' : '⚠️'} {el.type} #{el.id}
          </div>
          <div className="text-xs text-[#737A72] mt-0.5">“{el.text}”</div>
        </div>
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
            complete
              ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]'
              : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]'
          }`}
        >
          {complete ? 'Complete' : `Missing ${el.missing.length} detail(s)`}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {chips.length ? (
          chips.map(([key, value]) => (
            <span key={key} className="px-2 py-0.5 rounded-full bg-[#FAFAF8] border border-[#E5E2D8] text-[11px] text-[#283638]">
              <b className="text-[#49686C]">{key}</b>: {value}
            </span>
          ))
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-[#FAFAF8] border border-[#E5E2D8] text-[11px] text-[#737A72]">
            No attributes detected
          </span>
        )}
      </div>

      {el.messages.length > 0 && (
        <ul className="mt-2.5 text-xs text-[#737A72] space-y-1 list-disc pl-4">
          {el.messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 text-[10px] font-bold text-[#737A72] uppercase tracking-wider">Suggested rewrite</div>
      <div className="mt-1 p-2.5 rounded-lg bg-[#F6F4EC] border border-dashed border-[#CDC9BC] font-mono text-[11px] text-[#283638] leading-relaxed">
        {el.suggestion}
      </div>
    </div>
  );
}

function ClarificationForm({
  questions,
  round,
  onSubmit,
  disabled,
}: {
  questions: ClarificationQuestion[];
  round: number;
  onSubmit: (values: Record<string, string>, usePlaceholders: boolean) => void;
  disabled: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [unknown, setUnknown] = useState<Set<string>>(new Set());

  const handleSubmit = (usePlaceholders: boolean) => {
    const collected: Record<string, string> = {};
    for (const q of questions) {
      const isUnknown = usePlaceholders || unknown.has(q.id) || !(values[q.id] ?? '').trim();
      collected[q.id] = isUnknown ? 'unknown' : values[q.id].trim();
    }
    onSubmit(collected, usePlaceholders);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="text-base font-bold text-[#283638]">A few details are still unclear</h3>
        <span className="text-[10px] font-mono text-[#856C16] bg-[#FEFCE8] border border-[#FEF08A] px-2 py-0.5 rounded-md font-semibold">
          Round {round}
        </span>
      </div>
      <p className="text-xs text-[#737A72] mb-4">
        The analyser re-runs after each round. Answer the open questions, or use placeholders to finish with what is known.
      </p>

      <div className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="border-t border-[#E5E2D8] pt-4 first:border-t-0 first:pt-0">
            <div className="text-sm font-semibold text-[#283638]">{q.prompt}</div>
            {q.examples && q.examples.length > 0 && (
              <div className="text-[11px] text-[#737A72] mt-0.5">Examples: {q.examples.join(', ')}</div>
            )}
            {q.options && q.options.length > 0 ? (
              <select
                value={values[q.id] || ''}
                onChange={(e) => setValues((p) => ({ ...p, [q.id]: e.target.value }))}
                className="mt-2 w-full p-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
              >
                <option value="">Choose…</option>
                {q.options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
                <option value="unknown">I don't know / use placeholder</option>
              </select>
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="text"
                  value={values[q.id] || ''}
                  disabled={unknown.has(q.id)}
                  onChange={(e) => setValues((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder={q.examples ? q.examples.join(', ') : 'Your answer'}
                  className="w-full p-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C] disabled:opacity-50"
                />
                <label className="flex items-center gap-2 text-xs text-[#737A72]">
                  <input
                    type="checkbox"
                    checked={unknown.has(q.id)}
                    onChange={(e) =>
                      setUnknown((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(q.id);
                        else next.delete(q.id);
                        return next;
                      })
                    }
                    className="accent-[#49686C]"
                  />
                  I don't know (use placeholder)
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-[#E5E2D8]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSubmit(false)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-colors disabled:opacity-60"
        >
          {disabled ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Submit answers
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleSubmit(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors disabled:opacity-60"
        >
          Stop asking (use placeholders)
        </button>
      </div>
    </div>
  );
}

export const NewAnalysisPage: React.FC<NewAnalysisPageProps> = ({ initialResult, onViewHistory }) => {
  const [engineState, setEngineState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [engineError, setEngineError] = useState('');
  const engine: EngineMode = 'bert';
  const [text, setText] = useState('');
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [payload, setPayload] = useState<AnalysisPayload | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [round, setRound] = useState(1);
  const [copied, setCopied] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [bertProgress, setBertProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<'idle' | 'routing' | 'detecting' | 'clarify' | 'explaining'>('idle');
  const [plan, setPlan] = useState<DetectionPlan | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<DetectionPlan | null>(null);

  // Boot Pyodide on mount.
  useEffect(() => {
    let cancelled = false;
    getRunner()
      .then(() => {
        if (!cancelled) setEngineState('ready');
      })
      .catch((e: any) => {
        if (!cancelled) {
          setEngineState('error');
          setEngineError(e?.message || String(e));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill from history "Reopen" if provided.
  useEffect(() => {
    if (initialResult?.prompt) setText(initialResult.prompt);
  }, [initialResult]);

  const ensurePlan = useCallback(
    async (input: string): Promise<DetectionPlan> => {
      if (planRef.current) return planRef.current;
      const next = await planDetection(input, {
        mode: engine,
        onProgress: (pct) => setBertProgress(pct),
        onStage: (s) => setStage(s),
      });
      setBertProgress(null);
      planRef.current = next;
      setPlan(next);
      return next;
    },
    [engine],
  );

  const finish = useCallback(async (input: string, base: AnalysisPayload): Promise<AnalysisPayload> => {
    setStage('explaining');
    const explained = await attachExplanation(input, base, { onStage: (s) => setStage(s) });
    setStage('idle');
    return explained;
  }, []);

  const analyze = useCallback(
    async (input: string, mergedAnswers: Record<string, string>, finalize: boolean) => {
      setAnalyzing(true);
      setAnalysisError('');
      try {
        const current = await ensurePlan(input);
        setStage('detecting');
        let p = await analyzeWithPlan(input, current, mergedAnswers, finalize);
        setStage(p.needs_clarification ? 'clarify' : 'explaining');
        if (!p.needs_clarification) p = await finish(input, p);
        setPayload(p);
        if (!p.needs_clarification) historyStorage.save(toHistoryResult(input, p));
      } catch (e: any) {
        setAnalysisError(e?.message || String(e));
        setBertProgress(null);
      } finally {
        setAnalyzing(false);
        setStage('idle');
      }
    },
    [ensurePlan, finish],
  );

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setAnswers({});
    setRound(1);
    planRef.current = null;
    setPlan(null);
    setPayload(null);
    setStage('routing');
    analyze(text.trim(), {}, false);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSubmitAnswers = async (values: Record<string, string>, usePlaceholders: boolean) => {
    const allUnknown = Object.values(values).every((v) => v === 'unknown');
    const stop = usePlaceholders || allUnknown;
    const merged = { ...answers, ...values };
    const nextRound = round + 1;
    setAnswers(merged);
    setRound(nextRound);
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const input = text.trim();
      const current = await ensurePlan(input);
      setStage('clarify');
      let p = await analyzeWithPlan(input, current, merged, false);
      if (shouldFinalize(p, nextRound, stop)) {
        if (p.needs_clarification) {
          p = await analyzeWithPlan(input, current, merged, true);
        }
        p = await finish(input, p);
      }
      setPayload(p);
      if (!p.needs_clarification) historyStorage.save(toHistoryResult(input, p));
    } catch (e: any) {
      setAnalysisError(e?.message || String(e));
      setBertProgress(null);
    } finally {
      setAnalyzing(false);
      setStage('idle');
    }
  };

  const handleCopy = async () => {
    if (!payload?.final_prompt) return;
    try {
      await navigator.clipboard.writeText(payload.final_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  const downloadReport = (format: 'json' | 'markdown') => {
    if (!payload) return;
    const dateStr = new Date().toISOString().split('T')[0];
    let content = '';
    let mime = '';
    let filename = '';
    if (format === 'json') {
      filename = `vector-report-${dateStr}.json`;
      mime = 'application/json;charset=utf-8';
      content = JSON.stringify(payload, null, 2);
    } else {
      filename = `vector-report-${dateStr}.md`;
      mime = 'text/markdown;charset=utf-8';
      const f = payload.risk.final;
      content = [
        '# Vector Report',
        '',
        '## Original prompt',
        '```',
        text,
        '```',
        '',
        '## Risk',
        `- Score: ${f.score} / 100 (${f.level})`,
        `- Missing details: ${f.counts.missing ?? 0}`,
        `- Vague details: ${f.counts.vague ?? 0}`,
        `- Unresolved questions: ${f.counts.unresolved ?? 0}`,
        `- Engine: ${payload.engine}`,
        '',
        '## Detected elements',
        ...payload.result.elements.map(
          (el) =>
            `- **${el.type} #${el.id}** “${el.text}” — ${Object.entries(el.attributes)
              .map(([k, v]) => `${k}=${v}`)
              .join(', ') || 'no attributes'}; missing: ${el.missing.join(', ') || 'none'}`
        ),
        '',
        '## Best prompt',
        '```',
        payload.final_prompt || '(pending clarification)',
        '```',
        '',
      ].join('\n');
      if (payload.recommendations?.length) {
        content += '\n## Recommendations\n' + payload.recommendations.map((r) => `- ${r}`).join('\n');
      }
    }
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">New UI Prompt Analysis</h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#E4EBDD] text-[#30494B] border border-[#CFE2C8]">
              UI/UX Prompt Analyzer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#737A72]">
            Review your interface request for missing labels, colours, placement and actions — right in your browser.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onViewHistory && (
            <button
              type="button"
              onClick={onViewHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
            >
              <History className="w-3.5 h-3.5 text-[#49686C]" />
              <span>Analysis History</span>
            </button>
          )}
          <a
            href={ENGINE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
            title="Full engine with BERT + LLM"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#49686C]" />
            <span>Full engine (BERT + LLM)</span>
          </a>
        </div>
      </div>

      {/* Engine loading / error states */}
      {engineState === 'loading' && (
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
          <Loader2 className="w-7 h-7 text-[#49686C] animate-spin mx-auto mb-3" />
          <div className="text-sm font-bold text-[#283638]">Loading the in-browser engine…</div>
          <p className="text-xs text-[#737A72] mt-1 max-w-md mx-auto">
            First load prepares the BERT detector and deterministic validator. This can take a few seconds.
          </p>
        </div>
      )}

      {engineState === 'error' && (
        <div className="bg-[#FDF2F0] border border-[#F0C4BF] rounded-xl p-5 shadow-xs">
          <div className="flex items-center gap-2 text-[#B94D42] font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Could not start the in-browser engine
          </div>
          <p className="text-xs text-[#B94D42] mt-1">{engineError}</p>
          <p className="text-xs text-[#737A72] mt-2">
            You can still use the deployed Streamlit engine with BERT + LLM at{' '}
            <a className="underline text-[#49686C]" href={ENGINE_URL} target="_blank" rel="noreferrer">
              {ENGINE_URL}
            </a>
            .
          </p>
        </div>
      )}

      {/* Editor */}
      {engineState !== 'error' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <label htmlFor="prompt-input" className="text-base font-bold text-[#283638] block">
                Describe the UI you want
              </label>
              <span className="text-xs text-[#737A72]">
                Enter a natural-language UI request, or pick an example below.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {text.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setSelectedExample(null);
                    setPayload(null);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] rounded-md transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
              <span className="text-xs font-mono text-[#737A72] tabular-nums">{text.length} chars</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs font-semibold text-[#737A72]">Engine:</span>
            <span className="px-3 py-1.5 rounded-full text-xs font-bold border bg-[#49686C] border-[#49686C] text-white">
              BERT
            </span>
            <span className="text-[11px] text-[#737A72]">
              BERT runs first; if confidence is low, the configured LLM is asked for a second opinion automatically.
            </span>
          </div>

          {bertProgress !== null && (
            <p className="text-[11px] text-[#856C16] bg-[#FEFCE8] border border-[#FEF08A] rounded-md px-2.5 py-1.5 mt-2">
              Downloading DistilBERT… {bertProgress}% (one time; your browser caches it afterwards)
            </p>
          )}

          <textarea
            id="prompt-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!analyzing && engineState === 'ready' && text.trim()) handleAnalyze();
              }
            }}
            rows={4}
            placeholder='e.g. Add a red button at the top right corner labelled "Sign Up" that opens the signup form.'
            className="w-full rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] p-3.5 text-sm text-[#283638] placeholder-[#737A72]/70 focus:bg-white focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/10 focus:outline-none transition-all resize-y min-h-[110px]"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mt-4">
            {EXAMPLES.map((ex) => {
              const isSelected = selectedExample === ex.key;
              return (
                <button
                  key={ex.key}
                  type="button"
                  onClick={() => {
                    setText(ex.prompt);
                    setSelectedExample(ex.key);
                    setPayload(null);
                  }}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[#49686C] bg-[#F0F5F5] ring-1 ring-[#49686C]'
                      : 'border-[#E5E2D8] bg-white hover:border-[#CDC9BC] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#283638]">
                      Example {ex.key} — {ex.title}
                    </span>
                    {ex.tag === 'Vague' && (
                      <span className="text-[10px] font-semibold text-[#B94D42] bg-[#FDF2F0] px-1.5 py-0.2 rounded border border-[#F0C4BF]">
                        Vague
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#737A72] line-clamp-2 leading-relaxed">{ex.prompt}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-[#E5E2D8]">
            <div className="flex items-center gap-2 text-xs text-[#737A72]">
              <Sparkles className="w-4 h-4 text-[#D1B653] shrink-0" />
              <span>
                BERT runs on-device. If confidence is low, the configured LLM provides an automatic second opinion; rules remain an internal validator.
              </span>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#737A72] font-mono">
                <kbd className="px-1.5 py-0.5 rounded border border-[#E5E2D8] bg-[#FAFAF8]">Ctrl</kbd>/
                <kbd className="px-1.5 py-0.5 rounded border border-[#E5E2D8] bg-[#FAFAF8]">⌘</kbd>+
                <kbd className="px-1.5 py-0.5 rounded border border-[#E5E2D8] bg-[#FAFAF8]">Enter</kbd>
              </span>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={analyzing || engineState !== 'ready'}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs ${
                  analyzing || engineState !== 'ready'
                    ? 'bg-[#49686C]/60 cursor-wait'
                    : 'bg-[#49686C] hover:bg-[#30494B] active:scale-[0.99]'
                }`}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analysing prompt…</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Analyze Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline stage indicator */}
      <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] p-3 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-semibold">
          {[
            { id: 'routing', label: '1 · Route' },
            { id: 'detecting', label: '2 · Detect' },
            { id: 'clarify', label: '3 · Clarify' },
            { id: 'explaining', label: '4 · Explain' },
          ].map((step, i) => {
            const active = stage === step.id;
            const done =
              (step.id === 'routing' && stage !== 'routing' && stage !== 'idle' && stage !== 'detecting') ||
              (step.id === 'detecting' && (stage === 'clarify' || stage === 'explaining')) ||
              (step.id === 'clarify' && stage === 'explaining');
            return (
              <span key={step.id} className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md border ${
                    active
                      ? 'bg-[#49686C] border-[#49686C] text-white'
                      : done
                        ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]'
                        : 'bg-[#FAFAF8] border-[#E5E2D8] text-[#737A72]'
                  }`}
                >
                  {step.label}
                </span>
                {i < 3 && <span className="text-[#CDC9BC]">→</span>}
              </span>
            );
          })}
          <span className="ml-auto text-[11px] font-normal text-[#737A72]">
            {stage === 'routing' && 'Router scoring the prompt…'}
            {stage === 'detecting' && (bertProgress !== null ? `Loading detector ${bertProgress}%` : 'Running the detector…')}
            {stage === 'clarify' && 'Ambiguity found — asking before scoring'}
            {stage === 'explaining' && 'Writing the final explanation with the LLM…'}
            {stage === 'idle' && (payload?.needs_clarification ? 'Waiting for answers' : 'Ready')}
          </span>
        </div>
      </div>

      {/* Analysis error (engine-specific; the editor stays usable) */}
      {analysisError && (
        <div className="bg-[#FDF2F0] border border-[#F0C4BF] rounded-xl p-4 shadow-xs">
          <div className="flex items-center gap-2 text-[#B94D42] font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Analysis failed
          </div>
          <p className="text-xs text-[#B94D42] mt-1">{analysisError}</p>
          {engine === 'bert' && (
            <p className="text-xs text-[#737A72] mt-2">
              Check that <code className="font-mono">models/bert_tagger/onnx/model_quantized.onnx</code> loads, then try again.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {payload && (
        <div ref={resultsRef} className="space-y-5 scroll-mt-6">
          {/* Action bar */}
          <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E5E2D8] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2 h-2 rounded-full ${payload.needs_clarification ? 'bg-[#D1B653]' : 'bg-[#49686C]'}`} />
              <span className="text-xs font-bold text-[#283638]">
                {payload.needs_clarification ? 'Clarification required' : 'Diagnosis complete'}
              </span>
              <span className="text-xs text-[#737A72] hidden md:inline">
                · {payload.result.elements.length} element(s) · engine: {payload.engine}
              </span>
              {plan && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-[#CFE2C8] bg-[#F4F9F1] text-[#3E6B33]">
                  {plan.mode === 'auto' ? 'router' : 'manual'} → {plan.selected}
                </span>
              )}
            </div>
            {!payload.needs_clarification && (
              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => downloadReport('markdown')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#49686C]" />
                  <span>.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => downloadReport('json')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-[#49686C]" />
                  <span>.json</span>
                </button>
              </div>
            )}
          </div>

          {/* Routing provenance */}
          {payload.router && (
            <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-xs font-bold text-[#283638]">How this prompt was routed</div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#CFE2C8] bg-[#F4F9F1] text-[#3E6B33]">
                  {String((payload.router as any).selected || payload.engine)} ·{' '}
                  {String((payload.router as any).selected_by || 'router+confidence')}
                </span>
              </div>
              <p className="text-xs text-[#737A72] mt-1.5">{plan?.reason || payload.router.reason}</p>
              {plan && Object.keys(plan.compared).length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#737A72]">Candidates:</span>
                  {Object.entries(plan.compared).map(([name, score]) => (
                    <span key={name} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#E5E2D8] bg-[#FAFAF8]">
                      <b className="text-[#49686C] uppercase">{name}</b> {score.toFixed(2)}
                    </span>
                  ))}
                </div>
              )}
              {plan?.fallback && (
                <div className="text-[11px] text-[#856C16] bg-[#FEFCE8] border border-[#FEF08A] rounded-md px-2 py-1.5 mt-2">
                  Fallback: {plan.fallback}
                </div>
              )}
            </div>
          )}

          {/* Clarification gate: no score/explanation until ambiguity is resolved */}
          {payload.needs_clarification && (
            <div className="bg-[#FFFDF5] rounded-xl border border-[#FEF08A] p-4">
              <div className="text-xs font-bold text-[#856C16]">Score withheld until the prompt is unambiguous</div>
              <p className="text-xs text-[#737A72] mt-1">
                The router picked <b className="text-[#283638]">{payload.engine}</b> and found{' '}
                {payload.clarification.questions.length} unresolved detail(s). Answer the questions on the right;
                the analyser re-runs after each round and only then computes the risk score and LLM explanation.
              </p>
            </div>
          )}

          {/* Risk overview */}
          {!payload.needs_clarification && (() => {
            const initial = payload.risk.initial;
            const final = payload.risk.final;
            const components = final.components || {};
            const counts = final.counts || {};
            const completeness = Math.round(100 * (1 - (components.completeness ?? 1)));
            const confidence = Math.round(100 * (payload.confidence ?? 0));
            const level = final.level;
            const meta = RISK_META[level] || RISK_META.Low;
            return (
              <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 flex-wrap pb-4 border-b border-[#E5E2D8]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[#283638]">Evaluation Summary</h2>
                      {riskBadge(level)}
                    </div>
                    <div className="text-xs text-[#737A72] mt-1">Shared deterministic risk score across all detectors.</div>
                  </div>
                  <span className="text-xs font-mono text-[#737A72]">
                    Initial {initial.score} → Final {final.score}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                  <CircularScoreGauge score={Math.round(final.score)} label="Risk index" sublabel="Lower is safer" variant="risk" size={104} />
                  <CircularScoreGauge score={completeness} label="Completeness" sublabel="Required details stated" variant="coverage" size={104} />
                  <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-xl p-4 flex flex-col justify-center">
                    <div className="text-xs font-bold text-[#283638] mb-2">Detector confidence</div>
                    <div className="text-2xl font-bold font-mono text-[#283638] tabular-nums">{confidence}%</div>
                    <div className="h-1.5 rounded-full bg-[#E5E2D8] overflow-hidden mt-2">
                      <div className="h-full rounded-full bg-[#49686C] transition-all duration-700" style={{ width: `${confidence}%` }} />
                    </div>
                    <div className="text-[11px] text-[#737A72] mt-2">A heuristic, not a calibrated probability.</div>
                  </div>
                  <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-xl p-4">
                    <div className="text-xs font-bold text-[#283638] mb-2">Detected findings</div>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between"><span className="text-[#737A72]">UI elements</span><b className="font-mono text-[#283638]">{payload.result.elements.length}</b></div>
                      <div className="flex items-center justify-between"><span className="text-[#737A72]">Missing details</span><b className="font-mono text-[#283638]">{counts.missing ?? 0}</b></div>
                      <div className="flex items-center justify-between"><span className="text-[#737A72]">Vague details</span><b className="font-mono text-[#283638]">{counts.vague ?? 0}</b></div>
                      <div className="flex items-center justify-between"><span className="text-[#737A72]">Unresolved questions</span><b className="font-mono text-[#283638]">{counts.unresolved ?? 0}</b></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 mt-5">
                  <ComponentBar label="Missing details" value={components.completeness ?? 0} color="#49686C" />
                  <ComponentBar label="Vague details" value={components.vagueness ?? 0} color="#D1B653" />
                  <ComponentBar label="Detector uncertainty" value={components.detection ?? 0} color="#5A8090" />
                  <ComponentBar label="Unresolved questions" value={components.unresolved ?? 0} color="#C96839" />
                </div>

                {(payload.explanation || final.explanation) && (
                  <div className="mt-5 flex gap-2.5 items-start bg-[#F6F4EC] border border-[#E5E2D8] rounded-xl p-3.5">
                    <Info className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-[#30494B]">
                        {payload.explanation_source === 'llm' ? 'LLM explanation' : 'Deterministic explanation'}
                      </div>
                      <div className="text-xs text-[#283638] leading-relaxed mt-0.5">{payload.explanation || final.explanation}</div>
                      {payload.explanation_source !== 'llm' && (
                        <div className="text-[11px] text-[#856C16] mt-1">
                          Add a base URL, model and API key in Settings to have the LLM write this explanation.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Highlighted prompt */}
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6">
            <div className="text-[10px] font-bold text-[#737A72] uppercase tracking-wider mb-1">Prompt under review</div>
            <div className="text-base font-bold text-[#283638] mb-3">Your interface request</div>
            <div className="p-3.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8]">
              <HighlightedPrompt text={text} spans={payload.spans} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-[#737A72]">
              {Object.entries(SPAN_STYLES).map(([label, cls]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded ${cls} font-bold text-[11px]`}>{label}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Elements + clarification/final */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-[#283638]">Detected elements ({payload.result.elements.length})</div>
                <div className="text-[11px] text-[#737A72]">Extracted by the {payload.engine === 'llm' ? 'LLM' : payload.engine === 'bert' ? 'BERT' : 'Rules'} engine</div>
              </div>
              {payload.result.elements.length === 0 ? (
                <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-8 text-center text-xs text-[#737A72]">
                  No supported UI elements were detected. Try mentioning a button, navbar, input field, card, modal, image, dropdown, sidebar, footer or checkbox.
                </div>
              ) : (
                payload.result.elements.map((el) => <ElementCard key={el.id} el={el} />)
              )}
            </div>

            <div className="lg:col-span-5">
              {payload.needs_clarification ? (
                <ClarificationForm
                  questions={payload.clarification.questions}
                  round={round}
                  onSubmit={handleSubmitAnswers}
                  disabled={analyzing}
                />
              ) : (
                <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-5 shadow-xs">
                  <div className="text-[10px] font-bold text-[#737A72] uppercase tracking-wider mb-1">Validated recommendation</div>
                  <h3 className="text-base font-bold text-[#283638] mb-2">Best prompt</h3>

                  {payload.clarification.unresolved.length > 0 && (
                    <div className="mb-3 p-2.5 rounded-lg bg-[#FEFCE8] border border-[#FEF08A] text-[11px] text-[#856C16]">
                      <b>Unresolved:</b>{' '}
                      {payload.clarification.unresolved.map((q) => q.prompt).join(' · ')}
                    </div>
                  )}

                  {payload.final_prompt ? (
                    <>
                      <pre className="whitespace-pre-wrap break-words p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8] font-mono text-xs text-[#283638] leading-relaxed">
                        {payload.final_prompt}
                      </pre>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-[#3E6B33]" /> : <Copy className="w-3.5 h-3.5 text-[#49686C]" />}
                        <span>{copied ? 'Copied!' : 'Copy prompt'}</span>
                      </button>
                    </>
                  ) : (
                    <div className="p-3 rounded-lg bg-[#F6F4EC] border border-[#E5E2D8] text-xs text-[#737A72]">
                      {payload.result.summary.message}
                    </div>
                  )}

                  {payload.recommendations && payload.recommendations.length > 0 && (
                    <>
                      <div className="mt-4 text-[10px] font-bold text-[#737A72] uppercase tracking-wider">Recommendations</div>
                      <ul className="mt-1.5 space-y-1.5 text-xs text-[#283638] list-disc pl-4">
                        {payload.recommendations.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-4 pt-3 border-t border-[#E5E2D8] text-[11px] text-[#737A72]">
                    Ready to paste into your UI generator, Figma prompt or code assistant.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Why this result */}
          <details className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs overflow-hidden">
            <summary className="cursor-pointer px-5 py-3.5 text-sm font-bold text-[#283638] hover:bg-[#FAFAF8] transition-colors">
              Why this engine and score?
            </summary>
            <div className="px-5 pb-4 text-xs text-[#737A72] space-y-1.5">
              <p><b className="text-[#283638]">Engine used for the score:</b> <code className="font-mono">{payload.engine}</code></p>
              <p><b className="text-[#283638]">Router:</b> {plan?.reason || payload.router?.reason || 'manual selection'}</p>
              {plan && (
                <p>
                  <b className="text-[#283638]">Candidates (confidence + detail):</b>{' '}
                  {Object.entries(plan.compared)
                    .map(([name, score]) => `${name} ${score.toFixed(2)}`)
                    .join(' · ')}
                </p>
              )}
              {plan?.fallback && (
                <p className="text-[#856C16]"><b>Fallback:</b> {plan.fallback}</p>
              )}
              <p><b className="text-[#283638]">Detector confidence:</b> {(payload.confidence ?? 0).toFixed(2)}</p>
              <p><b className="text-[#283638]">Explanation:</b> {payload.explanation_source === 'llm' ? 'LLM (final write-up)' : 'deterministic fallback'}</p>
              <p className="pt-1">
                Rules, BERT and the grounded LLM all run right here in the browser — Rules via Pyodide, BERT via
                a quantized ONNX model, and the LLM via your configured endpoint. Everything downstream (linking,
                checker, clarification and the shared risk score) is identical across engines.
              </p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

function toHistoryResult(prompt: string, payload: AnalysisPayload): AnalysisResult {
  const final = payload.risk.final;
  const components = final.components || {};
  return {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    riskScore: Math.round(final.score),
    riskLevel: toRiskLevel(final.level),
    coverageScore: Math.round(100 * (1 - (components.completeness ?? 1))),
    confidenceScore: Math.round(100 * (payload.confidence ?? 0)),
    resources: payload.result.elements.map((el) => ({
      id: el.type,
      label: `${el.type} #${el.id}`,
      category: 'UI element',
    })),
    mentioned: [],
    missing: [],
    riskyFindings: [],
    feedback: [payload.result.summary.message],
    createdAt: new Date().toISOString(),
  };
}
