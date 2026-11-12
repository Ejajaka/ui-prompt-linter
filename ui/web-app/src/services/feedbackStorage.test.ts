import test from 'node:test';
import assert from 'node:assert/strict';
import { recordFeedback, getFeedback, clearFeedback } from './feedbackStorage.ts';

const memory: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (key: string) => (key in memory ? memory[key] : null),
  setItem: (key: string, value: string) => { memory[key] = value; },
  removeItem: (key: string) => { delete memory[key]; }
};

test('feedback: records helpful and false-positive verdicts', () => {
  clearFeedback();
  recordFeedback('Create an S3 bucket.', 'encryption_at_rest', 'Encryption at rest', 'helpful');
  recordFeedback('Create an S3 bucket.', 'public_access_block', 'Public access', 'false_positive');
  const entries = getFeedback();
  assert.equal(entries.length, 2);
  assert.equal(entries[0].verdict, 'helpful');
  assert.equal(entries[1].verdict, 'false_positive');
});

test('feedback: caps storage at 500 entries', () => {
  clearFeedback();
  for (let i = 0; i < 510; i++) {
    recordFeedback('p', 'id-' + i, 'label', 'not_applicable');
  }
  assert.equal(getFeedback().length, 500);
});
