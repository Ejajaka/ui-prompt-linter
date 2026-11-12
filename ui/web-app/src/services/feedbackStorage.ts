export type FeedbackVerdict = 'helpful' | 'false_positive' | 'not_applicable';

export interface FindingFeedback {
  prompt: string;
  findingId: string;
  label: string;
  verdict: FeedbackVerdict;
  createdAt: string;
}

const STORAGE_KEY = 'prompt_linter_feedback_v1';

export function recordFeedback(
  prompt: string,
  findingId: string,
  label: string,
  verdict: FeedbackVerdict
): FindingFeedback {
  const entry: FindingFeedback = {
    prompt,
    findingId,
    label,
    verdict,
    createdAt: new Date().toISOString()
  };
  try {
    const existing = getFeedback();
    existing.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-500)));
  } catch {
    // Private mode / quota / disabled storage: feedback is best-effort.
  }
  return entry;
}

export function getFeedback(): FindingFeedback[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearFeedback(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
