// Persisted settings for the web app (deep scan credentials + behaviour).
export interface VectorSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  autoDeepScan: boolean;
}

const STORAGE_KEY = 'prompt_linter_settings_v1';

// Demo builds: tools/inject-demo-config.js writes a gitignored
// public/engine/demo-config.js exposing window.VECTOR_DEMO_SETTINGS. The
// build-time VITE key still wins when both are present. Never commit a key.
const DEMO = (typeof window !== 'undefined' && (window as any).VECTOR_DEMO_SETTINGS) || {};
const TEST_API_KEY =
  ((import.meta as any).env?.VITE_VECTOR_TEST_API_KEY as string) || DEMO.apiKey || '';

export const DEFAULT_SETTINGS: VectorSettings = {
  apiKey: TEST_API_KEY,
  baseUrl: DEMO.baseUrl || 'https://opencode.ai/zen/go/v1',
  model: DEMO.model || 'deepseek-v4.1-flash',
  autoDeepScan: true
};

export function loadSettings(): VectorSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const saved = JSON.parse(raw);
    const merged = {
      ...DEFAULT_SETTINGS,
      ...saved,
      apiKey: saved.apiKey || DEFAULT_SETTINGS.apiKey,
      baseUrl: saved.baseUrl || DEFAULT_SETTINGS.baseUrl,
      model: saved.model || DEFAULT_SETTINGS.model
    };
    // Test build: a build-time key and the Groq/qwen defaults are authoritative.
    if (TEST_API_KEY) {
      merged.apiKey = TEST_API_KEY;
      merged.baseUrl = DEFAULT_SETTINGS.baseUrl;
      merged.model = DEFAULT_SETTINGS.model;
      merged.autoDeepScan = true;
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: VectorSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore quota/private-mode errors
  }
}

export function onDeviceModelAvailable(): boolean {
  const llm = (globalThis as any).VectorLLM;
  try {
    return !!(llm && llm.localAvailable && llm.localAvailable());
  } catch {
    return false;
  }
}

export function deepScanAvailable(settings: VectorSettings): boolean {
  return !!settings.apiKey || onDeviceModelAvailable();
}

