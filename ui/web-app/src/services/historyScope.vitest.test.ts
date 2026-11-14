import { beforeEach, describe, expect, it } from 'vitest';
import { historyStorage } from './historyStorage.ts';
import type { AnalysisResult } from '../types/analysis.ts';

function record(id: string, projectId?: string): AnalysisResult {
  return {
    id,
    projectId,
    prompt: `Prompt ${id}`,
    riskScore: 40,
    riskLevel: 'MEDIUM',
    coverageScore: 60,
    confidenceScore: 80,
    resources: [],
    mentioned: [],
    missing: [],
    riskyFindings: [],
    feedback: [],
    createdAt: '2026-11-14T10:00:00Z',
  };
}

describe('project-scoped analysis history', () => {
  beforeEach(() => {
    historyStorage.clear();
  });

  it('never mixes analyses between projects', () => {
    historyStorage.save(record('a', 'project-1'));
    historyStorage.save(record('b', 'project-2'));
    historyStorage.save(record('legacy'));

    expect(historyStorage.getAll('project-1').map((item) => item.id)).toEqual(['a']);
    expect(historyStorage.getAll('project-2').map((item) => item.id)).toEqual(['b']);
    expect(historyStorage.getAll()).toHaveLength(3);
    expect(historyStorage.getUnscoped().map((item) => item.id)).toEqual(['legacy']);

    expect(historyStorage.filterAndSort({ projectId: 'project-1' })).toHaveLength(1);
    expect(historyStorage.filterAndSort({ projectId: 'missing' })).toHaveLength(0);
  });

  it('clears only one project and can attach legacy records', () => {
    historyStorage.save(record('a', 'project-1'));
    historyStorage.save(record('b', 'project-2'));
    historyStorage.save(record('legacy'));

    expect(historyStorage.assignProject('project-1')).toBe(1);
    expect(historyStorage.getUnscoped()).toHaveLength(0);
    expect(historyStorage.getAll('project-1').map((item) => item.id).sort()).toEqual(['a', 'legacy']);

    historyStorage.clear('project-1');
    expect(historyStorage.getAll('project-1')).toHaveLength(0);
    expect(historyStorage.getAll('project-2').map((item) => item.id)).toEqual(['b']);
  });
});
