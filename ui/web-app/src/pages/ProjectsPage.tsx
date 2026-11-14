import React, { useState } from 'react';
import { ArrowRight, Database, FolderKanban, Loader2, Plus, Sparkles, Trash2, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { migrateLocalHistory } from '../services/historyMigration.ts';
import { useToast } from '../components/ui/Toast.tsx';

interface ProjectsPageProps {
  onOpenProject: () => void;
  onOpenSettings: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onOpenProject, onOpenSettings }) => {
  const { user, localMode } = useAuth();
  const { projects, currentProject, loading, error, createProject, deleteProject, selectProject, refresh } = useProject();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [migrating, setMigrating] = useState(false);

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

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Delete “${projectName}”? This removes its cloud data too.`)) return;
    try {
      await deleteProject(projectId);
      toast('Project deleted', 'info');
    } catch (e: any) {
      toast(e?.message || 'Could not delete project.', 'error');
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
                      onClick={() => handleDelete(project.id, project.name)}
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
                    Copy your existing local analyses into <b>{currentProject.name}</b>. The local records stay where they are.
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
    </div>
  );
};
