import React from 'react';
import { ExternalLink, Info, Layers, ShieldCheck } from 'lucide-react';
import { ENGINE_EMBED_URL, ENGINE_URL } from '../config.ts';

interface NewAnalysisPageProps {
  initialResult?: unknown;
  onClearInitialResult?: () => void;
  onViewHistory?: () => void;
}

export const NewAnalysisPage: React.FC<NewAnalysisPageProps> = () => {
  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">
              New UI Prompt Analysis
            </h1>
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#E4EBDD] text-[#30494B] border border-[#CFE2C8]">
              UI/UX Prompt Analyzer
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#737A72]">
            The analysis panel below is the deployed Streamlit engine: Rules, BERT, LLM routing,
            clarification questions, risk scoring and the validated final prompt.
          </p>
        </div>

        <a
          href={ENGINE_EMBED_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors self-start sm:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5 text-[#49686C]" />
          <span>Open engine in a new tab</span>
        </a>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E2D8] shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#E5E2D8] bg-[#FAFAF8]">
          <div className="flex items-center gap-2 text-xs text-[#737A72]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B94D42]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D1B653]/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#688E5E]/70" />
            <span className="font-mono ml-2">prompt-linter-engine.streamlit.app</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-[#49686C] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Rules + BERT + LLM</span>
          </div>
        </div>
        <iframe
          src={ENGINE_EMBED_URL}
          title="UI Prompt Linter Streamlit engine"
          className="w-full bg-[#F6F4EC]"
          style={{ height: 'calc(100vh - 12rem)', minHeight: '820px' }}
          allow="clipboard-write; fullscreen"
        />
      </div>

      <div className="flex items-start gap-2.5 text-xs text-[#737A72] bg-[#F6F4EC] border border-[#E5E2D8] rounded-xl p-3.5">
        <Info className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The engine runs on Streamlit. If the panel is blank, open it directly at{' '}
          <a className="underline text-[#49686C]" href={ENGINE_URL} target="_blank" rel="noreferrer">
            {ENGINE_URL}
          </a>
          . The home, guidelines and settings pages in this UI are the same Vector design you
          already know.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2 rounded-xl border border-[#E5E2D8] bg-white p-3.5">
          <Layers className="w-4 h-4 text-[#49686C] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#283638]">Auto engine</div>
            <div className="text-[11px] text-[#737A72]">Rules, BERT or LLM chosen per prompt.</div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[#E5E2D8] bg-white p-3.5">
          <ShieldCheck className="w-4 h-4 text-[#3E6B33] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#283638]">Clarify first</div>
            <div className="text-[11px] text-[#737A72]">The final prompt waits for unclear details.</div>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-[#E5E2D8] bg-white p-3.5">
          <Info className="w-4 h-4 text-[#D1B653] shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-[#283638]">Risk scored</div>
            <div className="text-[11px] text-[#737A72]">Deterministic 0–100 before and after answers.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
