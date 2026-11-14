import { supabase } from './supabase/client.ts';

export async function loadProjectMemory<T>(projectId: string, key: string, fallback: T): Promise<T> {
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from('project_memory')
    .select('value')
    .eq('project_id', projectId)
    .eq('key', key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.value as T) ?? fallback;
}

export async function saveProjectMemory<T>(projectId: string, key: string, value: T): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('project_memory').upsert(
    { project_id: projectId, key, value, updated_at: new Date().toISOString() },
    { onConflict: 'project_id,key' }
  );
  if (error) throw new Error(error.message);
}
