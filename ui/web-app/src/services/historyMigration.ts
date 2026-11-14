import { historyStorage } from './historyStorage';
import { supabase } from './supabase/client';

export interface MigrationResult {
  imported: number;
  skipped: boolean;
}

/**
 * Explicit, non-destructive migration of the legacy browser history.
 * The original localStorage records are never deleted.
 */
export async function migrateLocalHistory(projectId: string, userId: string): Promise<MigrationResult> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const items = historyStorage.getAll();
  if (!items.length) return { imported: 0, skipped: false };

  const { data: existing, error: existingError } = await supabase
    .from('analysis_runs')
    .select('id')
    .eq('project_id', projectId)
    .limit(1);
  if (existingError) throw new Error(existingError.message);
  if (existing && existing.length) {
    historyStorage.assignProject(projectId);
    return { imported: 0, skipped: true };
  }

  const rows = items.map((item) => ({
    project_id: projectId,
    user_id: userId,
    prompt: item.prompt,
    engine: 'legacy-browser',
    payload: item,
    risk_score: Math.max(0, Math.min(100, Math.round(item.riskScore))),
    created_at: item.createdAt || new Date().toISOString(),
  }));

  const { error } = await supabase.from('analysis_runs').insert(rows);
  if (error) throw new Error(error.message);

  // Attach the same records to this project locally so they appear in its history.
  historyStorage.assignProject(projectId);
  return { imported: rows.length, skipped: false };
}
