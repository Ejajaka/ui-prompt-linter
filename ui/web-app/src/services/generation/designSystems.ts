import type { DesignSystem, DesignTokens } from '../../types/designSystem.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../../types/designSystem.ts';
import { supabase } from '../supabase/client.ts';

interface DesignSystemRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  name: string;
  tokens: DesignTokens;
  component_specs: Record<string, unknown>;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

function mapDesignSystem(row: DesignSystemRow): DesignSystem {
  return {
    id: row.id,
    ownerId: row.owner_id,
    projectId: row.project_id,
    name: row.name,
    tokens: { ...DEFAULT_DESIGN_SYSTEM.tokens, ...(row.tokens || {}) },
    isShared: row.is_shared,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listDesignSystems(): Promise<DesignSystem[]> {
  if (!supabase) return [{ ...DEFAULT_DESIGN_SYSTEM }];
  const { data, error } = await supabase.from('design_systems').select('*').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapDesignSystem(row as DesignSystemRow));
}

export async function createDesignSystem(
  ownerId: string,
  projectId: string | null,
  name: string,
  tokens: DesignTokens,
  isShared = false,
): Promise<DesignSystem> {
  if (!supabase) throw new Error('Connect Supabase to create design systems.');
  const { data, error } = await supabase
    .from('design_systems')
    .insert({
      owner_id: ownerId,
      project_id: projectId,
      name: name.trim() || 'Untitled design system',
      tokens,
      component_specs: {},
      is_shared: isShared,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  await supabase.from('design_system_versions').insert({ design_system_id: data.id, version: 1, snapshot: { name: data.name, tokens } });
  return mapDesignSystem(data as DesignSystemRow);
}

export async function updateDesignSystem(id: string, name: string, tokens: DesignTokens): Promise<DesignSystem> {
  if (!supabase) throw new Error('Connect Supabase to update design systems.');
  const { data, error } = await supabase
    .from('design_systems')
    .update({ name: name.trim() || 'Untitled design system', tokens, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const { data: latest } = await supabase.from('design_system_versions').select('version').eq('design_system_id', id).order('version', { ascending: false }).limit(1);
  const version = (latest?.[0]?.version || 0) + 1;
  await supabase.from('design_system_versions').insert({ design_system_id: id, version, snapshot: { name, tokens } });
  return mapDesignSystem(data as DesignSystemRow);
}

export async function deleteDesignSystem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('design_systems').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
