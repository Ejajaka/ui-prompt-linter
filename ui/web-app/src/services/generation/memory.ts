import type { RequirementRecord } from '../../types/requirements.ts';
import { loadProjectMemory, saveProjectMemory } from '../projectMemory.ts';

export interface RequirementSnapshot {
  id: string;
  code: string;
  text: string;
  status: string;
  priority: string;
}

export interface RegressionReport {
  added: RequirementSnapshot[];
  removed: RequirementSnapshot[];
  changed: Array<{ before: RequirementSnapshot; after: RequirementSnapshot }>;
  summary: string;
}

export const MEMORY_KEYS = {
  designSystem: 'selected_design_system',
  requirementBaseline: 'requirement_baseline',
  publishedUrl: 'published_app_url',
};

export function snapshotRequirements(requirements: RequirementRecord[]): RequirementSnapshot[] {
  return requirements.map((requirement) => ({
    id: requirement.id,
    code: requirement.requirementCode,
    text: requirement.originalText,
    status: requirement.status,
    priority: requirement.priority,
  }));
}

export async function loadRequirementBaseline(projectId: string): Promise<RequirementSnapshot[]> {
  return loadProjectMemory<RequirementSnapshot[]>(projectId, MEMORY_KEYS.requirementBaseline, []);
}

export async function saveRequirementBaseline(
  projectId: string,
  requirements: RequirementRecord[],
): Promise<void> {
  await saveProjectMemory(projectId, MEMORY_KEYS.requirementBaseline, snapshotRequirements(requirements));
}

export function compareRequirementBaseline(
  baseline: RequirementSnapshot[],
  current: RequirementRecord[],
): RegressionReport {
  const previousById = new Map(baseline.map((item) => [item.id, item]));
  const currentSnapshots = snapshotRequirements(current);
  const currentById = new Map(currentSnapshots.map((item) => [item.id, item]));
  const added = currentSnapshots.filter((item) => !previousById.has(item.id));
  const removed = baseline.filter((item) => !currentById.has(item.id));
  const changed: Array<{ before: RequirementSnapshot; after: RequirementSnapshot }> = [];
  for (const after of currentSnapshots) {
    const before = previousById.get(after.id);
    if (!before) continue;
    if (before.text !== after.text || before.status !== after.status || before.priority !== after.priority) {
      changed.push({ before, after });
    }
  }
  const pieces = [];
  if (removed.length) pieces.push(`${removed.length} previously present requirement(s) disappeared`);
  if (changed.length) pieces.push(`${changed.length} requirement(s) changed`);
  if (added.length) pieces.push(`${added.length} new requirement(s) added`);
  return {
    added,
    removed,
    changed,
    summary: pieces.length ? pieces.join('; ') : 'No requirement regressions detected against the saved baseline.',
  };
}
