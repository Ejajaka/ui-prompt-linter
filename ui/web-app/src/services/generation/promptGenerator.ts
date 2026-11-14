import type {
  AcceptanceCriterion,
  RequirementRecord,
  RequirementSuggestion,
} from '../../types/requirements.ts';
import type { DesignSystem } from '../../types/designSystem.ts';
import { DEFAULT_DESIGN_SYSTEM } from '../../types/designSystem.ts';

export interface SpecificationInput {
  projectName: string;
  requirements: RequirementRecord[];
  suggestions: RequirementSuggestion[];
  criteria: AcceptanceCriterion[];
  designSystem?: DesignSystem;
  platform?: string;
  applicationType?: string;
}

export interface Specification {
  status: string;
  taskTitle: string;
  category: string;
  platform: string;
  applicationType: string;
  objective: string;
  problemStatement: string;
  confirmedRequirementIds: string[];
  pendingRequirementIds: string[];
  approvedSuggestionIds: string[];
  unresolvedSuggestionIds: string[];
  acceptanceCriterionIds: string[];
  includedRequirementCodes: string[];
  includedCriterionCount: number;
}

function requirementLine(requirement: RequirementRecord, pending = false): string {
  const prefix = pending ? 'Pending review: ' : '';
  const kind = requirement.kind === 'non_functional' ? 'Non-functional' : 'Functional';
  return `- ${prefix}[${requirement.requirementCode}] (${kind}, ${requirement.priority}) ${requirement.originalText}`;
}

function screens(input: SpecificationInput): string[] {
  const values = new Set<string>();
  for (const requirement of input.requirements) {
    for (const screen of requirement.metadata.screens || []) values.add(screen);
  }
  return [...values];
}

function components(input: SpecificationInput): string[] {
  const values = new Set<string>();
  for (const requirement of input.requirements) {
    for (const component of requirement.metadata.components || []) values.add(component);
  }
  return [...values];
}

export function buildSpecification(input: SpecificationInput): Specification {
  const design = input.designSystem || DEFAULT_DESIGN_SYSTEM;
  const approvedRequirements = input.requirements.filter((requirement) => requirement.status === 'approved');
  const pendingRequirements = input.requirements.filter((requirement) => requirement.status !== 'approved' && requirement.status !== 'rejected');
  const confirmed = approvedRequirements.length ? approvedRequirements : pendingRequirements;
  const isDraft = approvedRequirements.length === 0;
  const acceptedSuggestions = input.suggestions.filter((suggestion) => suggestion.status === 'accepted');
  const unresolvedSuggestions = input.suggestions.filter((suggestion) => suggestion.status === 'pending_review');
  const approvedCriteria = input.criteria.filter((criterion) => criterion.status === 'approved');
  const fallbackCriteria = input.criteria.filter((criterion) => criterion.status === 'pending_review');
  const criteria = approvedCriteria.length ? approvedCriteria : fallbackCriteria;
  const screenNames = screens(input);
  const componentNames = components(input);

  return {
    status: isDraft ? 'Draft - pending requirement approval' : 'Ready for design',
    taskTitle: input.projectName || 'UI/UX design task',
    category: 'UI/UX Design',
    platform: input.platform || 'Responsive web',
    applicationType: input.applicationType || 'Web application',
    objective: `Design a complete, accessible ${input.applicationType || 'web application'} interface for ${input.projectName} that fulfils the confirmed company requirements and is ready for UI generation.`,
    problemStatement:
      'The company requirements need to be turned into a coherent, unambiguous interface specification before design or code generation. Missing states, conflicting rules and unresolved assumptions can otherwise produce an incomplete interface.',
    confirmedRequirementIds: confirmed.map((requirement) => requirement.id),
    pendingRequirementIds: isDraft ? [] : pendingRequirements.map((requirement) => requirement.id),
    approvedSuggestionIds: acceptedSuggestions.map((suggestion) => suggestion.id),
    unresolvedSuggestionIds: unresolvedSuggestions.map((suggestion) => suggestion.id),
    acceptanceCriterionIds: criteria.map((criterion) => criterion.id),
    includedRequirementCodes: confirmed.map((requirement) => requirement.requirementCode),
    includedCriterionCount: criteria.length,
    designSystemId: design.id,
    screens: screenNames,
    components: componentNames,
  } as Specification & { designSystemId: string; screens: string[]; components: string[] };
}

