import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { recordCriterionDecision } from '../services/requirements/approvals.ts';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { listRequirements } from '../services/documents/requirementDocuments.ts';
import { generateSuggestions } from '../services/requirements/suggestions.ts';
import { generateAcceptanceCriteria } from '../services/requirements/acceptance.ts';
import {
  ensureAcceptanceCriteria,
  listAcceptanceCriteria,
  loadSuggestions,
  saveSuggestions,
  updateAcceptanceStatus,
  updateSuggestionStatus,
} from '../services/requirements/acceptanceRepository.ts';
import type { RequirementRecord, RequirementSuggestion, AcceptanceCriterion } from '../types/requirements.ts';

type Tab = 'suggestions' | 'acceptance';

function statusClass(status: string): string {
  if (status === 'accepted' || status === 'approved') return 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]';
  if (status === 'rejected') return 'bg-[#FDF2F0] border-[#F0C4BF] text-[#B94D42]';
  if (status === 'modified') return 'bg-[#F6F4EC] border-[#E5E2D8] text-[#856C16]';
  return 'bg-[#FAFAF8] border-[#E5E2D8] text-[#737A72]';
}

export const RequirementReviewPage: React.FC = () => {
  const { user, localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RequirementSuggestion[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [tab, setTab] = useState<Tab>('suggestions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!currentProject || localMode) {
      setRequirements([]);
      setSuggestions([]);
      setCriteria([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const reqs = await listRequirements(currentProject.id);
      setRequirements(reqs);
      const codeMap = new Map(reqs.map((requirement) => [requirement.id, requirement.requirementCode]));
      const [savedSuggestions, savedCriteria] = await Promise.all([
        loadSuggestions(currentProject.id),
        listAcceptanceCriteria(currentProject.id, codeMap),
      ]);
      const nextSuggestions = savedSuggestions.length ? savedSuggestions : generateSuggestions(reqs, currentProject.id);
      if (!savedSuggestions.length && nextSuggestions.length) await saveSuggestions(currentProject.id, nextSuggestions);
      setSuggestions(nextSuggestions);

      const generatedCriteria = generateAcceptanceCriteria(reqs, currentProject.id);
      if (!savedCriteria.length && generatedCriteria.length) {
        await ensureAcceptanceCriteria(currentProject.id, generatedCriteria);
        setCriteria(generatedCriteria);
      } else {
        setCriteria(savedCriteria.length ? savedCriteria : generatedCriteria);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load review data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject, localMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingSuggestions = useMemo(() => suggestions.filter((suggestion) => suggestion.status === 'pending_review'), [suggestions]);
  const pendingCriteria = useMemo(() => criteria.filter((criterion) => criterion.status === 'pending_review'), [criteria]);

  const setSuggestionStatus = async (suggestion: RequirementSuggestion, status: RequirementSuggestion['status']) => {
    if (!currentProject) return;
    try {
      setSuggestions(await updateSuggestionStatus(currentProject.id, suggestions, suggestion.id, status));
    } catch (e: any) {
      toast(e?.message || 'Could not update suggestion.', 'error');
    }
  };

  const setCriterionStatus = async (criterion: AcceptanceCriterion, status: AcceptanceCriterion['status']) => {
    try {
      await updateAcceptanceStatus(criterion.id, status);
      if (user && currentProject && (status === 'approved' || status === 'rejected')) {
        await recordCriterionDecision(currentProject.id, criterion.id, user.id, status);
      }
      setCriteria((prev) => prev.map((item) => (item.id === criterion.id ? { ...item, status } : item)));
    } catch (e: any) {
      toast(e?.message || 'Could not update acceptance criterion.', 'error');
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
        <ClipboardCheck className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#283638]">Choose a project first</h1>
        <p className="text-xs text-[#737A72] mt-1">Suggestions and acceptance criteria are project-scoped.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Review & Acceptance</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">
            AI-inferred behaviours stay suggestions until you accept them. Acceptance criteria remain linked to their source requirement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {localMode && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs text-[#9C4A28]">
          Connect Supabase to persist suggestions and acceptance criteria.
        </div>
      )}
      {error && <div className="rounded-xl border border-[#F0C4BF] bg-[#FDF2F0] p-4 text-xs text-[#B94D42]">{error}</div>}

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#737A72]">Pending suggestions</div>
          <div className="text-2xl font-bold font-mono text-[#283638] mt-1">{pendingSuggestions.length}</div>
        </div>
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4">
          <div className="text-[11px] font-semibold text-[#737A72]">Pending criteria</div>
          <div className="text-2xl font-bold font-mono text-[#283638] mt-1">{pendingCriteria.length}</div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-[#F6F4EC] rounded-lg w-fit">
        {([
          ['suggestions', `Suggestions ${suggestions.length}`],
          ['acceptance', `Acceptance criteria ${criteria.length}`],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-2 rounded-md text-xs font-bold transition-colors ${
              tab === id ? 'bg-white text-[#283638] shadow-xs' : 'text-[#737A72] hover:text-[#283638]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {requirements.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center text-xs text-[#737A72]">
          Upload and compile a requirement document first.
        </div>
      ) : tab === 'suggestions' ? (
        <div className="space-y-3">
          <div className="bg-[#F6F4EC] border border-[#E5E2D8] rounded-xl p-3 text-xs text-[#737A72] flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#856C16] shrink-0 mt-0.5" />
            These are <b className="text-[#283638]">AI-inferred suggestions</b>, not confirmed company requirements. Accept, reject or modify them before generation.
          </div>
          {suggestions.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-8 text-center text-xs text-[#737A72]">No suggestions generated.</div>
          ) : (
            suggestions.map((suggestion) => (
              <article key={suggestion.id} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass(suggestion.status)}`}>
                    {suggestion.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-[#737A72]">
                    {suggestion.type === 'edge_case' ? 'Edge case' : 'Implicit behaviour'}
                  </span>
                  <span className="text-[10px] font-mono text-[#49686C]">{suggestion.requirementCode}</span>
                  <span className="ml-auto text-[10px] text-[#856C16]">AI-inferred</span>
                </div>
                <h3 className="text-sm font-bold text-[#283638] mt-2">{suggestion.title}</h3>
                <p className="text-xs text-[#283638] leading-relaxed mt-1">{suggestion.detail}</p>
                <p className="text-[11px] text-[#737A72] mt-2"><b className="text-[#49686C]">Clarify:</b> {suggestion.question}</p>
                <p className="text-[11px] text-[#737A72] mt-1"><b className="text-[#49686C]">Recommendation:</b> {suggestion.recommendation}</p>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => void setSuggestionStatus(suggestion, 'accepted')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F4F9F1] border border-[#CFE2C8] text-[11px] font-bold text-[#3E6B33]">
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button type="button" onClick={() => void setSuggestionStatus(suggestion, 'rejected')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FDF2F0] border border-[#F0C4BF] text-[11px] font-bold text-[#B94D42]">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {criteria.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-8 text-center text-xs text-[#737A72]">No acceptance criteria generated.</div>
          ) : (
            criteria.map((criterion) => (
              <article key={criterion.id} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusClass(criterion.status)}`}>
                    {criterion.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-[#49686C]">{criterion.requirementCode}</span>
                  <span className="ml-auto text-[10px] text-[#737A72]">{criterion.source.replace(/_/g, ' ')}</span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#283638] leading-relaxed">
                  <p><b className="text-[#49686C]">Given</b> {criterion.given}</p>
                  <p><b className="text-[#49686C]">When</b> {criterion.when}</p>
                  <p><b className="text-[#49686C]">Then</b> {criterion.then}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => void setCriterionStatus(criterion, 'approved')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F4F9F1] border border-[#CFE2C8] text-[11px] font-bold text-[#3E6B33]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button type="button" onClick={() => void setCriterionStatus(criterion, 'rejected')} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#FDF2F0] border border-[#F0C4BF] text-[11px] font-bold text-[#B94D42]">
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </div>
  );
};
