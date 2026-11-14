import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { listRequirements } from '../services/documents/requirementDocuments.ts';
import { generateSuggestions } from '../services/requirements/suggestions.ts';
import { generateAcceptanceCriteria } from '../services/requirements/acceptance.ts';
import { listAcceptanceCriteria, loadSuggestions } from '../services/requirements/acceptanceRepository.ts';
import { generateProfessionalPrompt, selectBriefInputs } from '../services/generation/promptGenerator.ts';
import { loadProjectMemory, saveProjectMemory } from '../services/projectMemory.ts';
import { MEMORY_KEYS } from '../services/generation/memory.ts';
import { listDesignSystems } from '../services/generation/designSystems.ts';
import { analyzePromptCoverage } from '../services/generation/promptCoverage.ts';
import { usePromptDraft } from '../hooks/usePromptDraft.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../types/designSystem.ts';
import type { AcceptanceCriterion, RequirementRecord, RequirementSuggestion } from '../types/requirements.ts';

function isPublishedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname;
  } catch {
    return false;
  }
}

export const WorkspacePage: React.FC = () => {
  const { localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const splitRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(55);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [suggestions, setSuggestions] = useState<RequirementSuggestion[]>([]);
  const [criteria, setCriteria] = useState<AcceptanceCriterion[]>([]);
  const [designSystems, setDesignSystems] = useState([DEFAULT_DESIGN_SYSTEM]);
  const [designSystemId, setDesignSystemId] = useState(DEFAULT_DESIGN_SYSTEM.id);
  const { draft, setDraft, resetDraft } = usePromptDraft(currentProject?.id);
  const [publishedUrl, setPublishedUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [rightTab, setRightTab] = useState<'builder' | 'live'>('builder');

  const load = useCallback(async () => {
    if (!currentProject || localMode) {
      setRequirements([]);
      setSuggestions([]);
      setCriteria([]);
      return;
    }
    setLoading(true);
    try {
      const reqs = await listRequirements(currentProject.id);
      const codeMap = new Map(reqs.map((requirement) => [requirement.id, requirement.requirementCode]));
      const [savedSuggestions, savedCriteria, savedUrl, savedSystems, savedDesignSystem] = await Promise.all([
        loadSuggestions(currentProject.id),
        listAcceptanceCriteria(currentProject.id, codeMap),
        loadProjectMemory<string>(currentProject.id, MEMORY_KEYS.publishedUrl, ''),
        listDesignSystems(),
        loadProjectMemory<string>(currentProject.id, MEMORY_KEYS.designSystem, DEFAULT_DESIGN_SYSTEM.id),
      ]);
      setRequirements(reqs);
      setSuggestions(savedSuggestions.length ? savedSuggestions : generateSuggestions(reqs, currentProject.id));
      setCriteria(savedCriteria.length ? savedCriteria : generateAcceptanceCriteria(reqs, currentProject.id));
      setDesignSystems([DEFAULT_DESIGN_SYSTEM, ...savedSystems.filter((system) => system.id !== DEFAULT_DESIGN_SYSTEM.id)]);
      setDesignSystemId(savedDesignSystem || DEFAULT_DESIGN_SYSTEM.id);
      setPublishedUrl(savedUrl || '');
      setDraftUrl(savedUrl || '');
    } catch (e: any) {
      toast(e?.message || 'Could not load workspace.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentProject, localMode, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const designSystem = designSystems.find((system) => system.id === designSystemId) || DEFAULT_DESIGN_SYSTEM;
  const generated = useMemo(
    () => generateProfessionalPrompt({
      projectName: currentProject?.name || 'Untitled project',
      requirements,
      suggestions,
      criteria,
      designSystem,
    }),
    [currentProject, requirements, suggestions, criteria, designSystem]
  );
  const briefInputs = selectBriefInputs({
    projectName: currentProject?.name || 'Untitled project',
    requirements,
    suggestions,
    criteria,
    designSystem,
  });
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

  const sendToBase44 = async () => {
    let copied = false;
    try {
      await navigator.clipboard.writeText(displayedPrompt);
      copied = true;
    } catch {
      // Clipboard may be blocked; the user can still copy from the editor.
    }
    setRightTab('builder');
    setRightCollapsed(false);
    window.open('https://app.base44.com', '_blank', 'noopener,noreferrer');
    toast(
      copied
        ? 'Brief copied. Paste it into the Base44 builder, then press Build.'
        : 'Base44 opened. Use Copy to place the brief on your clipboard.',
      copied ? 'info' : 'error',
    );
  };

  const pastePreviewUrl = async () => {
    try {
      const value = (await navigator.clipboard.readText()).trim();
      if (!value) {
        toast('Clipboard is empty.', 'error');
        return;
      }
      if (!isPublishedUrl(value)) {
        toast('The clipboard does not contain a valid https app URL.', 'error');
        return;
      }
      setDraftUrl(value);
      toast('Published URL pasted. Select Save preview to load it.', 'success');
    } catch {
      toast('Could not read the clipboard. Paste the URL manually.', 'error');
    }
  };

  const saveUrl = async () => {
    if (!currentProject || localMode) return;
    const value = draftUrl.trim();
    if (value && !isPublishedUrl(value)) {
      toast('Enter the published app URL from Base44, for example https://your-app.base44.app.', 'error');
      return;
    }
    try {
      await saveProjectMemory(currentProject.id, MEMORY_KEYS.publishedUrl, value);
      setPublishedUrl(value);
      setShowPreview(true);
      toast(value ? 'Published app URL saved' : 'Published app URL cleared', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save the published URL.', 'error');
    }
  };

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const move = (pointer: PointerEvent) => {
      const percent = ((pointer.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.max(30, Math.min(75, percent)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
        <Monitor className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#283638]">Choose a project first</h1>
        <p className="text-xs text-[#737A72] mt-1">The workspace is project-scoped.</p>
      </div>
    );
  }

  const previewAllowed = isPublishedUrl(publishedUrl);

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Vector × Base44 Workspace</h1>
          <p className="text-xs text-[#737A72] mt-1">Refine the brief on the left, build in Base44 on the right, then preview the published app.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#737A72]" />}
          <button type="button" onClick={() => setLeftCollapsed((value) => !value)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2D8] bg-white text-[11px] font-bold text-[#49686C]">
            {leftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {leftCollapsed ? 'Show prompt' : 'Hide prompt'}
          </button>
          <button type="button" onClick={() => setRightCollapsed((value) => !value)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2D8] bg-white text-[11px] font-bold text-[#49686C]">
            {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {rightCollapsed ? 'Show Base44' : 'Hide Base44'}
          </button>
        </div>
      </div>

      <div ref={splitRef} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs overflow-hidden min-h-[720px] flex">
        {!leftCollapsed && (
          <section className="min-w-0 flex flex-col" style={{ width: rightCollapsed ? '100%' : `${split}%` }}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#E5E2D8] bg-[#FAFAF8]">
              <div className="text-xs font-bold text-[#283638]">Vector Prompt Analyser</div>
              {isEdited && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#FED7AA] bg-[#FFF7ED] text-[#9C4A28]">
                  Edited draft
                </span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${(isEdited ? coverageComplete : generated.specification.status.startsWith('Ready')) ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]' : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]'}`}>
                {isEdited ? (coverageComplete ? 'Edited · all covered' : 'Edited · items missing') : generated.specification.status}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {isEdited && (
                  <button type="button" onClick={() => void resetDraft()} className="text-[10px] font-bold text-[#49686C] hover:underline">
                    Reset
                  </button>
                )}
                <button type="button" onClick={copyPrompt} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E5E2D8] bg-white text-[10px] font-bold text-[#49686C]">
                  {copied ? 'Copied' : <><Clipboard className="w-3 h-3" /> Copy</>}
                </button>
                <button type="button" onClick={() => void sendToBase44()} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#49686C] text-white text-[10px] font-bold">
                  <Send className="w-3 h-3" /> Send to Base44
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#E5E2D8] text-[10px]">
              <div className={`rounded-md border p-2 ${coverage.requirementsMet.length === coverage.requirementsTotal ? 'bg-[#FAFAF8] border-[#E5E2D8]' : 'bg-[#FEFCE8] border-[#FEF08A]'}`}>
                <span className="text-[#737A72] block">Requirements met</span>
                <b className="font-mono">{coverage.requirementsMet.length} / {coverage.requirementsTotal}</b>
              </div>
              <div className={`rounded-md border p-2 ${coverage.criteriaMet.length === coverage.criteriaTotal ? 'bg-[#FAFAF8] border-[#E5E2D8]' : 'bg-[#FEFCE8] border-[#FEF08A]'}`}>
                <span className="text-[#737A72] block">Criteria covered</span>
                <b className="font-mono">{coverage.criteriaMet.length} / {coverage.criteriaTotal}</b>
              </div>
              <div className="rounded-md bg-[#FAFAF8] border border-[#E5E2D8] p-2"><span className="text-[#737A72] block">Unresolved</span><b className="font-mono">{generated.specification.unresolvedSuggestionIds.length}</b></div>
            </div>
            {coverage.requirementsMissing.length > 0 && (
              <div className="px-3 py-2 border-b border-[#FEF08A] bg-[#FEFCE8] text-[10px] text-[#856C16] font-mono">
                Missing: {coverage.requirementsMissing.map((requirement) => requirement.requirementCode).join(', ')}
              </div>
            )}
            <textarea
              value={displayedPrompt}
              onChange={(event) => setDraft(event.target.value)}
              className="flex-1 w-full min-h-[560px] resize-none p-4 bg-[#FFFFFF] text-[11px] leading-relaxed font-mono text-[#283638] focus:bg-[#FAFAF8] focus:outline-none"
              spellCheck={false}
            />
          </section>
        )}

        {!leftCollapsed && !rightCollapsed && (
          <div role="separator" aria-orientation="vertical" aria-label="Resize workspace panels" onPointerDown={startResize} className="w-1.5 shrink-0 bg-[#E5E2D8] hover:bg-[#49686C] cursor-col-resize flex items-center justify-center">
            <ArrowLeftRight className="w-3 h-3 text-[#737A72]" />
          </div>
        )}

        {!rightCollapsed && (
          <section className="min-w-0 flex-1 flex flex-col bg-[#F6F4EC]" style={{ width: leftCollapsed ? '100%' : `${100 - split}%` }}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#E5E2D8] bg-[#FFFFFF]">
              <div className="flex p-0.5 rounded-lg bg-[#F6F4EC] border border-[#E5E2D8]">
                <button
                  type="button"
                  onClick={() => setRightTab('builder')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${rightTab === 'builder' ? 'bg-white text-[#283638] shadow-xs' : 'text-[#737A72] hover:text-[#283638]'}`}
                >
                  Base44 builder
                </button>
                <button
                  type="button"
                  onClick={() => setRightTab('live')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors ${rightTab === 'live' ? 'bg-white text-[#283638] shadow-xs' : 'text-[#737A72] hover:text-[#283638]'}`}
                >
                  Live app
                </button>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <a href="https://app.base44.com" target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-[#49686C] hover:bg-[#F6F4EC]" aria-label="Open Base44">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {rightTab === 'builder' ? (
              <div className="flex-1 flex flex-col">
                <div className="px-3 py-2 border-b border-[#E5E2D8] bg-[#FAFAF8] flex flex-wrap items-center gap-2 text-[10px] text-[#737A72]">
                  <span>Sign in inside this panel. If Base44 blocks framing or sign-in, open it in a new tab.</span>
                  <button
                    type="button"
                    onClick={() => window.open('https://app.base44.com', '_blank', 'noopener,noreferrer')}
                    className="ml-auto font-bold text-[#49686C] hover:underline"
                  >
                    Open Base44
                  </button>
                </div>
                <iframe
                  src="https://app.base44.com"
                  title="Base44 app builder"
                  className="flex-1 w-full min-h-[600px] bg-white"
                  allow="clipboard-read; clipboard-write; fullscreen; popups"
                />
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-[#E5E2D8] bg-[#FFFFFF] flex flex-col sm:flex-row gap-2">
                  <input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://your-app.base44.app" className="flex-1 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
                  <button type="button" onClick={() => void pastePreviewUrl()} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC]">
                    <Clipboard className="w-3.5 h-3.5" />
                    Paste URL
                  </button>
                  <button type="button" onClick={() => void saveUrl()} className="px-3 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold">Save preview</button>
                </div>
                {showPreview && previewAllowed ? (
                  <iframe
                    src={publishedUrl}
                    title="Published Base44 application"
                    className="flex-1 w-full min-h-[600px] bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-6 text-center">
                      <Monitor className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
                      <h2 className="text-sm font-bold text-[#283638]">Publish in Base44 to preview the live app</h2>
                      <p className="text-xs text-[#737A72] mt-2 leading-relaxed">
                        Build inside the Base44 builder, press <b>Publish</b>, copy the live app link,
                        then use <b>Paste URL</b> and <b>Save preview</b> above.
                      </p>
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <button type="button" onClick={() => void sendToBase44()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold">
                          <Send className="w-3.5 h-3.5" /> Copy brief + open Base44
                        </button>
                        <a href="https://app.base44.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C]">
                          <ExternalLink className="w-3.5 h-3.5" /> Open Base44
                        </a>
                      </div>
                      {draftUrl && !previewAllowed && <p className="text-[10px] text-[#B94D42] mt-3">Enter a valid https app URL.</p>}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}
      </div>

      <div className="text-[10px] text-[#737A72] leading-relaxed">
        The Base44 builder is embedded from app.base44.com. If sign-in or framing is blocked, open it in a new tab. Building and publishing happen in Base44; Vector previews the published app when the host allows it.
      </div>
    </div>
  );
};
