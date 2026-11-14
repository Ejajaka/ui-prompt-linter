import React, { useState } from 'react';
import { ArrowRight, Database, FolderKanban, Loader2, Pencil, Plus, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { migrateLocalHistory } from '../services/historyMigration.ts';
import { useToast } from '../components/ui/Toast.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import type { Project } from '../types/projects.ts';

interface ProjectsPageProps {
  onOpenProject: () => void;
  onOpenSettings: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenProject, onOpenSettings }) => {
  const { user, localMode } = useAuth();
  const { projects, currentProject, loading, error, createProject, updateProject, deleteProject, selectProject, refresh } = useProject();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    try {
      await createProject(name, description);
      setName('');
      setDescription('');
      toast('Project created', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not create project.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (projectId: string) => {
    selectProject(projectId);
    onOpenProject();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      toast('Project deleted', 'info');
      setDeleteTarget(null);
    } catch (e: any) {
      toast(e?.message || 'Could not delete project.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (project: Project) => {
    setEditTarget(project);
    setEditName(project.name);
    setEditDescription(project.description || '');
  };

  const handleEditSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget || !editName.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateProject(editTarget.id, { name: editName.trim(), description: editDescription.trim() });
      toast('Project updated', 'success');
      setEditTarget(null);
    } catch (e: any) {
      toast(e?.message || 'Could not update project.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleMigrate = async () => {
    if (!user || !currentProject) return;
    setMigrating(true);
    try {
      const result = await migrateLocalHistory(currentProject.id, user.id);
      if (result.skipped) toast('This project already contains imported analyses.', 'info');
      else if (result.imported === 0) toast('No local analyses to import.', 'info');
      else toast(`Imported ${result.imported} local analyses without deleting them.`, 'success');
    } catch (e: any) {
      toast(e?.message || 'Migration failed.', 'error');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Projects</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">
            Each project carries its own requirement documents, approvals, design system, prompts and memory.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC]"
        >
          <Database className="w-3.5 h-3.5" />
          Account & data
        </button>
      </div>

      {localMode && (
        <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs text-[#9C4A28] leading-relaxed">
          <b>Local mode.</b> Supabase is not configured, so projects are stored in this browser only. Add
          <code className="font-mono mx-1">VITE_SUPABASE_URL</code> and
          <code className="font-mono mx-1">VITE_SUPABASE_ANON_KEY</code> to enable accounts and cloud projects.
        </div>
      )}

      {error && <div className="rounded-xl border border-[#F0C4BF] bg-[#FDF2F0] p-4 text-xs text-[#B94D42]">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
              <FolderKanban className="w-4 h-4 text-[#49686C]" />
              <h2 className="text-base font-bold text-[#283638]">Your projects</h2>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#737A72]" />}
            </div>

            {!loading && projects.length === 0 ? (
              <div className="py-10 text-center">
                <Sparkles className="w-7 h-7 text-[#49686C] mx-auto mb-2" />
                <p className="text-sm font-bold text-[#283638]">Create your first project</p>
                <p className="text-xs text-[#737A72] mt-1">A project groups documents, requirements and generated prompts.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5E2D8] mt-1">
                {projects.map((project) => (
                  <div key={project.id} className="py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#F6F4EC] border border-[#E5E2D8] flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-[#49686C]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleOpen(project.id)}
                        className="text-sm font-bold text-[#283638] hover:text-[#49686C] text-left truncate"
                      >
                        {project.name}
                      </button>
                      <p className="text-[11px] text-[#737A72] truncate">
                        {project.description || 'No description'} · updated {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {currentProject?.id === project.id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#CFE2C8] bg-[#F4F9F1] text-[#3E6B33]">
                        current
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpen(project.id)}
                      className="p-2 rounded-lg text-[#49686C] hover:bg-[#F6F4EC]"
                      aria-label={`Open ${project.name}`}
                      title="Open project"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(project)}
                      className="p-2 rounded-lg text-[#737A72] hover:bg-[#F6F4EC] hover:text-[#283638]"
                      aria-label={`Edit ${project.name}`}
                      title="Edit project"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(project)}
                      className="p-2 rounded-lg text-[#B94D42] hover:bg-[#FDF2F0]"
                      aria-label={`Delete ${project.name}`}
                      title="Delete project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!localMode && currentProject && (
            <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <UploadCloud className="w-5 h-5 text-[#49686C] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#283638]">Import existing browser history</p>
                  <p className="text-xs text-[#737A72] mt-1 leading-relaxed">
                    Copy your existing local analyses into <b>{currentProject.name}</b>. They stay in this
                    browser and are attached to this project so other projects keep a clean history.
                  </p>
                  <button
                    type="button"
                    onClick={handleMigrate}
                    disabled={migrating}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs font-bold text-[#49686C] hover:bg-white disabled:opacity-60"
                  >
                    {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    Import local history
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleCreate} className="bg-[#FFFFFF] rounded-xl border border-[#E5E2D8] shadow-xs p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
            <Plus className="w-4 h-4 text-[#49686C]" />
            <h2 className="text-base font-bold text-[#283638]">New project</h2>
          </div>
          <label className="block">
            <span className="text-xs font-bold text-[#283638] block mb-1">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Customer portal redesign"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
              maxLength={120}
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold text-[#283638] block mb-1">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="What is being designed?"
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]"
            />
          </label>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#49686C] hover:bg-[#30494B] disabled:opacity-60 text-white text-xs font-bold"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create project
          </button>
          <button type="button" onClick={() => void refresh()} className="w-full text-[11px] font-semibold text-[#737A72] hover:text-[#49686C]">
            Refresh list
          </button>
        </form>
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#283638]/50 backdrop-blur-xs">
          <form
            onSubmit={handleEditSave}
            role="dialog"
            aria-modal="true"
            aria-label="Edit project"
            className="bg-[#FFFFFF] dark:bg-[#1F2B2D] border border-[#E5E2D8] dark:border-[#33403F] rounded-xl max-w-md w-full p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2D8] dark:border-[#33403F]">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-[#49686C]" />
                <h3 className="text-sm font-bold text-[#283638] dark:text-[#E7E4D9]">Edit project</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="p-1 text-[#737A72] hover:text-[#283638] dark:hover:text-white rounded"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <label className="block mt-4">
              <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block mb-1">Name</span>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                maxLength={120}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] text-sm text-[#283638] dark:text-[#E7E4D9] focus:bg-white dark:focus:bg-[#1B2526] focus:outline-none focus:border-[#49686C]"
              />
            </label>
            <label className="block mt-3">
              <span className="text-xs font-bold text-[#283638] dark:text-[#E7E4D9] block mb-1">Description</span>
              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] dark:border-[#33403F] bg-[#FAFAF8] dark:bg-[#141C1D] text-sm text-[#283638] dark:text-[#E7E4D9] focus:bg-white dark:focus:bg-[#1B2526] focus:outline-none focus:border-[#49686C]"
              />
            </label>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-3.5 py-1.5 border border-[#E5E2D8] dark:border-[#33403F] rounded-lg text-xs font-semibold text-[#737A72] hover:bg-[#F6F4EC] dark:hover:bg-[#263335]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingEdit || !editName.trim()}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#49686C] text-white text-xs font-semibold hover:bg-[#30494B] disabled:opacity-60"
              >
                {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this project?"
        message={
          <>
            Deleting <b>{deleteTarget?.name}</b> also removes its documents, requirements,
            analysis history, design systems and prompts. This cannot be undone.
          </>
        }
        confirmLabel="Delete project"
        busy={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
