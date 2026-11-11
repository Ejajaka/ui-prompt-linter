import React, { useState } from 'react';
import { 
  Palette, 
  Cpu, 
  Info, 
  Database, 
  Check, 
  ShieldCheck, 
  AlertCircle,
  Trash2,
  Sun,
  Moon
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, onDeviceModelAvailable } from '../services/settings.ts';
import type { VectorSettings } from '../services/settings.ts';

interface SettingsPageProps {
  onRefreshData?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshData }) => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<VectorSettings>(() => loadSettings());
  const [isSaved, setIsSaved] = useState(false);
  const onDevice = onDeviceModelAvailable();

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(settings);
    setIsSaved(true);
    toast('Settings saved locally', 'success');
    setTimeout(() => setIsSaved(false), 2000);
  };

  const update = (patch: Partial<VectorSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const handleClearData = () => {
    if (window.confirm('Clear all local analysis history?')) {
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
          Configure Vector analysis parameters, diagnostic engines, and local data persistence.
        </p>
      </div>

      {/* Appearance Section */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Palette className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Appearance & Theme</h2>
        </div>

        <p className="text-xs text-[#737A72]">
          Choose your interface theme. Both themes preserve Vector's primary teal, mustard-yellow risk accents, and high-contrast technical readability.
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
                <span className="text-[11px] text-[#737A72]">Warm ivory #F6F4EC canvas & teal typography</span>
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
                <span className="text-[11px] text-[#737A72]">Deep slate teal-black canvas & high contrast</span>
              </div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-[#49686C]" />}
          </label>
        </div>
      </div>

      {/* Analysis Engine Settings */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Cpu className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Analysis Engine Configuration</h2>
        </div>

        <div className="p-4 rounded-lg bg-[#F4F9F1] border border-[#CFE2C8] space-y-1.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#3E6B33]" />
            <span className="text-xs font-bold text-[#2D5A27]">
              Active Engine: Offline Rule-Based Analyzer
            </span>
          </div>
          <p className="text-xs text-[#283638] leading-relaxed pl-6">
            The core Vector analyzer operates locally and deterministically. It checks input infrastructure prompts against AWS security rules without transmitting prompts to external third-party services.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#FAFAF8] border border-[#E5E2D8]">
            <div className="pr-4">
              <span className="text-xs font-bold text-[#283638] block">Auto deep scan</span>
              <span className="text-[11px] text-[#737A72]">
                Run the LLM automatically when confidence or coverage is low, then merge with the rules.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.autoDeepScan}
              onChange={(e) => update({ autoDeepScan: e.target.checked })}
              className="h-4 w-4 accent-[#49686C]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#283638] block mb-1">
              Deep scan API key
            </label>
            <input
              type="password"
              placeholder="gsk_... (or an OpenAI-compatible key)"
              value={settings.apiKey}
              onChange={(e) => update({ apiKey: e.target.value })}
              autoComplete="off"
              className="w-full p-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs font-mono text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              <button type="button" onClick={() => update({ baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.8-flash' })} className="px-2.5 py-1 rounded border border-[#E5E2D8] bg-white text-[11px] font-semibold text-[#49686C] hover:bg-[#F6F4EC]">Gemini</button>
              <button type="button" onClick={() => update({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })} className="px-2.5 py-1 rounded border border-[#E5E2D8] bg-white text-[11px] font-semibold text-[#49686C] hover:bg-[#F6F4EC]">OpenAI</button>
              <button type="button" onClick={() => update({ baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' })} className="px-2.5 py-1 rounded border border-[#E5E2D8] bg-white text-[11px] font-semibold text-[#49686C] hover:bg-[#F6F4EC]">OpenRouter</button>
              <button type="button" onClick={() => update({ apiKey: DEFAULT_SETTINGS.apiKey, baseUrl: DEFAULT_SETTINGS.baseUrl, model: DEFAULT_SETTINGS.model })} className="px-2.5 py-1 rounded border border-[#E5E2D8] bg-white text-[11px] font-semibold text-[#49686C] hover:bg-[#F6F4EC]">Groq (test)</button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#283638] block mb-1">Base URL</label>
              <input type="text" value={settings.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })} className="w-full p-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs font-mono text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#283638] block mb-1">Model</label>
              <input type="text" value={settings.model} onChange={(e) => update({ model: e.target.value })} className="w-full p-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs font-mono text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-[#737A72]">
              {onDevice
                ? 'On-device model detected (no key needed).'
                : settings.apiKey
                ? 'Hosted key configured.'
                : 'Not configured — rules only.'}
            </span>
            <button type="submit" className="px-4 py-2 bg-[#49686C] text-white text-xs font-bold rounded-lg hover:bg-[#30494B] transition-colors">
              {isSaved ? 'Saved' : 'Save Engine Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Local Data Management */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
          <Database className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638]">Local Data & Storage</h2>
        </div>

        <p className="text-xs text-[#737A72]">
          All analysis history and prompts are stored locally within your browser's private web storage. No data is stored in remote databases.
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
          <h2 className="text-base font-bold text-[#283638]">About Vector</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#737A72] block">Application</span>
            <span className="font-bold text-[#283638]">Vector — AWS Infrastructure Prompt Security</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Version</span>
            <span className="font-mono font-bold text-[#283638]">v0.8.0</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Engine Type</span>
            <span className="font-bold text-[#283638]">Deterministic NLP Rule Evaluation</span>
          </div>
          <div>
            <span className="text-[#737A72] block">Execution Context</span>
            <span className="font-bold text-[#283638]">Rules run locally; deep scan is optional (on-device or your key)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
