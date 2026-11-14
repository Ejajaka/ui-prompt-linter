import React from 'react';
import {
  Palette,
  Info,
  Database,
  Check,
  ShieldCheck,
  Trash2,
  Sun,
  Moon,
  ExternalLink,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { historyStorage } from '../services/historyStorage.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface SettingsPageProps {
  onRefreshData?: () => void;
  onOpenManual?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshData, onOpenManual }) => {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleClearData = () => {
    if (window.confirm('Clear the prompt-analysis history stored in this browser? Cloud projects are not affected.')) {
      historyStorage.clear();
      if (onRefreshData) onRefreshData();
      toast('Local analysis history cleared', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#283638] dark:text-[#E7E4D9] tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#737A72] dark:text-[#8E9A93] mt-1">
          Appearance, help and local data for Vector.
        </p>
      </div>

      {/* Appearance */}
      <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8] dark:border-[#29383A]">
          <Palette className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Appearance</h2>
        </div>

        <p className="text-xs text-[#737A72] dark:text-[#8E9A93]">
          Choose your interface theme. Both themes keep Vector&apos;s teal and mustard accents with
          high-contrast readability.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            theme === 'light'
              ? 'border-[#49686C] bg-[#F0F5F5] ring-1 ring-[#49686C]'
              : 'border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] hover:bg-white dark:hover:bg-[#222E30]'
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
                <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block">Vector Classic</span>
                <span className="text-[11px] text-[#737A72] dark:text-[#8E9A93]">Warm ivory canvas</span>
              </div>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-[#49686C]" />}
          </label>

          <label className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            theme === 'dark'
              ? 'border-[#49686C] bg-[#F0F5F5] ring-1 ring-[#49686C]'
              : 'border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] hover:bg-white dark:hover:bg-[#222E30]'
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
                <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block">Vector Obsidian</span>
                <span className="text-[11px] text-[#737A72] dark:text-[#8E9A93]">Deep slate, high contrast</span>
              </div>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-[#49686C]" />}
          </label>
        </div>
      </div>

      {/* Manual */}
      <button
        type="button"
        onClick={onOpenManual}
        className="w-full text-left bg-[#FFFFFF] dark:bg-[#1B2426] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs hover:border-[#49686C] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F0F5F5] dark:bg-[#222E30] text-[#49686C] dark:text-[#B9D1D4] flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Vector manual</h2>
            <p className="text-xs text-[#737A72] dark:text-[#8E9A93] mt-1 leading-relaxed">
              Every workflow in one place: projects, requirement review, specifications, design
              systems, workspaces and analysis.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#737A72] mt-2 shrink-0" />
        </div>
      </button>

      {/* Local data */}
      <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8] dark:border-[#29383A]">
          <Database className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Local data</h2>
        </div>

        <p className="text-xs text-[#737A72] dark:text-[#8E9A93] leading-relaxed">
          Projects, documents, requirements and prompts are stored in your workspace. Prompt-analysis
          history is cached in this browser so it opens instantly; clearing it here does not delete
          any project data.
        </p>

        <button
          type="button"
          onClick={handleClearData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#F0C4BF] bg-white dark:bg-[#141C1D] hover:bg-[#FDF2F0] dark:hover:bg-[#3A2523] text-xs font-semibold text-[#B94D42] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear local analysis history
        </button>
      </div>

      {/* Privacy */}
      <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8] dark:border-[#29383A]">
          <ShieldCheck className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">Privacy</h2>
        </div>
        <p className="text-xs text-[#737A72] dark:text-[#8E9A93] leading-relaxed">
          Your projects and documents are private to your account. Read the full data policy
          for details.
        </p>
        <a
          href="./privacy-policy.html"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#49686C] hover:text-[#30494B]"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Privacy policy
        </a>
      </div>

      {/* About */}
      <div className="bg-[#FFFFFF] dark:bg-[#1B2426] p-5 sm:p-6 rounded-xl border border-[#E5E2D8] dark:border-[#29383A] shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8] dark:border-[#29383A]">
          <Info className="w-4 h-4 text-[#49686C]" />
          <h2 className="text-base font-bold text-[#283638] dark:text-[#E7E4D9]">About Vector</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[#737A72] dark:text-[#8E9A93] block">Application</span>
            <span className="font-bold text-[#283638] dark:text-[#E7E4D9]">Vector — UI/UX Requirement Engineering</span>
          </div>
          <div>
            <span className="text-[#737A72] dark:text-[#8E9A93] block">Version</span>
            <span className="font-mono font-bold text-[#283638] dark:text-[#E7E4D9]">v2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
