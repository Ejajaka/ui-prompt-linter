import { describe, expect, it } from 'vitest';
import type { RequirementRecord } from '../../types/requirements.ts';
import { analyzeRequirements, buildRequirementGraph } from './intelligence.ts';

function requirement(
  id: string,
  code: string,
  text: string,
  metadata: Partial<RequirementRecord['metadata']> = {},
): RequirementRecord {
  return {
    id,
    projectId: 'project-1',
    documentId: 'document-1',
    requirementCode: code,
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
    metadata: {
      screens: metadata.screens || [],
      components: metadata.components || [],
      roles: metadata.roles || [],
      behaviours: metadata.behaviours || [],
    },
    createdAt: new Date().toISOString(),
  };
}

describe('requirement intelligence', () => {
  it('builds requirement, screen, component and role nodes', () => {
    const req = requirement('r1', 'REQ-001', 'The dashboard page must show employee statistics.', {
      screens: ['Dashboard'],
      components: ['dashboard'],
      roles: ['Employees'],
      behaviours: ['show'],
    });
    const graph = buildRequirementGraph([req]);
    expect(graph.nodes.some((node) => node.kind === 'requirement')).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'screen' && node.label === 'Dashboard')).toBe(true);
    expect(graph.nodes.some((node) => node.kind === 'component')).toBe(true);
    expect(graph.edges.some((edge) => edge.kind === 'belongs_to')).toBe(true);
  });

  it('detects mandatory vs optional field conflicts', () => {
    const a = requirement('r1', 'REQ-001', 'The email field is mandatory on the profile page.', {
      screens: ['Profile'],
      components: ['input'],
    });
    const b = requirement('r2', 'REQ-002', 'The email field is optional on the profile page.', {
      screens: ['Profile'],
      components: ['input'],
    });
    const result = analyzeRequirements([a, b]);
    expect(result.findings.some((finding) => finding.type === 'conflict')).toBe(true);
    expect(result.graph.edges.some((edge) => edge.kind === 'conflicts_with')).toBe(true);
  });

  it('detects explicit dependencies and circular dependencies', () => {
    const a = requirement('r1', 'REQ-001', 'The checkout requires payment processing.');
    const b = requirement('r2', 'REQ-002', 'Payment processing requires the checkout.');
    const result = analyzeRequirements([a, b]);
    expect(result.findings.some((finding) => finding.type === 'dependency')).toBe(true);
    expect(result.cycles.length).toBeGreaterThan(0);
    expect(result.findings.some((finding) => /Circular dependency/.test(finding.title))).toBe(true);
  });

  it('detects an unspecified button action and missing responsive behaviour', () => {
    const req = requirement('r1', 'REQ-001', 'Add a button on the settings page.');
    const result = analyzeRequirements([req]);
    expect(result.findings.some((finding) => /Button action/.test(finding.title))).toBe(true);
    expect(result.findings.some((finding) => /Responsive behaviour/.test(finding.title))).toBe(true);
  });
});
