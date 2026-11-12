import React, { useState } from 'react';
import type { SecurityFinding } from '../../types/analysis.ts';
import { recordFeedback } from '../../services/feedbackStorage.ts';
import { SeverityBadge } from '../ui/RiskBadge.tsx';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  CheckSquare, 
  Square, 
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';

interface SecurityRequirementsListProps {
  prompt: string;
  missing: SecurityFinding[];
  mentioned: SecurityFinding[];
  riskyFindings: SecurityFinding[];
  selectedFindingIds: Set<string>;
  onToggleFinding: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export const SecurityRequirementsList: React.FC<SecurityRequirementsListProps> = ({
  prompt,
  missing,
  mentioned,
  riskyFindings,
  selectedFindingIds,
  onToggleFinding,
  onSelectAll,
  onClearAll
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'missing' | 'risky' | 'mentioned'>('missing');
  const [feedbackSaved, setFeedbackSaved] = useState<Record<string, string>>({});

  function saveFeedback(finding: SecurityFinding, verdict: 'helpful' | 'false_positive' | 'not_applicable') {
    recordFeedback(prompt, finding.id, finding.label, verdict);
    setFeedbackSaved(prev => ({ ...prev, [finding.id]: verdict }));
  }

  const totalEligibleCount = missing.length + riskyFindings.length;
  const selectedCount = selectedFindingIds.size;

  return (
    <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E2D8]">
        <div>
          <h3 className="text-base font-bold text-[#283638]">
            Security Requirements & Findings
          </h3>
          <p className="text-xs text-[#737A72]">
            Select recommended clauses to include in your updated infrastructure prompt.
          </p>
        </div>

        {totalEligibleCount > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onSelectAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#49686C] bg-[#F0F5F5] hover:bg-[#E2ECEE] rounded-md transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Select All ({totalEligibleCount})</span>
            </button>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#737A72] hover:text-[#283638] hover:bg-[#F6F4EC] rounded-md transition-colors"
              >
                <span>Clear</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Accessible Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#F6F4EC] border border-[#E5E2D8]" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'missing'}
          onClick={() => setActiveSubTab('missing')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeSubTab === 'missing'
              ? 'bg-[#FFFFFF] text-[#283638] shadow-xs'
              : 'text-[#737A72] hover:text-[#283638]'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-[#D1B653]" />
          <span>Missing Controls</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#FEFCE8] text-[#856C16] font-mono tabular-nums border border-[#FEF08A]">
            {missing.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'risky'}
          onClick={() => setActiveSubTab('risky')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeSubTab === 'risky'
              ? 'bg-[#FFFFFF] text-[#283638] shadow-xs'
              : 'text-[#737A72] hover:text-[#283638]'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#B94D42]" />
          <span>Risky Statements</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums border ${
            riskyFindings.length > 0
              ? 'bg-[#FDF2F0] text-[#B94D42] border-[#F0C4BF]'
              : 'bg-[#F6F4EC] text-[#737A72] border-[#E5E2D8]'
          }`}>
            {riskyFindings.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'mentioned'}
          onClick={() => setActiveSubTab('mentioned')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeSubTab === 'mentioned'
              ? 'bg-[#FFFFFF] text-[#283638] shadow-xs'
              : 'text-[#737A72] hover:text-[#283638]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#3E6B33]" />
          <span>Detected Controls</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#F4F9F1] text-[#3E6B33] font-mono tabular-nums border border-[#CFE2C8]">
            {mentioned.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      {/* 1. Missing Controls Tab */}
      {activeSubTab === 'missing' && (
        <div className="space-y-3">
          {missing.length === 0 ? (
            <div className="text-center py-8 text-[#737A72] text-xs">
              No missing security controls detected for this infrastructure prompt.
            </div>
          ) : (
            missing.map((finding) => {
              const isSelected = selectedFindingIds.has(finding.id);
              return (
                <div
                  key={finding.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[#49686C] bg-[#FBFDFC] shadow-xs'
                      : 'border-[#E5E2D8] bg-[#FFFFFF] hover:border-[#CDC9BC]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[#283638]">
                          {finding.label}
                        </h4>
                        <SeverityBadge severity={finding.severity} />
                        {finding.source === 'ai' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E4EBDD] text-[#30494B] border border-[#CFE2C8]">
                            AI
                          </span>
                        )}
                        {finding.explicitlyRisky && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F0] text-[#B94D42] border border-[#F0C4BF]">
                            Explicitly risky
                          </span>
                        )}
                        {finding.dimension && (
                          <span className="text-[11px] text-[#737A72] font-medium">
                            · {finding.dimension}
                          </span>
                        )}
                        {finding.appliesTo && finding.appliesTo.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#F6F4EC] text-[#49686C] font-mono border border-[#E5E2D8]">
                            {finding.appliesTo.join(', ')}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#283638] leading-relaxed">
                        {finding.description}
                      </p>

                      {finding.evidence && finding.evidence.length > 0 && (
                        <div className="text-[11px] text-[#737A72] bg-[#FAFAF8] p-2.5 rounded-lg border border-[#E5E2D8]">
                          <strong className="text-[#30494B]">Why it applies:</strong>{" "}
                          <span className="font-mono">“{finding.evidence.slice(0, 2).join('” · “')}”</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-[#737A72]">
                        {feedbackSaved[finding.id] ? (
                          <span>Feedback saved: {feedbackSaved[finding.id].replace('_', ' ')}</span>
                        ) : (
                          <>
                            <span>Useful?</span>
                            <button type="button" onClick={() => saveFeedback(finding, 'helpful')} className="px-1.5 py-0.5 rounded border border-[#CFE2C8] text-[#3E6B33] hover:bg-[#F4F9F1]">Yes</button>
                            <button type="button" onClick={() => saveFeedback(finding, 'false_positive')} className="px-1.5 py-0.5 rounded border border-[#F0C4BF] text-[#B94D42] hover:bg-[#FDF2F0]">False positive</button>
                            <button type="button" onClick={() => saveFeedback(finding, 'not_applicable')} className="px-1.5 py-0.5 rounded border border-[#E5E2D8] hover:bg-[#F6F4EC]">Not applicable</button>
                          </>
                        )}
                      </div>

                      {finding.whyItMatters && (
                        <div className="text-[11px] text-[#737A72] bg-[#FAFAF8] p-2.5 rounded-lg border border-[#E5E2D8]">
                          <strong className="text-[#30494B]">Why it matters:</strong> {finding.whyItMatters}
                        </div>
                      )}

                      {finding.clause && (
                        <div className="text-xs text-[#283638] bg-[#F6F4EC]/60 p-2.5 rounded-lg border border-[#E5E2D8] flex items-start gap-2">
                          <span className="font-semibold text-[#49686C] shrink-0">Remediation:</span>
                          <span className="font-mono text-[11px] text-[#30494B]">{finding.clause}</span>
                        </div>
                      )}
                    </div>

                    {/* Toggle / Add to prompt button */}
                    <button
                      type="button"
                      onClick={() => onToggleFinding(finding.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#49686C] text-white shadow-xs'
                          : 'bg-[#F6F4EC] text-[#283638] hover:bg-[#E5E2D8]'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Clause</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. Risky Statements Tab */}
      {activeSubTab === 'risky' && (
        <div className="space-y-3">
          {riskyFindings.length === 0 ? (
            <div className="text-center py-8 text-[#737A72] text-xs">
              No explicitly risky statements or critical misconfigurations detected.
            </div>
          ) : (
            riskyFindings.map((finding) => {
              const isSelected = selectedFindingIds.has(finding.id);
              return (
                <div
                  key={finding.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-[#B94D42] bg-[#FDF2F0]/80 shadow-xs'
                      : 'border-[#F0C4BF] bg-[#FDF2F0]/40 hover:bg-[#FDF2F0]/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 rounded bg-[#B94D42] text-white">
                          <ShieldAlert className="w-3.5 h-3.5" />
                        </span>
                        <h4 className="text-sm font-bold text-[#B94D42]">
                          {finding.label}
                        </h4>
                        <SeverityBadge severity={finding.severity} />
                        {finding.source === 'ai' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E4EBDD] text-[#30494B] border border-[#CFE2C8]">
                            AI
                          </span>
                        )}
                        {finding.explicitlyRisky && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FDF2F0] text-[#B94D42] border border-[#F0C4BF]">
                            Explicitly risky
                          </span>
                        )}
                        {finding.appliesTo && (
                          <span className="text-[11px] text-[#737A72]">
                            · {finding.appliesTo.join(', ')}
                          </span>
                        )}
                      </div>

                      {finding.riskyStatement && (
                        <div className="p-2 rounded bg-white border border-[#F0C4BF] text-xs font-mono text-[#B94D42]">
                          <strong>Detected in prompt:</strong> &ldquo;{finding.riskyStatement}&rdquo;
                        </div>
                      )}

                      <p className="text-xs text-[#283638] leading-relaxed">
                        {finding.description}
                      </p>

                      {finding.evidence && finding.evidence.length > 0 && (
                        <div className="text-[11px] text-[#737A72] bg-white/70 p-2 rounded border border-[#E5E2D8]">
                          <strong className="text-[#B94D42]">Evidence in prompt:</strong>{" "}
                          <span className="font-mono">“{finding.evidence.slice(0, 2).join('” · “')}”</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[10px] text-[#737A72]">
                        {feedbackSaved[finding.id] ? (
                          <span>Feedback saved: {feedbackSaved[finding.id].replace('_', ' ')}</span>
                        ) : (
                          <>
                            <span>Useful?</span>
                            <button type="button" onClick={() => saveFeedback(finding, 'helpful')} className="px-1.5 py-0.5 rounded border border-[#CFE2C8] text-[#3E6B33] hover:bg-[#F4F9F1]">Yes</button>
                            <button type="button" onClick={() => saveFeedback(finding, 'false_positive')} className="px-1.5 py-0.5 rounded border border-[#F0C4BF] text-[#B94D42] hover:bg-[#FDF2F0]">False positive</button>
                            <button type="button" onClick={() => saveFeedback(finding, 'not_applicable')} className="px-1.5 py-0.5 rounded border border-[#E5E2D8] hover:bg-[#F6F4EC]">Not applicable</button>
                          </>
                        )}
                      </div>

                      {finding.whyItMatters && (
                        <div className="text-[11px] text-[#737A72] bg-white/70 p-2 rounded border border-[#E5E2D8]">
                          <strong className="text-[#B94D42]">Security Impact:</strong> {finding.whyItMatters}
                        </div>
                      )}

                      {finding.clause && (
                        <div className="text-xs text-[#283638] bg-white p-2.5 rounded-lg border border-[#E5E2D8] flex items-start gap-2">
                          <span className="font-semibold text-[#49686C] shrink-0">Remediation:</span>
                          <span className="font-mono text-[11px] text-[#30494B]">{finding.clause}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFinding(finding.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#B94D42] text-white shadow-xs'
                          : 'bg-white text-[#B94D42] border border-[#F0C4BF] hover:bg-[#FDF2F0]'
                      }`}
                      aria-pressed={isSelected}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Remediation Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Remediation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 3. Detected Controls Tab */}
      {activeSubTab === 'mentioned' && (
        <div className="space-y-3">
          {mentioned.length === 0 ? (
            <div className="text-center py-8 text-[#737A72] text-xs">
              No existing baseline security controls detected in original prompt.
            </div>
          ) : (
            mentioned.map((finding) => (
              <div
                key={finding.id}
                className="p-4 rounded-xl border border-[#CFE2C8] bg-[#F4F9F1] space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3E6B33] shrink-0" />
                  <h4 className="text-sm font-bold text-[#2D5A27]">
                    {finding.label}
                  </h4>
                  {finding.dimension && (
                    <span className="text-[11px] text-[#737A72]">
                      · {finding.dimension}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#283638] leading-relaxed pl-6">
                  {finding.description}
                </p>
                {finding.evidence && finding.evidence.length > 0 && (
                  <p className="text-[10px] text-[#737A72] font-mono block pl-6">
                    Evidence: “{finding.evidence.slice(0, 2).join('” · “')}”
                  </p>
                )}
                <span className="text-[10px] text-[#737A72] block pl-6">
                  Found in prompt specification · Does not imply the complete architecture is fully hardened.
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
