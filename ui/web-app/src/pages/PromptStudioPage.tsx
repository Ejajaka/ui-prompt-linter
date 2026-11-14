import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clipboard,
  FileText,
  History,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { listRequirements } from '../services/documents/requirementDocuments.ts';
import { generateSuggestions } from '../services/requirements/suggestions.ts';
import { generateAcceptanceCriteria } from '../services/requirements/acceptance.ts';
import {
  listAcceptanceCriteria,
  loadSuggestions,
} from '../services/requirements/acceptanceRepository.ts';
import { generateProfessionalPrompt, selectBriefInputs } from '../services/generation/promptGenerator.ts';
import { compareVersions, listPromptVersions, savePromptVersion } from '../services/generation/promptVersions.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../types/designSystem.ts';
import { listDesignSystems } from '../services/generation/designSystems.ts';
import {
  MEMORY_KEYS,
  compareRequirementBaseline,
  snapshotRequirements,
  loadRequirementBaseline,
  saveRequirementBaseline,
} from '../services/generation/memory.ts';
import { loadProjectMemory, saveProjectMemory } from '../services/projectMemory.ts';
import { usePromptDraft } from '../hooks/usePromptDraft.ts';
import { analyzePromptCoverage, coverageLabel } from '../services/generation/promptCoverage.ts';
import type { AcceptanceCriterion, RequirementRecord, RequirementSuggestion } from '../types/requirements.ts';
import type { PromptVersionRecord } from '../types/prompt.ts';

