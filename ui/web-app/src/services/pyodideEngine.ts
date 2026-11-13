/**
 * In-browser analysis engine: runs the real Python Rules backend via Pyodide.
 *
 * The Python source mirror lives in `public/py/src/` (copied from `src/` via
 * `sync_docs.py`) and is served statically. On first use we download the
 * Pyodide runtime (~10 MB) from jsDelivr, write the Python files into its
 * virtual filesystem, and expose a single `run_analysis(text, answers, finalize)`
 * entry point that returns the same JSON payload as the Streamlit app.
 */

export interface Span {
  label: string;
  char_start: number;
  char_end: number;
  text?: string;
}

export interface ElementResult {
  id: number;
  type: string;
  text: string;
  attributes: Record<string, string>;
  messages: string[];
  missing: string[];
  suggestion: string;
  status: string;
}

export interface ClarificationQuestion {
  id: string;
  prompt: string;
  examples?: string[];
  options?: string[];
}

export interface RiskDetail {
  score: number;
  level: string;
  components: Record<string, number>;
  counts: Record<string, number>;
  explanation?: string;
}

export interface AnalysisPayload {
  tokens: string[];
  tags: string[];
  spans: Span[];
  result: {
    summary: { message: string; n_elements: number; complete: boolean };
    elements: ElementResult[];
  };
  engine: string;
  router: { method: string; reason: string; scores?: Record<string, number>; selected?: string };
  confidence: number;
  llm_meta?: Record<string, unknown>;
  llm_error?: string | null;
  llm_used?: boolean;
  risk: { initial: RiskDetail; final: RiskDetail };
  clarification: {
    questions: ClarificationQuestion[];
    answers: Record<string, string>;
    unresolved: { prompt: string }[];
  };
  needs_clarification: boolean;
  final_prompt: string | null;
  deterministic_prompt: string | null;
  explanation: string | null;
  explanation_source?: 'llm' | 'deterministic';
  recommendations: string[] | null;
}

type Runner = {
  runAnalysis: (text: string, answersJson: string, finalize: boolean) => string;
  runAnalysisFromSpans: (
    text: string,
    spansJson: string,
    confidence: number,
    engine: string,
    answersJson: string,
    finalize: boolean,
  ) => string;
  route: (text: string, allowLlm: boolean) => string;
};

const PYODIDE_VERSION = '0.28.3';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

const PY_FILES = [
  '__init__.py',
  'schema.py',
  'tokenization.py',
  'bio.py',
  'messages.py',
  'checker.py',
  'vague.py',
  'linking.py',
  'clarification.py',
  'risk.py',
  'router.py',
  'rules_tagger.py',
  'pipeline.py',
  'llm_backend.py',
];

const BOOTSTRAP = `
import sys, json
sys.path.insert(0, '/home/pyodide')
from src.pipeline import analyze_full, analyze_full_from_spans
from src.router import route

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

def run_analysis_from_spans(text, spans_json, confidence, engine, answers_json, finalize):
    answers = json.loads(answers_json) if answers_json else None
    spans = json.loads(spans_json) if spans_json else []
    payload = analyze_full_from_spans(
        text,
        spans,
        float(confidence),
        engine,
        answers=answers,
        finalize=bool(finalize),
    )
    return json.dumps(payload, ensure_ascii=False)

def route_prompt(text, allow_llm):
    decision = route(text, allow_llm=bool(allow_llm))
    return json.dumps(decision, ensure_ascii=False)
`;

let runnerPromise: Promise<Runner> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function boot(): Promise<Runner> {
  await loadScript(`${PYODIDE_URL}pyodide.js`);
  const loadPyodide = (window as any).loadPyodide;
  if (typeof loadPyodide !== 'function') {
    throw new Error('Pyodide failed to initialise.');
  }

  const pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  pyodide.FS.mkdirTree('/home/pyodide/src');
  pyodide.FS.mkdirTree('/home/pyodide/data');

  await Promise.all(
    PY_FILES.map(async (name) => {
      const response = await fetch(`py/src/${name}`);
      if (!response.ok) throw new Error(`Could not load py/src/${name}`);
      pyodide.FS.writeFile(`/home/pyodide/src/${name}`, await response.text());
    })
  );

  const schemaResponse = await fetch('py/data/schema.json');
  if (!schemaResponse.ok) throw new Error('Could not load py/data/schema.json');
  pyodide.FS.writeFile('/home/pyodide/data/schema.json', await schemaResponse.text());

  await pyodide.runPythonAsync(BOOTSTRAP);
  const runAnalysis = pyodide.globals.get('run_analysis');
  const runAnalysisFromSpans = pyodide.globals.get('run_analysis_from_spans');
  const routePrompt = pyodide.globals.get('route_prompt');
  if (!runAnalysis || !runAnalysisFromSpans || !routePrompt) {
    throw new Error('The Python bootstrap did not define the analysis entry points.');
  }

  return {
    runAnalysis: (text: string, answersJson: string, finalize: boolean): string =>
      String(runAnalysis(text, answersJson, finalize)),
    runAnalysisFromSpans: (
      text: string,
      spansJson: string,
      confidence: number,
      engine: string,
      answersJson: string,
      finalize: boolean,
    ): string =>
      String(runAnalysisFromSpans(text, spansJson, confidence, engine, answersJson, finalize)),
    route: (text: string, allowLlm: boolean): string => String(routePrompt(text, allowLlm)),
  };
}

export function getRunner(): Promise<Runner> {
  if (!runnerPromise) {
    runnerPromise = boot();
  }
  return runnerPromise;
}

/**
 * Run the Rules backend in the browser. Returns the full analysis payload.
 */
export async function runAnalysis(
  text: string,
  answers: Record<string, string> = {},
  finalize = false
): Promise<AnalysisPayload> {
  const runner = await getRunner();
  const raw = runner.runAnalysis(text, JSON.stringify(answers), finalize);
  return JSON.parse(raw) as AnalysisPayload;
}

/**
 * Run the downstream pipeline on spans detected outside Python (BERT / LLM).
 */
export async function runAnalysisFromSpans(
  text: string,
  spans: { label: string; char_start: number; char_end: number }[],
  confidence: number,
  engine: string,
  answers: Record<string, string> = {},
  finalize = false
): Promise<AnalysisPayload> {
  const runner = await getRunner();
  const raw = runner.runAnalysisFromSpans(
    text,
    JSON.stringify(spans),
    confidence,
    engine,
    JSON.stringify(answers),
    finalize,
  );
  return JSON.parse(raw) as AnalysisPayload;
}

export interface RouterDecision {
  method: 'rules' | 'bert' | 'llm';
  reason: string;
  scores: Record<string, number>;
  margin?: number;
  confidence?: number;
  features?: Record<string, unknown>;
}

/** Ask the shared Python router which detector should win for this prompt. */
export async function routePrompt(text: string, allowLlm: boolean): Promise<RouterDecision> {
  const runner = await getRunner();
  return JSON.parse(runner.route(text, allowLlm)) as RouterDecision;
}

export const isPyodideReady = (): boolean => runnerPromise !== null;
