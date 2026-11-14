import type { AcceptanceCriterion, RequirementRecord } from '../../types/requirements.ts';

function stableUuid(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const blocks = [hash, Math.imul(hash, 31), Math.imul(hash, 131), Math.imul(hash, 7)]
    .map((part) => (part >>> 0).toString(16).padStart(8, '0'));
  const hex = blocks.join('').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function role(requirement: RequirementRecord): string {
  return requirement.metadata.roles?.[0] || 'authorized user';
}

function subject(requirement: RequirementRecord): string {
  return requirement.metadata.screens?.[0] || requirement.metadata.components?.[0] || 'the interface';
}

function action(requirement: RequirementRecord): string {
  const text = requirement.normalizedText.replace(/\.$/, '');
  return text.length > 140 ? `${text.slice(0, 137)}…` : text;
}

export function generateAcceptanceCriteria(
  requirements: RequirementRecord[],
  projectId: string,
): AcceptanceCriterion[] {
  const criteria: AcceptanceCriterion[] = [];
  const add = (
    requirement: RequirementRecord,
    key: string,
    given: string,
    when: string,
    then: string,
  ) => {
    criteria.push({
      id: stableUuid(`${requirement.id}|${key}`),
      projectId,
      requirementId: requirement.id,
      requirementCode: requirement.requirementCode,
      given,
      when,
      then,
      status: 'pending_review',
      source: 'ai_inferred',
      createdAt: new Date().toISOString(),
    });
  };

  for (const requirement of requirements) {
    const who = role(requirement);
    const where = subject(requirement);
    const act = action(requirement);
    const text = requirement.normalizedText;

    if (/\b(form|input|field|submit|save)\b/i.test(text)) {
      add(
        requirement,
        'valid-submit',
        `Given an authenticated ${who} on ${where}`,
        'when they submit valid information',
        'then the changes should be saved and a clear success state should be shown',
      );
      add(
        requirement,
        'invalid-submit',
        `Given an authenticated ${who} on ${where}`,
        'when they submit invalid or missing information',
        'then the form should show specific validation errors and preserve their input',
      );
    } else if (/\b(login|sign in|sign-in|password|authenticate)\b/i.test(text)) {
      add(
        requirement,
        'valid-auth',
        'Given valid credentials and an available authentication service',
        'when the user signs in',
        'then a session should be created and the user should reach the intended screen',
      );
      add(
        requirement,
        'invalid-auth',
        'Given invalid credentials or an expired session',
        'when the user attempts to access a protected action',
        'then access should be denied and a safe sign-in state should be shown',
      );
    } else if (/\b(search|filter|list|table|dashboard|report)\b/i.test(text)) {
      add(
        requirement,
        'data-loaded',
        `Given an authenticated ${who} and available data on ${where}`,
        'when the view loads',
        'then the requested data should be displayed with a clear loading state before it arrives',
      );
      add(
        requirement,
        'empty-data',
        `Given an authenticated ${who} and no matching data on ${where}`,
        'when the view loads',
        'then a specific empty state should be shown without presenting false zero values',
      );
    } else {
      add(
        requirement,
        'main-path',
        `Given an authenticated ${who} on ${where}`,
        `when they perform the action described by ${requirement.requirementCode}`,
        `then ${act}`,
      );
    }

    if (/\b(admin|administrator|manager|role|permission)\b/i.test(text) || (requirement.metadata.roles || []).length > 0) {
      add(
        requirement,
        'unauthorized',
        `Given an authenticated user without the required role for ${where}`,
        'when they attempt the protected action',
        'then the system should deny access without exposing protected data',
      );
    }
    if (criteria.length >= 120) break;
  }

  return criteria;
}
