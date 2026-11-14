import { describe, expect, it } from 'vitest';
import { generateSuggestions } from './suggestions.ts';
import { generateAcceptanceCriteria } from './acceptance.ts';
import type { RequirementRecord } from '../../types/requirements.ts';

function requirement(id: string, text: string): RequirementRecord {
  return {
    id,
    projectId: 'project-1',
    documentId: 'document-1',
    requirementCode: 'REQ-001',
    originalText: text,
    normalizedText: text,
    kind: 'functional',
    status: 'pending_review',
    priority: 'medium',
    priorityReason: null,
    sourcePage: 1,
    sourceParagraph: 1,
    sourceCharStart: 0,
    sourceCharEnd: text.length,
    metadata: { screens: ['Profile'], components: ['form'], roles: ['Employee'], behaviours: ['submit'] },
    createdAt: new Date().toISOString(),
  };
}

describe('requirement suggestions', () => {
  it('suggests relevant failure and permission edge cases', () => {
    const suggestions = generateSuggestions([requirement('r1', 'Employees must submit the profile form.')], 'project-1');
    expect(suggestions.some((item) => /failure/i.test(item.title))).toBe(true);
    expect(suggestions.some((item) => /Duplicate submission/i.test(item.title))).toBe(true);
    expect(suggestions.some((item) => /Unauthorized access/i.test(item.title))).toBe(true);
    expect(suggestions.every((item) => item.status === 'pending_review')).toBe(true);
  });
});

describe('acceptance criteria', () => {
  it('compiles Given/When/Then criteria linked to the requirement', () => {
    const criteria = generateAcceptanceCriteria([requirement('r1', 'Employees must submit the profile form.')], 'project-1');
    expect(criteria.length).toBeGreaterThanOrEqual(3);
    expect(criteria[0].requirementId).toBe('r1');
    expect(criteria[0].given).toMatch(/^Given/);
    expect(criteria[0].when).toMatch(/^when/);
    expect(criteria[0].then).toMatch(/^then/);
    expect(new Set(criteria.map((item) => item.id)).size).toBe(criteria.length);
  });
});
