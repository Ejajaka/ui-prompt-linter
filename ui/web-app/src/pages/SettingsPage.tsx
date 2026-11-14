import React, { useState } from 'react';
import {
  Palette,
  Cpu,
  Info,
  Database,
  Check,
  ShieldCheck,
  Trash2,
  Sun,
  Moon,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage.ts';
import { loadSettings, saveSettings, type AppSettings } from '../services/settings.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { ENGINE_URL } from '../config.ts';

interface SettingsPageProps {
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshData }) => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const [llm, setLlm] = useState<AppSettings>(() => loadSettings());
  const [llmSaved, setLlmSaved] = useState(false);

  const handleSaveLlm = () => {
    saveSettings(llm);
    setLlmSaved(true);
    toast('LLM settings saved', 'info');
    window.setTimeout(() => setLlmSaved(false), 1500);
  };

  const handleClearData = () => {
    if (window.confirm('Clear all local prompt history?')) {
      historyStorage.clear();
      if (onRefreshData) onRefreshData();
      toast('Local history cleared', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
          System Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#737A72] mt-1">
          Theme, engine information and local data for Vector.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Palette className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Appearance &amp; Theme</h2>
        </div>

        <p className="text-xs text-[#737A72]">
          Choose your interface theme. Both themes preserve Vector's teal and mustard accents with high-contrast readability.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Light Mode Option */}
          <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            theme === 'light'
              ? 'border-[#49686C] bg-[#F0F5F5] ring-1 ring-[#49686C]'
              : 'border-[#E5E2D8] bg-[#FAFAF8] hover:bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="text-[#49686C] focus:ring-[#49686C]"
              />
              <div className="p-2 rounded-lg bg-[#FFFFFF] border border-[#E5E2D8] text-[#D1B653]">
                <Sun className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#283638] block">Vector Classic (Light)</span>
                <span className="text-[11px] text-[#737A72]">Warm ivory #F6F4EC canvas &amp; teal typography</span>
              </div>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-[#49686C]" />}
          </label>

          {/* Dark Mode Option */}
          <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            theme === 'dark'
              ? 'border-[#49686C] bg-[#F0F5F5] ring-1 ring-[#49686C]'
              : 'border-[#E5E2D8] bg-[#FAFAF8] hover:bg-white'
          }`}>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="text-[#49686C] focus:ring-[#49686C]"
              />
              <div className="p-2 rounded-lg bg-[#283638] text-white">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#283638] block">Vector Obsidian (Dark)</span>
                <span className="text-[11px] text-[#737A72]">Deep slate teal-black canvas &amp; high contrast</span>
              </div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-[#49686C]" />}
          </label>
        </div>
      </div>

      {/* Analysis Engine Section */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Cpu className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Analysis Engine</h2>
        </div>

        <div className="p-4 rounded-lg bg-[#F4F9F1] border border-[#CFE2C8] space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3E6B33]" />
            <span className="text-xs font-bold text-[#2D5A27]">
              Active: BERT with automatic LLM fallback
            </span>
          </div>
          <p className="text-xs text-[#283638] leading-relaxed pl-6">
            BERT runs first. If its confidence is low, the configured OpenAI-compatible endpoint is asked for a second opinion. Rules remain an internal deterministic validator, not a user-facing mode.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-[#283638]">Detection engines</div>
          <ul className="text-xs text-[#737A72] space-y-1.5 leading-relaxed">
            <li><b className="text-[#283638]">BERT</b> - the only visible detector; fine-tuned DistilBERT BIO tagger.</li>
            <li><b className="text-[#283638]">LLM fallback</b> - automatic second opinion only when BERT confidence is low.</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8] text-xs text-[#737A72] leading-relaxed">
          <b className="text-[#283638]">In this web app</b> BERT runs on your device through a quantized ONNX model.
          It downloads about 67 MB once and caches it in your browser; a configured LLM provides a second opinion,
          while rules remain an internal deterministic validator. You can also use the{' '}
          <a href={ENGINE_URL} target="_blank" rel="noreferrer" className="underline text-[#49686C]">
            full Streamlit engine
          </a>{' '}
          for the Python-side implementations.
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-[#283638]">LLM layer (optional)</div>
          <p className="text-xs text-[#737A72] leading-relaxed">
            The LLM is grounded: it may only return elements and attribute values that appear verbatim in the
            prompt, and it cannot change the deterministic risk score. The separately deployed Streamlit engine
            defaults to a local Ollama server; in this web app you bring your own OpenAI-compatible endpoint.
          </p>
          <ul className="text-xs text-[#737A72] space-y-1.5 leading-relaxed list-disc pl-4">
            <li><b className="text-[#283638]">Groq</b> — <code className="font-mono text-[#49686C]">openai/gpt-oss-120b</code> at <code className="font-mono text-[#49686C]">https://api.groq.com/openai/v1</code></li>
            <li><b className="text-[#283638]">OpenRouter</b> — any tool-capable model at <code className="font-mono text-[#49686C]">https://openrouter.ai/api/v1</code></li>
            <li><b className="text-[#283638]">Ollama</b> — <code className="font-mono text-[#49686C]">qwen2.5:3b-instruct</code> at <code className="font-mono text-[#49686C]">http://localhost:11434/v1</code></li>
          </ul>
          <p className="text-xs text-[#737A72]">
            If the endpoint is not reachable or returns nothing grounded, the app falls back to deterministic
            explanations — nothing is fabricated.
          </p>
          <a
            href={ENGINE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#49686C] hover:text-[#30494B]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open the full engine
          </a>
        </div>
      </div>

      {/* LLM Engine (optional) */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Sparkles className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">LLM Engine (optional)</h2>
        </div>

        <p className="text-xs text-[#737A72] leading-relaxed">
          Add an OpenAI-compatible endpoint to run grounded LLM extraction on the New Analysis page. The key is
          stored only in this browser (localStorage) and is sent only to the endpoint you enter. The provider must
          allow browser (CORS) calls — Groq, OpenRouter and Gemini do.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-[#283638] block mb-1">Base URL</label>
            <input
              type="text"
              value={llm.baseUrl}
              onChange={(e) => setLlm((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="https://api.groq.com/openai/v1"
              className="w-full rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] px-3 py-2 text-sm text-[#283638] placeholder-[#737A72]/70 focus:bg-white focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/10 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#283638] block mb-1">Model</label>
            <input
              type="text"
              value={llm.model}
              onChange={(e) => setLlm((p) => ({ ...p, model: e.target.value }))}
              placeholder="openai/gpt-oss-120b"
              className="w-full rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] px-3 py-2 text-sm text-[#283638] placeholder-[#737A72]/70 focus:bg-white focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/10 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#283638] block mb-1">API key</label>
            <input
              type="password"
              value={llm.apiKey}
              onChange={(e) => setLlm((p) => ({ ...p, apiKey: e.target.value }))}
              placeholder="gsk_..."
              className="w-full rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] px-3 py-2 text-sm text-[#283638] placeholder-[#737A72]/70 focus:bg-white focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/10 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSaveLlm}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold transition-colors"
          >
            {llmSaved ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{llmSaved ? 'Saved' : 'Save LLM settings'}</span>
          </button>
          <span className="text-[11px] text-[#737A72]">Stored locally in your browser only — never committed.</span>
        </div>
      </div>

      {/* Local Data Management */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Database className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Local Data &amp; Storage</h2>
        </div>

        <p className="text-xs text-[#737A72]">
          All prompt history and reviews are stored locally within your browser's private web storage. No data is stored in remote databases.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleClearData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#F0C4BF] bg-white hover:bg-[#FDF2F0] text-xs font-semibold text-[#B94D42] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Local Storage</span>
          </button>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <ShieldCheck className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Privacy</h2>
        </div>
        <p className="text-xs text-[#737A72] leading-relaxed">
          No analytics, trackers or accounts. Prompts stay in your browser unless you explicitly run the optional
          LLM engine, which sends them to the endpoint you configured. Read the full policy:
        </p>
        <a
          href="./privacy-policy.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#49686C] hover:text-[#30494B]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Privacy Policy
        </a>
      </div>

      {/* Application Information */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Info className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">About Vector</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#737A72] block">Application</span>
            <span className="font-bold text-[#283638]">Vector — UI/UX Prompt Review</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Version</span>
            <span className="font-mono font-bold text-[#283638]">v2.0</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Engine Type</span>
            <span className="font-bold text-[#283638]">BERT (on-device)</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Execution Context</span>
            <span className="font-bold text-[#283638]">BERT on-device; LLM fallback by API</span>
          </div>
        </div>
      </div>
    </div>
  );
};
