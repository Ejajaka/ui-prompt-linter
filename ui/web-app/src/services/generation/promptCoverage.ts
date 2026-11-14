import type { AcceptanceCriterion, RequirementRecord } from '../../types/requirements.ts';

export interface PromptCoverage {
  requirementsTotal: number;
  requirementsMet: RequirementRecord[];
  requirementsMissing: RequirementRecord[];
  criteriaTotal: number;
  criteriaMet: AcceptanceCriterion[];
  criteriaMissing: AcceptanceCriterion[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Measures whether the currently displayed prompt still contains the confirmed
 * requirements and acceptance criteria it was generated from.
 *
 * Coverage is based on the requirement's own text, not just its code, so a
 * requirement deleted from the brief is reported as missing even if its code
 * still appears elsewhere (for example in acceptance criteria).
 */
export function analyzePromptCoverage(
  prompt: string,
  requirements: RequirementRecord[],
  criteria: AcceptanceCriterion[],
): PromptCoverage {
  const normalizedPrompt = normalize(prompt);

  const requirementsMet: RequirementRecord[] = [];
  const requirementsMissing: RequirementRecord[] = [];

  for (const requirement of requirements) {
    const full = normalize(requirement.originalText);
    const fragment = full.slice(0, 90);
    const covered = full.length >= 12 && normalizedPrompt.includes(fragment);
    if (covered) requirementsMet.push(requirement);
    else requirementsMissing.push(requirement);
  }

  const criteriaMet: AcceptanceCriterion[] = [];
  const criteriaMissing: AcceptanceCriterion[] = [];

  for (const criterion of criteria) {
    const given = normalize(criterion.given.replace(/^given\s+/i, '')).slice(0, 70);
    const then = normalize(criterion.then.replace(/^then\s+/i, '')).slice(0, 50);
    const covered =
      (given.length >= 12 && normalizedPrompt.includes(given)) ||
      (then.length >= 12 && normalizedPrompt.includes(then));
    if (covered) criteriaMet.push(criterion);
    else criteriaMissing.push(criterion);
  }

  return {
    requirementsTotal: requirements.length,
    requirementsMet,
    requirementsMissing,
    criteriaTotal: criteria.length,
    criteriaMet,
    criteriaMissing,
  };
}

export function coverageLabel(coverage: PromptCoverage): string {
  if (!coverage.requirementsTotal && !coverage.criteriaTotal) return 'No confirmed items';
  const reqOk = coverage.requirementsMet.length === coverage.requirementsTotal;
  const critOk = coverage.criteriaMet.length === coverage.criteriaTotal;
  return reqOk && critOk ? 'All confirmed items covered' : 'Some confirmed items are missing';
}
