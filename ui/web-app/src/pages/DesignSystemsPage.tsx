import React, { useCallback, useEffect, useState } from 'react';
import { History, Loader2, Palette, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useProject } from '../context/ProjectContext.tsx';
import { useToast } from '../components/ui/Toast.tsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx';
import {
  createDesignSystem,
  deleteDesignSystem,
  listDesignSystemVersions,
  listDesignSystems,
  restoreDesignSystemVersion,
  updateDesignSystem,
} from '../services/generation/designSystems.ts';
import type { DesignSystemVersion } from '../services/generation/designSystems.ts';
import type { DesignSystem, DesignTokens } from '../types/designSystem.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../types/designSystem.ts';

const FIELDS: Array<{ key: keyof DesignTokens; label: string; multiline?: boolean }> = [
  { key: 'primaryColor', label: 'Primary colour' },
  { key: 'secondaryColor', label: 'Secondary colour' },
  { key: 'accentColor', label: 'Accent colour' },
  { key: 'typography', label: 'Typography' },
  { key: 'fontSizes', label: 'Font sizes' },
  { key: 'spacing', label: 'Spacing scale' },
  { key: 'borderRadius', label: 'Border radius' },
  { key: 'shadows', label: 'Shadows' },
  { key: 'navigationPattern', label: 'Navigation pattern' },
  { key: 'responsiveBreakpoints', label: 'Responsive breakpoints' },
  { key: 'buttonStyles', label: 'Button styles' },
  { key: 'inputStyles', label: 'Input styles' },
  { key: 'componentStyles', label: 'Component styles' },
  { key: 'brandGuidelines', label: 'Brand guidelines', multiline: true },
];

