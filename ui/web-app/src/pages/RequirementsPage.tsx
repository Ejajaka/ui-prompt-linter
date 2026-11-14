import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Filter,
  Loader2,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import {
  deleteRequirementDocument,
  listRequirementDocuments,
  listRequirements,
  uploadRequirementDocument,
} from '../services/documents/requirementDocuments.ts';
import type {
  RequirementDocument,
  RequirementRecord,
} from '../types/requirements.ts';
import { applyRequirementPriorities } from '../services/requirements/priority.ts';
import { recordRequirementDecision } from '../services/requirements/approvals.ts';

type KindFilter = 'all' | 'functional' | 'non_functional';

export const RequirementsPage: React.FC = () => {
  const { user, localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<RequirementDocument[]>([]);
  const [requirements, setRequirements] = useState<RequirementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [prioritizing, setPrioritizing] = useState(false);

  const load = useCallback(async () => {
    if (!currentProject || localMode) {
      setDocuments([]);
      setRequirements([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [docs, reqs] = await Promise.all([
        listRequirementDocuments(currentProject.id),
        listRequirements(currentProject.id),
      ]);
      setDocuments(docs);
      setRequirements(reqs);
    } catch (e: any) {
      setError(e?.message || 'Could not load requirement data.');
    } finally {
      setLoading(false);
    }
  }, [currentProject, localMode]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleFile = async (file: File | null) => {
    if (!file || !currentProject || !user) return;
    setUploading(true);
    setError('');
    setProgress('Uploading…');
    try {
      const result = await uploadRequirementDocument(currentProject.id, user.id, file, (stage, message) => {
        setProgress(message || stage);
      });
      await load();
      toast(
        result.requirements.length
          ? `Compiled ${result.requirements.length} requirements from ${file.name}.`
          : `Parsed ${file.name}, but no requirement-like statements were found.`,
        result.requirements.length ? 'success' : 'info'
      );
    } catch (e: any) {
      setError(e?.message || 'Upload failed.');
      toast(e?.message || 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      setProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handlePrioritize = async () => {
    if (!currentProject || localMode) return;
    setPrioritizing(true);
    try {
      setRequirements(await applyRequirementPriorities(currentProject.id, requirements));
      toast('Requirements prioritized', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not classify priorities.', 'error');
    } finally {
      setPrioritizing(false);
    }
  };

  const handleDecision = async (requirement: RequirementRecord, decision: 'approved' | 'rejected') => {
    if (!currentProject || !user) return;
    try {
      await recordRequirementDecision(currentProject.id, requirement.id, user.id, decision);
      setRequirements((prev) => prev.map((item) => item.id === requirement.id ? { ...item, status: decision } : item));
      toast(decision === 'approved' ? 'Requirement approved' : 'Requirement rejected', 'info');
    } catch (e: any) {
      toast(e?.message || 'Could not save approval.', 'error');
    }
  };

  const handleDelete = async (document: RequirementDocument) => {
    if (!window.confirm(`Delete “${document.fileName}” and its requirements?`)) return;
    try {
      await deleteRequirementDocument(document);
      await load();
      toast('Document deleted', 'info');
    } catch (e: any) {
      toast(e?.message || 'Could not delete document.', 'error');
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requirements.filter((requirement) => {
      if (kindFilter !== 'all' && requirement.kind !== kindFilter) return false;
      if (!query) return true;
      return (
        requirement.originalText.toLowerCase().includes(query) ||
        requirement.requirementCode.toLowerCase().includes(query) ||
        (requirement.metadata.roles || []).some((role) => role.toLowerCase().includes(query))
      );
    });
  }, [requirements, kindFilter, search]);

  if (!currentProject) {
    return (
      <div className="max-w-3xl mx-auto bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-10 text-center shadow-xs">
        <FileText className="w-8 h-8 text-[#49686C] mx-auto mb-3" />
        <h1 className="text-lg font-bold text-[#283638]">Choose a project first</h1>
        <p className="text-xs text-[#737A72] mt-1">Requirement documents are scoped to a project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Requirement Compiler</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">
            Upload a company requirement document. Every extracted statement keeps its source page and character offsets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F6F4EC] border border-[#E5E2D8] text-[#49686C]">
            {currentProject.name}
          </div>
          <button
            type="button"
            onClick={() => void handlePrioritize()}
            disabled={prioritizing || localMode || !requirements.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60"
          >
            {prioritizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Prioritize
          </button>
        </div>
      </div>

      {localMode && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs text-[#9C4A28]">
          Requirement uploads need Supabase Storage and Postgres. Add the public Supabase env values to enable this page.
        </div>
      )}

      <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F6F4EC] border border-[#E5E2D8] flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5 text-[#49686C]" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-[#283638]">Upload a requirement document</h2>
            <p className="text-xs text-[#737A72] mt-1">PDF, DOCX, TXT or Markdown · maximum 25 MB.</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              className="hidden"
              onChange={(event) => void handleFile(event.target.files?.[0] || null)}
            />
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                type="button"
                disabled={uploading || localMode || !user}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] disabled:opacity-60 text-white text-xs font-bold"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                {uploading ? progress || 'Processing…' : 'Choose document'}
              </button>
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs font-bold text-[#49686C] hover:bg-white disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Refresh
              </button>
            </div>
            {progress && <p className="text-[11px] text-[#856C16] mt-2">{progress}</p>}
            {error && (
              <div className="mt-3 flex items-start gap-2 text-xs text-[#B94D42] bg-[#FDF2F0] border border-[#F0C4BF] rounded-lg p-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1 bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E2D8]">
            <h2 className="text-sm font-bold text-[#283638]">Documents</h2>
            <span className="text-[10px] font-mono text-[#737A72]">{documents.length}</span>
          </div>
          {documents.length === 0 ? (
            <p className="text-xs text-[#737A72] py-6 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="divide-y divide-[#E5E2D8]">
              {documents.map((document) => (
                <div key={document.id} className="py-3 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-[#49686C] mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#283638] truncate" title={document.fileName}>{document.fileName}</p>
                    <p className="text-[10px] text-[#737A72] mt-0.5">
                      {document.status === 'parsed' ? `${document.pageCount || 1} page(s)` : document.status}
                      {document.status === 'failed' && document.errorMessage ? ` · ${document.errorMessage}` : ''}
                    </p>
                  </div>
                  {document.status === 'parsed' && <CheckCircle2 className="w-4 h-4 text-[#3E6B33] shrink-0" />}
                  <button
                    type="button"
                    onClick={() => void handleDelete(document)}
                    className="p-1.5 rounded-md text-[#B94D42] hover:bg-[#FDF2F0]"
                    aria-label={`Delete ${document.fileName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#49686C]" />
                <h2 className="text-sm font-bold text-[#283638]">Extracted requirements</h2>
                <span className="text-[10px] font-mono text-[#737A72]">{filtered.length}/{requirements.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ['all', 'All'],
                  ['functional', 'Functional'],
                  ['non_functional', 'Non-functional'],
                ] as [KindFilter, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setKindFilter(id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      kindFilter === id
                        ? 'bg-[#49686C] border-[#49686C] text-white'
                        : 'bg-white border-[#E5E2D8] text-[#737A72] hover:border-[#49686C]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="w-3.5 h-3.5 text-[#737A72] absolute left-2.5 top-2.5" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requirements, codes or roles"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-8 text-center text-xs text-[#737A72]">
              {loading && requirements.length === 0 ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading compiled requirements…
                </span>
              ) : requirements.length === 0 ? (
                'Upload a document to compile requirements.'
              ) : (
                'No requirements match the current filters.'
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((requirement) => (
                <article key={requirement.id} className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl p-4 shadow-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-[#49686C]">{requirement.requirementCode}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      requirement.kind === 'non_functional'
                        ? 'bg-[#F6F4EC] border-[#E5E2D8] text-[#856C16]'
                        : 'bg-[#F4F9F1] border-[#CFE2C8] text-[#3E6B33]'
                    }`}>
                      {requirement.kind === 'non_functional' ? 'Non-functional' : 'Functional'}
                    </span>
                    <span className="text-[10px] text-[#737A72]">
                      page {requirement.sourcePage ?? '—'} · para {requirement.sourceParagraph ?? '—'}
                    </span>
                    <span className="ml-auto text-[10px] text-[#737A72]">{requirement.priority} priority ? {requirement.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p className="text-sm text-[#283638] mt-2 leading-relaxed">{requirement.originalText}</p>
                  {requirement.status === 'pending_review' && (
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => void handleDecision(requirement, 'approved')} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#F4F9F1] border border-[#CFE2C8] text-[#3E6B33]">Approve</button>
                      <button type="button" onClick={() => void handleDecision(requirement, 'rejected')} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#FDF2F0] border border-[#F0C4BF] text-[#B94D42]">Reject</button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {(requirement.metadata.roles || []).map((role) => (
                      <span key={`role-${role}`} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAFAF8] border border-[#E5E2D8] text-[#49686C]">{role}</span>
                    ))}
                    {(requirement.metadata.screens || []).map((screen) => (
                      <span key={`screen-${screen}`} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F6F4EC] border border-[#E5E2D8] text-[#283638]">{screen}</span>
                    ))}
                    {(requirement.metadata.components || []).slice(0, 5).map((component) => (
                      <span key={`component-${component}`} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E5E2D8] text-[#737A72]">{component}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
