// Persisted settings for the web app (deep scan credentials + behaviour).
export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  autoDeepScan: boolean;
}

const STORAGE_KEY = 'prompt_linter_settings_v2';

// Demo builds: tools/inject-demo-config.js writes a gitignored
// public/engine/demo-config.js exposing window.VECTOR_DEMO_SETTINGS. The
// build-time VITE key still wins when both are present. Never commit a key.
const DEMO = (typeof window !== 'undefined' && (window as any).VECTOR_DEMO_SETTINGS) || {};
const ENV = (import.meta as any).env || {};
const TEST_API_KEY: string = ENV.VITE_VECTOR_TEST_API_KEY || DEMO.apiKey || '';
const TEST_BASE_URL: string = ENV.VITE_VECTOR_BASE_URL || DEMO.baseUrl || '';
const TEST_MODEL: string = ENV.VITE_VECTOR_MODEL || DEMO.model || '';

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: TEST_API_KEY,
  baseUrl: TEST_BASE_URL || 'https://api.groq.com/openai/v1',
  model: TEST_MODEL || 'openai/gpt-oss-120b',
  autoDeepScan: true
};

export function loadSettings(): AppSettings {
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
    // Test build: a build-time key and the Groq defaults are authoritative.
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

export function saveSettings(settings: AppSettings): void {
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

export function deepScanAvailable(settings: AppSettings): boolean {
  return !!settings.apiKey || onDeviceModelAvailable();
}

