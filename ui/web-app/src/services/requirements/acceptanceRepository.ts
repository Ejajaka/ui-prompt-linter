import type {
  AcceptanceCriterion,
  AcceptanceCriterionRow,
  RequirementSuggestion,
  SuggestionStatus,
} from '../../types/requirements.ts';
import { supabase } from '../supabase/client.ts';
import { loadProjectMemory, saveProjectMemory } from '../projectMemory.ts';

const SUGGESTIONS_KEY = 'requirement_suggestions';

function mapCriterion(row: AcceptanceCriterionRow, requirementCode: string): AcceptanceCriterion {
  return {
    id: row.id,
    projectId: row.project_id,
    requirementId: row.requirement_id,
    requirementCode,
    given: row.given_text,
    when: row.when_text,
    then: row.then_text,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function loadSuggestions(projectId: string): Promise<RequirementSuggestion[]> {
  return loadProjectMemory<RequirementSuggestion[]>(projectId, SUGGESTIONS_KEY, []);
}

export async function saveSuggestions(projectId: string, suggestions: RequirementSuggestion[]): Promise<void> {
  await saveProjectMemory(projectId, SUGGESTIONS_KEY, suggestions);
}

export async function updateSuggestionStatus(
  projectId: string,
  suggestions: RequirementSuggestion[],
  suggestionId: string,
  status: SuggestionStatus,
): Promise<RequirementSuggestion[]> {
  const next = suggestions.map((suggestion) =>
    suggestion.id === suggestionId ? { ...suggestion, status } : suggestion
  );
  await saveSuggestions(projectId, next);
  return next;
}

export async function listAcceptanceCriteria(
  projectId: string,
  requirementCodes: Map<string, string>,
): Promise<AcceptanceCriterion[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('acceptance_criteria')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapCriterion(row as AcceptanceCriterionRow, requirementCodes.get(row.requirement_id) || ''));
}

export async function ensureAcceptanceCriteria(
  projectId: string,
  criteria: AcceptanceCriterion[],
): Promise<AcceptanceCriterion[]> {
  if (!supabase || !criteria.length) return criteria;
  const { data: existing, error: existingError } = await supabase
    .from('acceptance_criteria')
    .select('id')
    .eq('project_id', projectId);
  if (existingError) throw new Error(existingError.message);
  const existingIds = new Set((existing || []).map((row) => row.id));
  const missing = criteria.filter((criterion) => !existingIds.has(criterion.id));
  if (missing.length) {
    const { error } = await supabase.from('acceptance_criteria').insert(
      missing.map((criterion) => ({
        id: criterion.id,
        project_id: projectId,
        requirement_id: criterion.requirementId,
        given_text: criterion.given,
        when_text: criterion.when,
        then_text: criterion.then,
        status: criterion.status,
        source: criterion.source,
      }))
    );
    if (error) throw new Error(error.message);
  }
  return [...criteria];
}

export async function updateAcceptanceStatus(
  criterionId: string,
  status: AcceptanceCriterion['status'],
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from('acceptance_criteria')
    .update({ status })
    .eq('id', criterionId);
  if (error) throw new Error(error.message);
}
