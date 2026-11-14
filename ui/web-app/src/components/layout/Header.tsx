import React, { useState } from 'react';
import { Menu, ShieldCheck, Settings, Info, Sun, Moon } from 'lucide-react';
import type { ActiveTab } from '../../types/analysis.ts';
import { useTheme } from '../../context/ThemeContext.tsx';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileMenu
}) => {
  const { theme, toggleTheme } = useTheme();
  const [showTooltip, setShowTooltip] = useState(false);

  const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
    about: {
      title: 'About Vector',
      subtitle: 'UI/UX Prompt Review'
    },
    overview: {
      title: 'Prompt Diagnosis Overview',
      subtitle: 'Dashboard'
    },
    'new-analysis': {
      title: 'New UI Prompt Analysis',
      subtitle: 'UI/UX Prompt Analyzer'
    },
    history: {
      title: 'Analysis History',
      subtitle: 'Past Evaluations'
    },
    guidelines: {
      title: 'Prompt Guidelines',
      subtitle: 'Completeness Baseline'
    },
    settings: {
      title: 'System Settings',
      subtitle: 'Preferences & Engine'
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Data & Processing'
    }
  };

  const current = titles[activeTab] || titles.overview;

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E2D8] px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left Zone: Hamburger & Breadcrumb Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-[#283638] hover:bg-[#F6F4EC] rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-sm text-[#737A72]">
          <span className="font-semibold text-[#283638] text-base sm:text-lg tracking-tight">
            {current.title}
          </span>
          <span className="hidden sm:inline-block text-[#CDC9BC]" aria-hidden="true">/</span>
          <span className="hidden sm:inline-block text-xs font-medium text-[#737A72]">
            {current.subtitle}
          </span>
        </div>
      </div>

      {/* Right Zone: Status Indicator, Context, and Settings */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Context Label */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F6F4EC] border border-[#E5E2D8] text-xs font-medium text-[#49686C]">
          <span>UI</span>
          <span className="text-[#CDC9BC]">/</span>
          <span>UX Prompt Review</span>
        </div>

        {/* Rule-based analysis status badge with accessible tooltip */}
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F4F9F1] border border-[#CFE2C8] text-[#3E6B33] text-xs font-medium hover:bg-[#EAF3E5] transition-colors cursor-help"
            aria-label="Hybrid UI prompt engine status info"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3E6B33]" />
            <span className="hidden sm:inline">Rules + BERT + LLM</span>
            <span className="sm:hidden">Hybrid</span>
            <Info className="w-3 h-3 text-[#688E5E] ml-0.5 opacity-80" />
          </button>

          {showTooltip && (
            <div
              role="tooltip"
              className="absolute right-0 top-full mt-2 w-64 p-2.5 bg-[#283638] text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none transition-all"
            >
              <p className="font-semibold text-[#D1B653] mb-1">Hybrid UI Prompt Engine</p>
              <p className="text-gray-200 leading-relaxed text-[11px]">
                The engine combines a deterministic rule baseline, a fine-tuned DistilBERT tagger and an optional grounded LLM. The active backend is chosen per prompt.
              </p>
            </div>
          )}
        </div>

        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] transition-colors cursor-pointer"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-[#D1B653]" />
          ) : (
            <Moon className="w-4 h-4 text-[#49686C]" />
          )}
        </button>

        {/* Quick Settings trigger */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-2 rounded-lg text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] transition-colors ${
            activeTab === 'settings' ? 'bg-[#F6F4EC] text-[#283638]' : ''
          }`}
          aria-label="Open settings"
          title="Open settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
