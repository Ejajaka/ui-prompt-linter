import React from 'react';
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
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { ENGINE_URL } from '../config.ts';

interface SettingsPageProps {
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshData }) => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

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
          Theme, engine information and local data for Prompt Linter.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Palette className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Appearance &amp; Theme</h2>
        </div>

        <p className="text-xs text-[#737A72]">
          Choose your interface theme. Both themes preserve Prompt Linter's teal and mustard accents with high-contrast readability.
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
                <span className="text-xs font-bold text-[#283638] block">Prompt Linter Classic (Light)</span>
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
                <span className="text-xs font-bold text-[#283638] block">Prompt Linter Obsidian (Dark)</span>
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
              Active: Auto (Rules / BERT / LLM)
            </span>
          </div>
          <p className="text-xs text-[#283638] leading-relaxed pl-6">
            The engine chooses Rules, a fine-tuned DistilBERT tagger or an optional grounded LLM per prompt, then runs the shared completeness checker and risk score.
          </p>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-[#283638]">Detection engines</div>
          <ul className="text-xs text-[#737A72] space-y-1.5 leading-relaxed">
            <li><b className="text-[#283638]">Auto</b> — chooses Rules, BERT or LLM from prompt features.</li>
            <li><b className="text-[#283638]">Rules</b> — deterministic lexicons, regexes and heuristics (default).</li>
            <li><b className="text-[#283638]">BERT</b> — fine-tuned DistilBERT BIO token classifier.</li>
          </ul>
        </div>

        <div className="p-3.5 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8] text-xs text-[#737A72] leading-relaxed">
          <b className="text-[#283638]">In this web UI</b> the Rules engine runs entirely in your browser via Pyodide.
          BERT and the grounded LLM run in the{' '}
          <a href={ENGINE_URL} target="_blank" rel="noreferrer" className="underline text-[#49686C]">
            full Streamlit engine
          </a>
          .
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-[#283638]">LLM layer (optional)</div>
          <p className="text-xs text-[#737A72] leading-relaxed">
            For plain-language explanations and low-confidence fallback, the full engine defaults to a local Ollama server (free, no API key). Any OpenAI-compatible endpoint can be used instead — configured server-side, never in the browser:
          </p>
          <ul className="text-xs text-[#737A72] space-y-1.5 leading-relaxed list-disc pl-4">
            <li><b className="text-[#283638]">Local Ollama</b> (default) — <code className="font-mono text-[#49686C]">qwen2.5:3b-instruct</code> at <code className="font-mono text-[#49686C]">localhost:11434</code></li>
            <li><b className="text-[#283638]">OpenCode Go</b> — <code className="font-mono text-[#49686C]">deepseek-v4.1-flash</code></li>
            <li><b className="text-[#283638]">Groq</b> — <code className="font-mono text-[#49686C]">llama-3.1-8b-instant</code></li>
          </ul>
          <p className="text-xs text-[#737A72]">
            If no model is reachable, the engine falls back to deterministic explanations — nothing is fabricated.
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

      {/* Application Information */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Info className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">About Prompt Linter</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#737A72] block">Application</span>
            <span className="font-bold text-[#283638]">Prompt Linter — UI/UX Prompt Review</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Version</span>
            <span className="font-mono font-bold text-[#283638]">v2.0</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Engine Type</span>
            <span className="font-bold text-[#283638]">Rules + BERT + LLM</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Execution Context</span>
            <span className="font-bold text-[#283638]">Rules in-browser; BERT + LLM via the full engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
