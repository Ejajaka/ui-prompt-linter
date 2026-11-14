import type { PromptVersionRecord, PromptVersionRow, VersionComparison } from '../../types/prompt.ts';
import type { Specification } from './promptGenerator.ts';
import { supabase } from '../supabase/client.ts';

function mapVersion(row: PromptVersionRow): PromptVersionRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    version: row.version,
    promptMarkdown: row.prompt_markdown,
    specification: row.specification || {},
    sourceRequirementIds: row.source_requirement_ids || [],
    changeSummary: row.change_summary,
    createdAt: row.created_at,
  };
}

export async function listPromptVersions(projectId: string): Promise<PromptVersionRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('project_id', projectId)
    .order('version', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapVersion(row as PromptVersionRow));
}

export async function savePromptVersion(
  projectId: string,
  userId: string,
  prompt: string,
  specification: Specification,
): Promise<PromptVersionRecord> {
  if (!supabase) throw new Error('Connect Supabase to save prompt versions.');
  const { data: latest, error: latestError } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1);
  if (latestError) throw new Error(latestError.message);
  const version = (latest?.[0]?.version || 0) + 1;
  const { data, error } = await supabase
    .from('prompt_versions')
    .insert({
      project_id: projectId,
      version,
      prompt_markdown: prompt,
      specification,
      source_requirement_ids: specification.confirmedRequirementIds,
      change_summary: `Version ${version}: ${specification.includedRequirementCodes.length} requirement(s), ${specification.includedCriterionCount} acceptance criterion/criteria.`,
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return mapVersion(data as PromptVersionRow);
}

export function compareVersions(previous: PromptVersionRecord, current: PromptVersionRecord): VersionComparison {
  const previousIds = new Set(previous.sourceRequirementIds);
  const currentIds = new Set(current.sourceRequirementIds);
  const addedRequirementIds = [...currentIds].filter((id) => !previousIds.has(id));
  const removedRequirementIds = [...previousIds].filter((id) => !currentIds.has(id));
  const previousCriteria = Number((previous.specification as any)?.includedCriterionCount || 0);
  const currentCriteria = Number((current.specification as any)?.includedCriterionCount || 0);
  const addedCriteria = Math.max(0, currentCriteria - previousCriteria);
  const removedCriteria = Math.max(0, previousCriteria - currentCriteria);
  const pieces: string[] = [];
  if (addedRequirementIds.length) pieces.push(`${addedRequirementIds.length} requirement(s) added`);
  if (removedRequirementIds.length) pieces.push(`${removedRequirementIds.length} requirement(s) removed`);
  if (addedCriteria) pieces.push(`${addedCriteria} acceptance criterion/criteria added`);
  if (removedCriteria) pieces.push(`${removedCriteria} acceptance criterion/criteria removed`);
  return {
    addedRequirementIds,
    removedRequirementIds,
    addedCriteria,
    removedCriteria,
    summary: pieces.length ? pieces.join('; ') : 'No requirement or criterion changes detected.',
  };
}