export const DesignSystemsPage: React.FC = () => {
  const { user, localMode } = useAuth();
  const { currentProject } = useProject();
  const { toast } = useToast();
  const [systems, setSystems] = useState<DesignSystem[]>([]);
  const [selected, setSelected] = useState<DesignSystem | null>(null);
  const [name, setName] = useState('');
  const [tokens, setTokens] = useState<DesignTokens>({ ...DEFAULT_DESIGN_SYSTEM.tokens });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<DesignSystemVersion[]>([]);
  const [restoring, setRestoring] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DesignSystem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDesignSystems();
      setSystems(list);
      if (list.length) {
        setSelected(list[0]);
        setName(list[0].name);
        setTokens(list[0].tokens);
        setVersions(await listDesignSystemVersions(list[0].id));
      }
    } catch (e: any) {
      toast(e?.message || 'Could not load design systems.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = (system: DesignSystem) => {
    setSelected(system);
    setName(system.name);
    setTokens({ ...DEFAULT_DESIGN_SYSTEM.tokens, ...system.tokens });
    setVersions([]);
    void listDesignSystemVersions(system.id)
      .then(setVersions)
      .catch(() => setVersions([]));
  };

  const startNew = () => {
    setSelected(null);
    setName('');
    setTokens({ ...DEFAULT_DESIGN_SYSTEM.tokens });
    setVersions([]);
  };

  const restore = async (version: DesignSystemVersion) => {
    if (!selected) return;
    setRestoring(true);
    try {
      const restored = await restoreDesignSystemVersion(selected.id, version.version);
      setSelected(restored);
      setName(restored.name);
      setTokens({ ...DEFAULT_DESIGN_SYSTEM.tokens, ...restored.tokens });
      setVersions(await listDesignSystemVersions(restored.id));
      toast(`Restored version ${version.version}.`, 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not restore design system version.', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const result = selected
        ? await updateDesignSystem(selected.id, name, tokens)
        : await createDesignSystem(user.id, currentProject?.id || null, name, tokens, true);
      setSelected(result);
      setName(result.name);
      await load();
      setVersions(await listDesignSystemVersions(result.id));
      toast(selected ? 'Design system updated' : 'Design system created', 'success');
    } catch (e: any) {
      toast(e?.message || 'Could not save design system.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDesignSystem(deleteTarget.id);
      if (selected?.id === deleteTarget.id) startNew();
      setDeleteTarget(null);
      await load();
      toast('Design system deleted', 'info');
    } catch (e: any) {
      toast(e?.message || 'Could not delete design system.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#283638] tracking-tight">Design Systems</h1>
          <p className="text-xs sm:text-sm text-[#737A72] mt-1">Reusable design tokens injected into specifications and generated prompts.</p>
        </div>
        <button type="button" onClick={startNew} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E2D8] bg-white text-xs font-bold text-[#49686C] hover:bg-[#F6F4EC]">
          <Plus className="w-3.5 h-3.5" /> New design system
        </button>
      </div>

      {localMode && <div className="rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-4 text-xs text-[#9C4A28]">Connect Supabase to save design systems across projects.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E5E2D8]">
            <Palette className="w-4 h-4 text-[#49686C]" />
            <h2 className="text-sm font-bold text-[#283638]">Library</h2>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#737A72]" />}
          </div>
          <div className="divide-y divide-[#E5E2D8] mt-1">
            {systems.length === 0 && <p className="text-xs text-[#737A72] py-6 text-center">Using the built-in default.</p>}
            {systems.map((system) => (
              <div key={system.id} className="py-3 flex items-center gap-2">
                <div className="flex -space-x-1">
                  {[system.tokens.primaryColor, system.tokens.secondaryColor, system.tokens.accentColor].map((color, index) => (
                    <span key={index} className="w-4 h-4 rounded-full border border-white shadow-xs" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <button type="button" onClick={() => choose(system)} className="min-w-0 flex-1 text-left">
                  <p className="text-xs font-bold text-[#283638] truncate">{system.name}</p>
                  <p className="text-[10px] text-[#737A72]">{system.isShared ? 'shared' : 'private'} · {system.projectId ? 'project' : 'library'}</p>
                </button>
                <button type="button" onClick={() => setDeleteTarget(system)} className="p-1.5 rounded-md text-[#B94D42] hover:bg-[#FDF2F0]" aria-label={`Delete ${system.name}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E5E2D8] rounded-xl shadow-xs p-5">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E2D8]">
            <h2 className="text-sm font-bold text-[#283638]">{selected ? 'Edit design system' : 'Create design system'}</h2>
            <span className="text-[10px] text-[#737A72]">{currentProject?.name || 'Library-wide'}</span>
          </div>
          <div className="mt-3">
            <label className="block">
              <span className="text-xs font-bold text-[#283638] block mb-1">Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Product design system" className="w-full px-3 py-2.5 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-sm text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {FIELDS.map((field) => (
              <label key={field.key} className={field.multiline ? 'sm:col-span-2' : ''}>
                <span className="text-[11px] font-bold text-[#283638] block mb-1">{field.label}</span>
                {field.multiline ? (
                  <textarea rows={3} value={tokens[field.key]} onChange={(event) => setTokens((prev) => ({ ...prev, [field.key]: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
                ) : (
                  <input value={tokens[field.key]} onChange={(event) => setTokens((prev) => ({ ...prev, [field.key]: event.target.value }))} className="w-full px-3 py-2 rounded-lg border border-[#E5E2D8] bg-[#FAFAF8] text-xs text-[#283638] focus:bg-white focus:outline-none focus:border-[#49686C]" />
                )}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button type="button" onClick={() => void save()} disabled={saving || !user || !name.trim()} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#49686C] hover:bg-[#30494B] text-white text-xs font-bold disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save design system
            </button>
            <span className="text-[10px] text-[#737A72]">Tokens are injected into the specification and prompt.</span>
          </div>

          {selected && (
            <div className="mt-5 pt-4 border-t border-[#E5E2D8]">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#49686C]" />
                <h3 className="text-sm font-bold text-[#283638]">Version history</h3>
                {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#737A72]" />}
              </div>
              {loading ? (
                <p className="text-xs text-[#737A72] mt-2 inline-flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading versions…
                </p>
              ) : versions.length === 0 ? (
                <p className="text-xs text-[#737A72] mt-2">No saved versions yet. Saving this design system records a snapshot.</p>
              ) : (
                <div className="mt-2 divide-y divide-[#E5E2D8] border border-[#E5E2D8] rounded-lg overflow-hidden">
                  {versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-2 px-3 py-2 bg-[#FAFAF8]">
                      <span className="text-xs font-bold text-[#283638]">v{version.version}</span>
                      <span className="text-[10px] text-[#737A72]">{new Date(version.createdAt).toLocaleString()}</span>
                      <div className="ml-auto flex items-center gap-1">
                        {[version.tokens.primaryColor, version.tokens.secondaryColor, version.tokens.accentColor].map((color, index) => (
                          <span key={index} className="w-3.5 h-3.5 rounded-full border border-white shadow-xs" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void restore(version)}
                        disabled={restoring || localMode}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E5E2D8] bg-white text-[10px] font-bold text-[#49686C] hover:bg-[#F6F4EC] disabled:opacity-60"
                      >
                        <RotateCcw className="w-3 h-3" /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[#737A72] mt-2 leading-relaxed">
                Restoring applies the saved tokens and records the restore as a new version, so history is never lost.
              </p>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this design system?"
        message={
          <>
            Deleting <b>{deleteTarget?.name}</b> removes its tokens and version history. Prompts that
            already referenced it keep their saved text, but future briefs will need another system.
          </>
        }
        confirmLabel="Delete design system"
        busy={deleting}
        onConfirm={() => void remove()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
