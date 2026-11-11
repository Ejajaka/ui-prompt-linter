import React, { useEffect, useRef, useState } from 'react';
import { Play, Sparkles, RotateCcw, ShieldCheck, AlertCircle, Info, X } from 'lucide-react';

interface PromptEditorProps {
  promptText: string;
  setPromptText: (text: string) => void;
  onAnalyze: (text: string) => void;
  isLoading: boolean;
  onDeepScan?: () => void;
  deepScanAvailable?: boolean;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  promptText,
  setPromptText,
  onAnalyze,
  isLoading,
  onDeepScan,
  deepScanAvailable = false
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeepScanModal, setShowDeepScanModal] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 110)}px`;
  }, [promptText]);

  const handleClear = () => {
    setPromptText('');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) {
      setErrorMessage('Please enter an AWS infrastructure prompt.');
      return;
    }
    setErrorMessage(null);
    onAnalyze(promptText);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <label htmlFor="prompt-input" className="text-base font-bold text-[#283638] block">
            Describe your AWS infrastructure
          </label>
          <span className="text-xs text-[#737A72]">
            Enter your natural-language AWS architecture requirements.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {promptText.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] rounded-md transition-colors"
              aria-label="Clear prompt text"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
          <span className="text-xs font-mono text-[#737A72] tabular-nums">
            {promptText.length} chars
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            id="prompt-input"
            ref={textareaRef}
            value={promptText}
            onChange={(e) => {
              setPromptText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="Example: Create an S3 bucket to store customer documents and deploy an EC2 instance running a web application behind an Application Load Balancer."
            rows={4}
            className="w-full overflow-hidden rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] p-3.5 text-sm text-[#283638] placeholder-[#737A72]/70 focus:bg-[#FFFFFF] focus:border-[#49686C] focus:ring-2 focus:ring-[#49686C]/10 focus:outline-none transition-colors resize-none min-h-[110px]"
          />
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-[#B94D42] bg-[#FDF2F0] p-2.5 rounded-lg border border-[#F0C4BF]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E5E2D8]">
          <div className="flex items-center gap-2 text-xs text-[#737A72]">
            <ShieldCheck className="w-4 h-4 text-[#49686C] shrink-0" />
            <span>Runs offline by default · Deterministic rule evaluation</span>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Deep Scan button (with unconfigured info modal) */}
            <button
              type="button"
              onClick={() => {
                if (deepScanAvailable && onDeepScan) onDeepScan();
                else setShowDeepScanModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E2D8] bg-[#FFFFFF] hover:bg-[#F6F4EC] text-xs font-semibold text-[#283638] transition-colors"
              title={
                deepScanAvailable
                  ? 'Re-run the neural analysis'
                  : 'Neural analysis is always used'
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D1B653]" />
              <span>Re-run Neural</span>
            </button>

            {/* Analyze Prompt button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-bold text-white transition-all shadow-xs ${
                isLoading
                  ? 'bg-[#49686C]/70 cursor-wait'
                  : 'bg-[#49686C] hover:bg-[#30494B] active:scale-[0.99]'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analysing infrastructure requirements...</span>
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
      </form>

      {/* Deep Scan Info Modal */}
      {showDeepScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#283638]/50 backdrop-blur-xs">
          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl max-w-md w-full p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#FEFCE8] text-[#D1B653]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#283638]">
                  Deep Scan Status
                </h3>
              </div>
              <button
                onClick={() => setShowDeepScanModal(false)}
                className="p-1 text-[#737A72] hover:text-[#283638] rounded"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-2.5 text-xs text-[#737A72] leading-relaxed">
              <p>
                <strong>Deep Scan is not configured.</strong>
              </p>
              <p>
                Add a Gemini/OpenAI-compatible API key in <strong>Settings</strong>, or use a browser with the built-in on-device model. Low-confidence analyses will then run the LLM automatically and merge its findings with the rules.
              </p>
              <p>
                The rule-based engine still works fully offline without it.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowDeepScanModal(false)}
                className="px-4 py-2 bg-[#49686C] text-white text-xs font-semibold rounded-lg hover:bg-[#30494B] transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
