import { describe, expect, it } from 'vitest';
import { generateProfessionalPrompt } from './promptGenerator.ts';
import { compareVersions } from './promptVersions.ts';
import type { RequirementRecord } from '../../types/requirements.ts';
import type { PromptVersionRecord } from '../../types/prompt.ts';

function req(id: string, code: string, text: string, status: RequirementRecord['status'] = 'approved'): RequirementRecord {
  return {
    id,
    projectId: 'p1',
    documentId: 'd1',
    requirementCode: code,
    originalText: text,
    normalizedText: text,
    kind: 'functional',
    status,
    priority: 'high',
    priorityReason: 'core business flow',
    sourcePage: 1,
    sourceParagraph: 1,
    sourceCharStart: 0,
    sourceCharEnd: text.length,
    metadata: { screens: ['Profile'], components: ['form'], roles: ['Employee'], behaviours: ['save'] },
    createdAt: new Date().toISOString(),
  };
}

describe('professional prompt generator', () => {
  it('emits the exact six-section structure with approved requirements and criteria', () => {
    const requirement = req('r1', 'REQ-001', 'Employees must save their profile.', 'approved');
    const result = generateProfessionalPrompt({
      projectName: 'Employee portal',
      requirements: [requirement],
      suggestions: [],
      criteria: [{
        id: 'c1', projectId: 'p1', requirementId: 'r1', requirementCode: 'REQ-001',
        given: 'Given an authenticated employee', when: 'when they submit valid data',
        then: 'then the profile is saved', status: 'approved', source: 'ai_inferred',
        createdAt: new Date().toISOString(),
      }],
    });
    const headings = [
      'UI/UX Design Task', '1. Objective', '2. Problem Statement', '3. Requirements',
      '4. Design Guidelines', '5. Deliverables', '6. Acceptance Criteria',
    ];
    let last = -1;
    for (const heading of headings) {
      const position = result.prompt.indexOf(heading);
      expect(position).toBeGreaterThan(last);
      last = position;
    }
    expect(result.prompt).toContain('REQ-001');
    expect(result.prompt).toContain('Given an authenticated employee');
    expect(result.prompt).toContain('Employee portal');
    expect(result.specification.status).toBe('Ready for design');
  });

  it('marks unapproved requirements as a draft', () => {
    const requirement = req('r1', 'REQ-001', 'Employees must save their profile.', 'pending_review');
    const result = generateProfessionalPrompt({
      projectName: 'Employee portal', requirements: [requirement], suggestions: [], criteria: [],
    });
    expect(result.specification.status).toContain('Draft');
    expect(result.prompt).toContain('pending approval');
  });
});

describe('prompt versions', () => {
  it('computes a meaningful requirement/criteria diff', () => {
    const base: PromptVersionRecord = {
      id: 'v1', projectId: 'p1', version: 1, promptMarkdown: '', specification: { includedCriterionCount: 2 },
      sourceRequirementIds: ['a', 'b'], changeSummary: null, createdAt: new Date().toISOString(),
    };
    const next: PromptVersionRecord = {
      ...base, id: 'v2', version: 2, sourceRequirementIds: ['b', 'c'],
      specification: { includedCriterionCount: 4 },
    };
    const diff = compareVersions(base, next);
    expect(diff.addedRequirementIds).toEqual(['c']);
    expect(diff.removedRequirementIds).toEqual(['a']);
    expect(diff.addedCriteria).toBe(2);
    expect(diff.summary).toContain('requirement');
  });
});

describe('unresolved assumptions', () => {
  it('lists each repeated assumption once in the prompt', () => {
    const base = req('r1', 'REQ-001', 'Employees must save their profile.', 'approved');
    const suggestion = {
      id: 's1', projectId: 'p1', requirementId: 'r1', requirementCode: 'REQ-001',
      type: 'edge_case' as const, title: 'Unauthorized access', detail: '', question: 'Who may proceed?',
      recommendation: '', status: 'pending_review' as const, source: 'deterministic' as const,
      createdAt: new Date().toISOString(),
    };
    const result = generateProfessionalPrompt({
      projectName: 'Portal', requirements: [base],
      suggestions: [suggestion, { ...suggestion, id: 's2' }, { ...suggestion, id: 's3', requirementCode: 'REQ-002' }],
      criteria: [],
    });
    const occurrences = result.prompt.split('Unauthorized access:').length - 1;
    expect(occurrences).toBe(1);
  });
});
