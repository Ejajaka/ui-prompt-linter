import test from 'node:test';
import assert from 'node:assert/strict';
import { historyStorage } from './historyStorage.ts';
import type { AnalysisResult } from '../types/analysis.ts';

test('historyStorage filters by search query and risk level', () => {
  const itemA: AnalysisResult = {
    id: 'test-1',
    prompt: 'Deploy an EC2 instance in a VPC',
    riskScore: 30,
    riskLevel: 'LOW',
    coverageScore: 80,
    confidenceScore: 90,
    resources: [{ id: 'ec2', label: 'Amazon EC2' }],
    mentioned: [],
    missing: [],
    riskyFindings: [],
    feedback: [],
    createdAt: '2026-10-17T10:00:00Z'
  };

  const itemB: AnalysisResult = {
    id: 'test-2',
    prompt: 'Create a public S3 bucket with 0.0.0.0/0 ingress',
    riskScore: 85,
    riskLevel: 'CRITICAL',
    coverageScore: 20,
    confidenceScore: 85,
    resources: [{ id: 's3', label: 'Amazon S3' }],
    mentioned: [],
    missing: [],
    riskyFindings: [],
    feedback: [],
    createdAt: '2026-10-17T12:00:00Z'
  };

  historyStorage.clear();
  historyStorage.save(itemA);
  historyStorage.save(itemB);

  // Search by prompt text
  const searchResults = historyStorage.filterAndSort({ search: 'public S3' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].id, 'test-2');

  // Filter by risk
  const criticalResults = historyStorage.filterAndSort({ riskFilter: 'CRITICAL' });
  assert.equal(criticalResults.length, 1);
  assert.equal(criticalResults[0].id, 'test-2');

  // Sort by risk descending
  const sortedByRisk = historyStorage.filterAndSort({ sortBy: 'risk_desc' });
  assert.equal(sortedByRisk[0].riskScore, 85);
  assert.equal(sortedByRisk[1].riskScore, 30);
});
