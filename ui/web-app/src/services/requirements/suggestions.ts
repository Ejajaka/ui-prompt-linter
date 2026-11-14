import type { RequirementRecord, RequirementSuggestion, SuggestionType } from '../../types/requirements.ts';

interface Rule {
  test: (text: string, requirement: RequirementRecord) => boolean;
  type: SuggestionType;
  title: string;
  detail: string;
  question: string;
  recommendation: string;
}

const RULES: Rule[] = [
  {
    test: (text) => /\b(form|submit|save|create|update)\b/i.test(text),
    type: 'implicit_behavior',
    title: 'Submission failure state',
    detail: 'The requirement describes a submission but not what happens when the request fails.',
    question: 'What should the interface show if submission fails or the network is unavailable?',
    recommendation: 'Show an inline error, preserve entered values, and provide a retry action.',
  },
  {
    test: (text) => /\b(form|submit|save|create|update)\b/i.test(text),
    type: 'edge_case',
    title: 'Duplicate submission',
    detail: 'The user may click submit repeatedly before the first request completes.',
    question: 'Should the submit button be disabled or the request deduplicated while pending?',
    recommendation: 'Disable the submit action while pending and show a progress state.',
  },
  {
    test: (text) => /\b(form|submit|save|create|update)\b/i.test(text),
    type: 'implicit_behavior',
    title: 'Success confirmation',
    detail: 'The requirement does not describe how the user knows the action succeeded.',
    question: 'Should success be communicated with a toast, redirect, inline message or updated view?',
    recommendation: 'Use a clear success message and move the user to the next logical state.',
  },
  {
    test: (text) => /\b(search|filter|query)\b/i.test(text),
    type: 'edge_case',
    title: 'No search results',
    detail: 'The requirement describes search or filtering but not the empty-result experience.',
    question: 'What should be shown when no results match?',
    recommendation: 'Show a specific empty state with the active query and a clear-reset action.',
  },
  {
    test: (text) => /\b(search|filter|query)\b/i.test(text),
    type: 'implicit_behavior',
    title: 'Search loading state',
    detail: 'Search results may take time to load.',
    question: 'What loading feedback should appear while results are fetched?',
    recommendation: 'Preserve the current results and show a non-blocking loading indicator.',
  },
  {
    test: (text) => /\b(login|sign in|sign-in|password|authenticate)\b/i.test(text),
    type: 'edge_case',
    title: 'Invalid or expired session',
    detail: 'Authentication has failure and expiry states that are not specified.',
    question: 'What should happen when credentials are invalid or the session expires?',
    recommendation: 'Show a safe error, clear protected data, and redirect to sign-in with a return path.',
  },
  {
    test: (text, requirement) => /\b(admin|administrator|manager|role|permission)\b/i.test(text) || (requirement.metadata.roles || []).length > 0,
    type: 'edge_case',
    title: 'Unauthorized access',
    detail: 'A role or permission boundary is referenced without an unauthorized state.',
    question: 'What should a user without the required role see?',
    recommendation: 'Return an access-denied state without leaking whether the underlying record exists.',
  },
  {
    test: (text) => /\b(payment|checkout|invoice|billing)\b/i.test(text),
    type: 'edge_case',
    title: 'Payment failure or retry',
    detail: 'Payment flows need explicit failure, retry and confirmation states.',
    question: 'What should happen if payment processing fails or is retried?',
    recommendation: 'Keep the order in a recoverable state and show a retry path with the provider error.',
  },
  {
    test: (text) => /\b(dashboard|statistics|report|table|list)\b/i.test(text),
    type: 'implicit_behavior',
    title: 'Loading and empty data states',
    detail: 'Data-driven views need loading, empty and error states.',
    question: 'What should the view show before data arrives, when there is no data, and when the fetch fails?',
    recommendation: 'Provide distinct loading, empty and error states without showing false zero values.',
  },
  {
    test: (text) => /\b(upload|file|document|image|attachment)\b/i.test(text),
    type: 'edge_case',
    title: 'Invalid or oversized upload',
    detail: 'File uploads need size, type and network failure handling.',
    question: 'What file types and sizes are allowed, and how are rejected files explained?',
    recommendation: 'Validate before upload and state the accepted types and maximum size.',
  },
  {
    test: (text) => /\b(mobile|responsive|tablet|page|layout|screen)\b/i.test(text),
    type: 'edge_case',
    title: 'Long content and small screens',
    detail: 'Layouts can overflow with long labels, many items or narrow screens.',
    question: 'How should long text, large datasets and mobile widths behave?',
    recommendation: 'Define wrapping, truncation, scrolling and responsive breakpoints.',
  },
  {
    test: (text) => /\b(button|click|tap|action)\b/i.test(text),
    type: 'implicit_behavior',
    title: 'Repeated interaction handling',
    detail: 'The interaction may be triggered repeatedly or before the previous action finishes.',
    question: 'Should repeated clicks be ignored, queued or explicitly idempotent?',
    recommendation: 'Make the action idempotent and show a pending state until it completes.',
  },
];

function stableId(requirementId: string, title: string): string {
  let hash = 2166136261;
  const value = `${requirementId}|${title}`;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `suggestion-${(hash >>> 0).toString(36)}`;
}

export function generateSuggestions(requirements: RequirementRecord[], projectId: string): RequirementSuggestion[] {
  const suggestions: RequirementSuggestion[] = [];
  const seen = new Set<string>();
  for (const requirement of requirements) {
    for (const rule of RULES) {
      if (!rule.test(requirement.normalizedText, requirement)) continue;
      const key = `${requirement.id}:${rule.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: stableId(requirement.id, rule.title),
        projectId,
        requirementId: requirement.id,
        requirementCode: requirement.requirementCode,
        type: rule.type,
        title: rule.title,
        detail: rule.detail,
        question: rule.question,
        recommendation: rule.recommendation,
        status: 'pending_review',
        source: 'deterministic',
        createdAt: new Date().toISOString(),
      });
    }
  }
  return suggestions.slice(0, 80);
}