export function generateProfessionalPrompt(input: SpecificationInput): { prompt: string; specification: Specification } {
  const design = input.designSystem || DEFAULT_DESIGN_SYSTEM;
  const specification = buildSpecification({ ...input, designSystem: design });
  const approved = input.requirements.filter((requirement) => requirement.status === 'approved');
  const pending = input.requirements.filter((requirement) => requirement.status !== 'approved' && requirement.status !== 'rejected');
  const shownRequirements = approved.length ? approved : pending;
  const isDraft = approved.length === 0;
  const accepted = input.suggestions.filter((suggestion) => suggestion.status === 'accepted');
  const unresolved = input.suggestions.filter((suggestion) => suggestion.status === 'pending_review');
  const approvedCriteria = input.criteria.filter((criterion) => criterion.status === 'approved');
  const criteria = approvedCriteria.length ? approvedCriteria : input.criteria.filter((criterion) => criterion.status === 'pending_review');
  const screenNames = screens(input);
  const componentNames = components(input);
  const deliverables = [
    screenNames.length ? `Required screens: ${screenNames.join(', ')}.` : 'Required screens and states derived from the confirmed requirements.',
    'Low-fidelity wireframes for every screen and key state.',
    'High-fidelity UI designs using the selected design system.',
    'Interactive prototype covering primary flows, validation, empty, loading and error states.',
    componentNames.length ? `Reusable components: ${componentNames.join(', ')}.` : 'A reusable component inventory.',
  ];

  const lines: string[] = [
    'UI/UX Design Task',
    '',
    specification.status,
    '',
    specification.taskTitle,
    '',
    specification.category,
    specification.platform,
    specification.applicationType,
    '',
    '1. Objective',
    '',
    specification.objective,
    '',
    '2. Problem Statement',
    '',
    specification.problemStatement,
    '',
    '3. Requirements',
    '',
  ];

  if (shownRequirements.length) {
    if (isDraft) lines.push('The following requirements are still pending approval. Treat this prompt as a draft until they are approved.', '');
    for (const requirement of shownRequirements) lines.push(requirementLine(requirement, isDraft));
  } else {
    lines.push('- No compiled requirements are available yet.');
  }

  if (accepted.length) {
    lines.push('', 'Approved suggestions (not original company requirements):');
    for (const suggestion of accepted) lines.push(`- [${suggestion.requirementCode || 'suggestion'}] ${suggestion.recommendation}`);
  }
  if (unresolved.length) {
    lines.push('', 'Unresolved assumptions (do not treat as confirmed):');
    for (const suggestion of unresolved.slice(0, 10)) lines.push(`- ${suggestion.title}: ${suggestion.question}`);
  }

  lines.push(
    '',
    '4. Design Guidelines',
    '',
    `- Visual style: ${design.tokens.componentStyles}`,
    `- Colour palette: primary ${design.tokens.primaryColor}; secondary ${design.tokens.secondaryColor}; accent ${design.tokens.accentColor}`,
    `- Typography: ${design.tokens.typography}; sizes ${design.tokens.fontSizes}`,
    `- Layout and spacing: ${design.tokens.spacing}`,
    `- Border radius: ${design.tokens.borderRadius}`,
    `- Shadows: ${design.tokens.shadows}`,
    `- Buttons: ${design.tokens.buttonStyles}`,
    `- Inputs: ${design.tokens.inputStyles}`,
    `- Navigation: ${design.tokens.navigationPattern}`,
    `- Responsiveness: ${design.tokens.responsiveBreakpoints}`,
    `- Accessibility: meet WCAG AA contrast, keyboard navigation, visible focus and semantic labels.`,
    `- Brand guidelines: ${design.tokens.brandGuidelines}`,
    '',
    '5. Deliverables',
    '',
    ...deliverables.map((item) => `- ${item}`),
    '',
    '6. Acceptance Criteria',
    '',
  );

  if (criteria.length) {
    for (const criterion of criteria) {
      lines.push(`- Given ${criterion.given.replace(/^Given\s+/i, '')}, when ${criterion.when.replace(/^when\s+/i, '')}, then ${criterion.then.replace(/^then\s+/i, '')}.`);
    }
  } else {
    lines.push('- No measurable acceptance criteria have been approved or generated yet.');
  }

  lines.push(
    '',
    'Constraints:',
    '- Do not invent company requirements, screens, roles or data that are not present in the confirmed inputs.',
    '- Clearly mark any unresolved assumption rather than silently filling it.',
    '- Preserve the selected design system unless a documented accessibility need requires an adjustment.',
  );

  return { prompt: lines.join('\n'), specification };
}