export const PromptStudioPage: React.FC = () => {
  const { user, localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const { draft, setDraft, resetDraft } = usePromptDraft(currentProject?.id);
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RequirementSuggestion[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [versions, setVersions] = useState<PromptVersionRecord[]>([]);
  const [designSystems, setDesignSystems] = useState([DEFAULT_DESIGN_SYSTEM]);
  const [designSystemId, setDesignSystemId] = useState(DEFAULT_DESIGN_SYSTEM.id);
  const [baseline, setBaseline] = useState<Awaited<ReturnType<typeof loadRequirementBaseline>>>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!currentProject || localMode) {
      setRequirements([]);
      setSuggestions([]);
      setCriteria([]);
      setVersions([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const reqs = await listRequirements(currentProject.id);
      const codeMap = new Map(reqs.map((requirement) => [requirement.id, requirement.requirementCode]));
      const [savedSuggestions, savedCriteria, savedVersions, savedSystems, savedBaseline, savedDesignSystem] = await Promise.all([
        loadSuggestions(currentProject.id),
        listAcceptanceCriteria(currentProject.id, codeMap),
        listPromptVersions(currentProject.id),
        listDesignSystems(),
        loadRequirementBaseline(currentProject.id),
        loadProjectMemory<string>(currentProject.id, MEMORY_KEYS.designSystem, DEFAULT_DESIGN_SYSTEM.id),
      ]);
      setRequirements(reqs);
      setSuggestions(savedSuggestions.length ? savedSuggestions : generateSuggestions(reqs, currentProject.id));
      setCriteria(savedCriteria.length ? savedCriteria : generateAcceptanceCriteria(reqs, currentProject.id));
      setVersions(savedVersions);
      setDesignSystems([DEFAULT_DESIGN_SYSTEM, ...savedSystems.filter((system) => system.id !== DEFAULT_DESIGN_SYSTEM.id)]);
      setBaseline(savedBaseline);
      setDesignSystemId(savedDesignSystem || DEFAULT_DESIGN_SYSTEM.id);
      setSelectedVersion(savedVersions[0]?.id || null);
    } catch (e: any) {
      setError(e?.message || 'Could not load prompt data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject, localMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const designSystem = designSystems.find((system) => system.id === designSystemId) || DEFAULT_DESIGN_SYSTEM;
  const generated = useMemo(
    () =>
      generateProfessionalPrompt({
        projectName: currentProject?.name || 'Untitled project',
        requirements,
        suggestions,
        criteria,
        designSystem,
      }),
    [currentProject, requirements, suggestions, criteria, designSystem]
  );

  const regression = compareRequirementBaseline(baseline, requirements);
  const selected = versions.find((version) => version.id === selectedVersion) || versions[0] || null;
  const previous = selected ? versions.find((version) => version.version === selected.version - 1) : null;
  const comparison = previous && selected ? compareVersions(previous, selected) : null;
  const briefInputs = selectBriefInputs({
    projectName: currentProject?.name || 'Untitled project',
    requirements,
    suggestions,
    criteria,
    designSystem,
  });
  const sourceCounts = {
    approvedRequirements: briefInputs.approvedRequirements.length,
    totalRequirements: requirements.length,
    approvedCriteria: briefInputs.approvedCriteria.length,
    totalCriteria: criteria.length,
    acceptedSuggestions: briefInputs.acceptedSuggestions.length,
    totalSuggestions: suggestions.length,
    unresolvedSuggestions: briefInputs.unresolvedSuggestions.length,
  };

  useEffect(() => {
    if (!currentProject || localMode) return;
    void saveProjectMemory(currentProject.id, MEMORY_KEYS.designSystem, designSystemId).catch(() => undefined);
  }, [currentProject, localMode, designSystemId]);

  const handleBaseline = async () => {
    if (!currentProject || localMode) return;
    try {
      await saveRequirementBaseline(currentProject.id, requirements);
      setBaseline(snapshotRequirements(requirements));
      toast('Requirement baseline saved', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save baseline.', 'error');
    }
  };

  const displayedPrompt = draft ?? generated.prompt;
  const isEdited = draft !== null && draft !== generated.prompt;
  const coverage = analyzePromptCoverage(displayedPrompt, briefInputs.requirements, briefInputs.criteria);
  const coverageComplete =
    coverage.requirementsMet.length === coverage.requirementsTotal &&
    coverage.criteriaMet.length === coverage.criteriaTotal;
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(displayedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast('Prompt copied', 'success');
    } catch {
      toast('Could not copy prompt.', 'error');
    }
  };

  const handleSave = async () => {
    if (!currentProject || !user) return;
    setSaving(true);
    try {
      const specification = {
        ...generated.specification,
        edited: isEdited,
        coverage: {
          requirementsMet: coverage.requirementsMet.length,
          requirementsTotal: coverage.requirementsTotal,
          criteriaMet: coverage.criteriaMet.length,
          criteriaTotal: coverage.criteriaTotal,
        },
      };
      const saved = await savePromptVersion(currentProject.id, user.id, displayedPrompt, specification);
      setVersions((prev) => [saved, ...prev]);
      setSelectedVersion(saved.id);
      toast(`Saved prompt version ${saved.version}.`, 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save prompt version.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
        <FileText className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#283638]">Choose a project first</h1>
        <p className="text-xs text-[#737A72] mt-1">Specifications and prompt versions are project-scoped.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">UI Specification & Prompt</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">
            Generate a source-of-truth brief with the exact six-section professional prompt structure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Refresh
          </button>
          <button type="button" onClick={copyPrompt} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC]">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
            Copy prompt
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={saving || localMode} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold disabled:opacity-60">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save version
          </button>
        </div>
      </div>

      {localMode && <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs text-[#9C4A28]">Connect Supabase to save prompt versions and project memory.</div>}
      {error && <div className="rounded-xl border border-[#F0C4BF] bg-[#FDF2F0] p-4 text-xs text-[#B94D42]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#E5E2D8]">
            <Sparkles className="w-4 h-4 text-[#49686C]" />
            <h2 className="text-sm font-bold text-[#283638]">Generated prompt</h2>
            {isEdited && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#FED7AA] bg-[#FFF7ED] text-[#9C4A28]">
                Edited draft
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {isEdited && (
                <button type="button" onClick={() => void resetDraft()} className="text-[10px] font-bold text-[#49686C] hover:underline">
                  Reset to generated
                </button>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${isEdited ? (coverageComplete ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]' : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]') : generated.specification.status.startsWith('Ready') ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]' : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]'}`}>
                {isEdited ? (coverageComplete ? 'Edited · all covered' : 'Edited · items missing') : generated.specification.status}
              </span>
            </div>
          </div>
          <textarea
            value={displayedPrompt}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full min-h-[720px] resize-y p-5 bg-[#FAFAF8] text-[12px] leading-relaxed font-mono text-[#283638] focus:bg-white focus:outline-none"
            spellCheck={false}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4">
            <label className="block">
              <span className="text-xs font-bold text-[#283638] block mb-1">Design system</span>
              <select value={designSystemId} onChange={(event) => setDesignSystemId(event.target.value)} className="w-full px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]">
                {designSystems.map((system) => <option key={system.id} value={system.id}>{system.name}</option>)}
              </select>
            </label>
            <div className="flex items-center justify-between gap-2 mt-4">
              <h2 className="text-sm font-bold text-[#283638]">Source of truth</h2>
              <span className="text-[9px] font-bold uppercase tracking-wide text-[#737A72]">live from this project</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Requirements</span>
                <b className="font-mono">{sourceCounts.approvedRequirements} / {sourceCounts.totalRequirements}</b>
                <span className="block text-[9px] text-[#737A72] mt-0.5">approved · Requirement Compiler</span>
              </div>
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Criteria</span>
                <b className="font-mono">{sourceCounts.approvedCriteria} / {sourceCounts.totalCriteria}</b>
                <span className="block text-[9px] text-[#737A72] mt-0.5">approved · Review &amp; Acceptance</span>
              </div>
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Approved suggestions</span>
                <b className="font-mono">{sourceCounts.acceptedSuggestions} / {sourceCounts.totalSuggestions}</b>
                <span className="block text-[9px] text-[#737A72] mt-0.5">accepted · Review &amp; Acceptance</span>
              </div>
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Unresolved assumptions</span>
                <b className="font-mono">{sourceCounts.unresolvedSuggestions}</b>
                <span className="block text-[9px] text-[#737A72] mt-0.5">pending · Review &amp; Acceptance</span>
              </div>
            </div>
            <p className="text-[10px] text-[#737A72] mt-2 leading-relaxed">
              {briefInputs.isDraft
                ? 'No requirement has been approved yet, so the brief is a draft: pending requirements and criteria are included and marked as pending.'
                : `The prompt includes ${briefInputs.requirements.length} approved requirement(s) and ${briefInputs.criteria.length} approved criterion/criteria for ${currentProject?.name || 'this project'}; rejected and unapproved items are excluded.`}
              {!briefInputs.isDraft && sourceCounts.approvedCriteria === 0 && (
                <span className="block mt-1 text-[#856C16]">
                  No acceptance criteria are approved yet, so section 6 will state that explicitly.
                </span>
              )}
            </p>
            <p className="text-[10px] text-[#737A72] mt-1 leading-relaxed">
              Design Guidelines come from the selected design system: <b className="text-[#283638]">{designSystem.name}</b>.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#283638]">Coverage check</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${coverageComplete ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]' : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]'}`}>
                {coverageComplete ? 'Complete' : 'Needs review'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Requirements met</span>
                <b className="font-mono">{coverage.requirementsMet.length} / {coverage.requirementsTotal}</b>
              </div>
              <div className="bg-[#FAFAF8] border border-[#E5E2D8] rounded-lg p-2.5">
                <span className="text-[#737A72] block text-[10px]">Criteria covered</span>
                <b className="font-mono">{coverage.criteriaMet.length} / {coverage.criteriaTotal}</b>
              </div>
            </div>
            <p className={`text-[11px] mt-2 leading-relaxed ${coverageComplete ? 'text-[#737A72]' : 'text-[#856C16]'}`}>
              {coverageLabel(coverage)}
              {coverage.requirementsMissing.length > 0 && (
                <span className="block mt-1 font-mono text-[10px]">
                  Missing: {coverage.requirementsMissing.map((requirement) => requirement.requirementCode).join(', ')}
                </span>
              )}
            </p>
            <p className="text-[10px] text-[#737A72] mt-1">
              Measured against the approved requirements and criteria, from the text currently in the editor.
            </p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-[#283638]">Regression check</h2>
              <button type="button" onClick={() => void handleBaseline()} className="text-[10px] font-bold text-[#49686C] hover:underline">Save baseline</button>
            </div>
            <p className={`text-[11px] mt-2 leading-relaxed ${regression.removed.length || regression.changed.length ? 'text-[#B94D42]' : 'text-[#737A72]'}`}>{regression.summary}</p>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#49686C]" />
              <h2 className="text-sm font-bold text-[#283638]">Versions</h2>
            </div>
            {versions.length === 0 ? <p className="text-xs text-[#737A72] mt-2">No saved versions yet.</p> : (
              <div className="mt-3 space-y-2">
                {versions.map((version) => (
                  <button key={version.id} type="button" onClick={() => setSelectedVersion(version.id)} className={`w-full text-left rounded-lg border p-2.5 ${selected?.id === version.id ? 'border-[#49686C] bg-[#F0F5F5]' : 'border-[#E5E2D8] bg-[#FAFAF8]'}`}>
                    <div className="flex items-center justify-between gap-2"><b className="text-xs text-[#283638]">Version {version.version}</b><span className="text-[10px] text-[#737A72]">{new Date(version.createdAt).toLocaleDateString()}</span></div>
                    <p className="text-[10px] text-[#737A72] mt-1">{version.changeSummary || 'Saved prompt'}</p>
                    {selected?.id === version.id && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(event) => { event.stopPropagation(); setDraft(version.promptMarkdown); toast('Version loaded into the editor', 'info'); }}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.stopPropagation(); setDraft(version.promptMarkdown); } }}
                        className="inline-block mt-1 text-[10px] font-bold text-[#49686C] hover:underline"
                      >Restore version</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {comparison && (
              <div className="mt-3 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] p-2.5 text-[11px] text-[#737A72]">
                <b className="text-[#283638]">Compare v{selected!.version - 1} → v{selected!.version}</b>
                <p className="mt-1">{comparison.summary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
