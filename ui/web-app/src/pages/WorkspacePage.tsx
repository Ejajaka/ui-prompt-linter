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
import { generateProfessionalPrompt } from '../services/generation/promptGenerator.ts';
import { loadProjectMemory, saveProjectMemory } from '../services/projectMemory.ts';
import { MEMORY_KEYS } from '../services/generation/memory.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../types/designSystem.ts';
import type { AcceptanceCriterion, RequirementRecord, RequirementSuggestion } from '../types/requirements.ts';

function isBoltUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return url.hostname === 'bolt.new' || url.hostname.endsWith('.bolt.host');
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
  const [boltUrl, setBoltUrl] = useState('');
  const [draftUrl, setDraftUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

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
      const [savedSuggestions, savedCriteria, savedUrl] = await Promise.all([
        loadSuggestions(currentProject.id),
        listAcceptanceCriteria(currentProject.id, codeMap),
        loadProjectMemory<string>(currentProject.id, MEMORY_KEYS.boltUrl, ''),
      ]);
      setRequirements(reqs);
      setSuggestions(savedSuggestions.length ? savedSuggestions : generateSuggestions(reqs, currentProject.id));
      setCriteria(savedCriteria.length ? savedCriteria : generateAcceptanceCriteria(reqs, currentProject.id));
      setBoltUrl(savedUrl || '');
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

  const generated = useMemo(
    () => generateProfessionalPrompt({
      projectName: currentProject?.name || 'Untitled project',
      requirements,
      suggestions,
      criteria,
      designSystem: DEFAULT_DESIGN_SYSTEM,
    }),
    [currentProject, requirements, suggestions, criteria]
  );

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generated.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast('Prompt copied', 'success');
    } catch {
      toast('Could not copy prompt.', 'error');
    }
  };

  const sendToBolt = async () => {
    await copyPrompt();
    window.open('https://bolt.new', '_blank', 'noopener,noreferrer');
    toast('Prompt copied. Paste it into Bolt to start the design task.', 'info');
  };

  const saveUrl = async () => {
    if (!currentProject || localMode) return;
    const value = draftUrl.trim();
    if (value && !isBoltUrl(value)) {
      toast('Enter a published Bolt URL, for example https://your-app.bolt.host.', 'error');
      return;
    }
    try {
      await saveProjectMemory(currentProject.id, MEMORY_KEYS.boltUrl, value);
      setBoltUrl(value);
      setShowPreview(true);
      toast(value ? 'Bolt preview URL saved' : 'Bolt preview URL cleared', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save Bolt URL.', 'error');
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

  const previewAllowed = isBoltUrl(boltUrl);

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Vector × Bolt Workspace</h1>
          <p className="text-xs text-[#737A72] mt-1">Validate the prompt on the left, generate the interface on the right, then return to refine.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-[#737A72]" />}
          <button type="button" onClick={() => setLeftCollapsed((value) => !value)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2D8] bg-white text-[11px] font-bold text-[#49686C]">
            {leftCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            {leftCollapsed ? 'Show prompt' : 'Hide prompt'}
          </button>
          <button type="button" onClick={() => setRightCollapsed((value) => !value)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E5E2D8] bg-white text-[11px] font-bold text-[#49686C]">
            {rightCollapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            {rightCollapsed ? 'Show Bolt' : 'Hide Bolt'}
          </button>
        </div>
      </div>

      <div ref={splitRef} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs overflow-hidden min-h-[720px] flex">
        {!leftCollapsed && (
          <section className="min-w-0 flex flex-col" style={{ width: rightCollapsed ? '100%' : `${split}%` }}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#E5E2D8] bg-[#FAFAF8]">
              <div className="text-xs font-bold text-[#283638]">Vector Prompt Analyser</div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${generated.specification.status.startsWith('Ready') ? 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]' : 'bg-[#FEFCE8] border-[#FEF08A] text-[#856C16]'}`}>
                {generated.specification.status}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={copyPrompt} className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E5E2D8] bg-white text-[10px] font-bold text-[#49686C]">
                  {copied ? 'Copied' : <><Clipboard className="w-3 h-3" /> Copy</>}
                </button>
                <button type="button" onClick={() => void sendToBolt()} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#49686C] text-white text-[10px] font-bold">
                  <Send className="w-3 h-3" /> Send to Bolt
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 border-b border-[#E5E2D8] text-[10px]">
              <div className="rounded-md bg-[#FAFAF8] border border-[#E5E2D8] p-2"><span className="text-[#737A72] block">Requirements</span><b className="font-mono">{generated.specification.includedRequirementCodes.length}</b></div>
              <div className="rounded-md bg-[#FAFAF8] border border-[#E5E2D8] p-2"><span className="text-[#737A72] block">Criteria</span><b className="font-mono">{generated.specification.includedCriterionCount}</b></div>
              <div className="rounded-md bg-[#FAFAF8] border border-[#E5E2D8] p-2"><span className="text-[#737A72] block">Unresolved</span><b className="font-mono">{generated.specification.unresolvedSuggestionIds.length}</b></div>
            </div>
            <textarea
              readOnly
              value={generated.prompt}
              className="flex-1 w-full min-h-[560px] resize-none p-4 bg-[#FFFFFF] text-[11px] leading-relaxed font-mono text-[#283638] focus:outline-none"
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
              <div className="text-xs font-bold text-[#283638]">Bolt Workspace</div>
              <span className="text-[10px] text-[#737A72]">published app preview</span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => setShowPreview((value) => !value)} className="p-1.5 rounded-md text-[#49686C] hover:bg-[#F6F4EC]" aria-label="Toggle preview">
                  {showPreview ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <a href="https://bolt.new" target="_blank" rel="noreferrer" className="p-1.5 rounded-md text-[#49686C] hover:bg-[#F6F4EC]" aria-label="Open Bolt">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
            <div className="p-3 border-b border-[#E5E2D8] bg-[#FFFFFF] flex flex-col sm:flex-row gap-2">
              <input value={draftUrl} onChange={(event) => setDraftUrl(event.target.value)} placeholder="https://your-app.bolt.host" className="flex-1 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
              <button type="button" onClick={() => void saveUrl()} className="px-3 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold">Save preview</button>
            </div>
            {showPreview && previewAllowed ? (
              <iframe
                src={boltUrl}
                title="Published Bolt application"
                className="flex-1 w-full min-h-[600px] bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-md bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-6 text-center">
                  <Monitor className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
                  <h2 className="text-sm font-bold text-[#283638]">Send the approved prompt to Bolt</h2>
                  <p className="text-xs text-[#737A72] mt-2 leading-relaxed">
                    Bolt does not expose a supported editor-embedding API. Use the launch button, paste the copied prompt, and publish the result. Then add the published <code className="font-mono">*.bolt.host</code> URL above to preview it here.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    <button type="button" onClick={() => void sendToBolt()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#49686C] text-white text-xs font-bold">
                      <Send className="w-3.5 h-3.5" /> Open Bolt + copy prompt
                    </button>
                    <a href="https://bolt.new" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C]">
                      <ExternalLink className="w-3.5 h-3.5" /> Open Bolt
                    </a>
                  </div>
                  {draftUrl && !previewAllowed && <p className="text-[10px] text-[#B94D42] mt-3">Only published bolt.host or bolt.new/~ URLs can be embedded.</p>}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="text-[10px] text-[#737A72] leading-relaxed">
        Bolt integration uses a supported launch-and-transfer workflow plus an optional published-app iframe. If Bolt or its hosting blocks framing, use the external launch link. The editor itself is never faked.
      </div>
    </div>
  );
};
