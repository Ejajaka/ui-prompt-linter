import React, { useEffect, useRef, useState } from 'react';
import { Copy, Check, RotateCcw, Play, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useToast } from '../ui/Toast.tsx';

interface ImprovedPromptPanelProps {
  originalPrompt: string;
  improvedPrompt: string;
  selectedCount: number;
  onResetPrompt: () => void;
  onReanalyze: (prompt: string) => void;
  isReanalyzing: boolean;
  spellingFixes?: Array<{ from: string; to: string }>;
  onUpdateManualPrompt?: (text: string) => void;
}

export const ImprovedPromptPanel: React.FC<ImprovedPromptPanelProps> = ({
  originalPrompt,
  improvedPrompt,
  selectedCount,
  onResetPrompt,
  onReanalyze,
  isReanalyzing,
  spellingFixes,
  onUpdateManualPrompt
}) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [manualText, setManualText] = useState(improvedPrompt);
  const manualTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync manualText when improvedPrompt updates from clause selections
  useEffect(() => {
    setManualText(improvedPrompt);
  }, [improvedPrompt]);

  useEffect(() => {
    const textarea = manualTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 180)}px`;
  }, [manualText, isEditing]);

  const activeDisplayText = isEditing ? manualText : improvedPrompt;

  const handleCopy = async () => {
    let succeeded = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(activeDisplayText);
        succeeded = true;
      }
    } catch {
      // In sandbox/iframe without direct clipboard permission, fall through to textarea execCommand
    }

    if (!succeeded) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = activeDisplayText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        succeeded = false;
      }
    }

    if (succeeded) {
      setCopied(true);
      toast('Improved prompt copied', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast('Please highlight and copy the improved text directly.', 'info');
    }
  };

  const handleReanalyzeClick = () => {
    onReanalyze(activeDisplayText);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-4 sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#283638]">
              Improved Prompt
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#F0F5F5] text-[#49686C] border border-[#CFDFE1]">
              {selectedCount} {selectedCount === 1 ? 'clause' : 'clauses'} appended
            </span>
          </div>
          <p className="text-xs text-[#737A72] mt-0.5">
            Accepted security clauses appended to your original infrastructure brief.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              isEditing
                ? 'bg-[#49686C] text-white'
                : 'text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC]'
            }`}
            title={isEditing ? 'View formatted output' : 'Edit text directly'}
            aria-label="Toggle direct prompt editing"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onResetPrompt}
            className="p-1.5 text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] rounded-md transition-colors"
            title="Reset to original prompt"
            aria-label="Reset to original prompt"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {spellingFixes && spellingFixes.length > 0 && (
        <div className="text-[11px] text-[#3E6B33] bg-[#F0F5F0] p-2.5 rounded-lg border border-[#CFE1CF] leading-relaxed">
          Spelling corrected:{" "}
          {spellingFixes.slice(0, 6).map((t) => `${t.from} → ${t.to}`).join(", ")}
          {spellingFixes.length > 6 ? ` (+${spellingFixes.length - 6} more)` : ""}
        </div>
      )}

      {/* Editor / Preview Body */}
      <div className="relative">
        {isEditing ? (
          <textarea
            ref={manualTextareaRef}
            value={manualText}
            onChange={(e) => {
              setManualText(e.target.value);
              if (onUpdateManualPrompt) onUpdateManualPrompt(e.target.value);
            }}
            rows={10}
            className="w-full overflow-hidden rounded-lg border border-[#49686C] bg-[#FFFFFF] p-3.5 text-xs font-mono text-[#283638] focus:outline-none focus:ring-1 focus:ring-[#49686C] leading-relaxed resize-none min-h-[180px]"
          />
        ) : (
          <div className="rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] p-3.5 max-h-[360px] overflow-y-auto text-xs font-mono text-[#283638] leading-relaxed whitespace-pre-wrap select-all">
            {activeDisplayText}
          </div>
        )}
      </div>

      {selectedCount === 0 && (
        <div className="text-[11px] text-[#737A72] bg-[#F6F4EC] p-2.5 rounded-lg border border-[#E5E2D8]">
          Select one or more recommendations on the left to append security requirements.
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
        <button
          type="button"
          onClick={handleCopy}
          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FFFFFF] hover:bg-[#F6F4EC] text-xs font-bold text-[#283638] transition-colors shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#3E6B33]" />
              <span className="text-[#3E6B33]">Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#49686C]" />
              <span>Copy Improved Prompt</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleReanalyzeClick}
          disabled={isReanalyzing || selectedCount === 0}
          className={`w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold text-white transition-all shadow-xs ${
            isReanalyzing || selectedCount === 0
              ? 'bg-[#49686C]/50 cursor-not-allowed'
              : 'bg-[#49686C] hover:bg-[#30494B] active:scale-[0.99]'
          }`}
          title={selectedCount === 0 ? 'Select clauses first' : 'Re-evaluate updated prompt'}
        >
          {isReanalyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Re-evaluating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Re-analyze Improved Prompt</span>
            </>
          )}
        </button>
      </div>

      <div className="text-[10px] text-[#737A72] text-center pt-1">
        Ready to paste into Terraform, AWS CDK, or code generation tool.
      </div>
    </div>
  );
};
