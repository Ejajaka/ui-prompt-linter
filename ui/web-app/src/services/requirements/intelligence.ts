import type { RequirementRecord } from '../../types/requirements.ts';
import type {
  DependencyCycle,
  FindingEvidence,
  FindingSeverity,
  FindingType,
  RequirementAnalysisResult,
  RequirementFinding,
  RequirementGraph,
  RequirementGraphEdge,
  RequirementGraphNode,
} from '../../types/requirementIntelligence.ts';

const STOP = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'must', 'should',
  'shall', 'will', 'can', 'may', 'are', 'was', 'were', 'has', 'have', 'when',
  'where', 'which', 'their', 'they', 'them', 'its', 'our', 'your', 'also',
  'only', 'each', 'every', 'all', 'any', 'not', 'but', 'page', 'screen',
]);

const ACTION_RE = /\b(add|allow|apply|authenticate|build|close|create|delete|disable|display|download|edit|enable|encrypt|ensure|fetch|filter|grant|handle|include|keep|launch|log|make|navigate|notify|open|prevent|provide|redirect|render|require|restrict|save|search|send|show|sort|store|submit|support|update|upload|validate)\b/i;
const RESPONSIVE_RE = /\b(responsive|mobile|tablet|breakpoint|desktop|viewport|small screen|adaptive)\b/i;
const VAGUE_RE = /\b(some|appropriate|nice|better|user-friendly|reasonable|modern|clean|etc\.?|as needed|and so on|proper|good)\b/i;
const VALIDATION_RE = /\b(validat|required|invalid|error|format|constraint|min(?:imum)?|max(?:imum)?|character limit|password rule)\b/i;
const PERMISSION_RE = /\b(permission|access|allowed|deny|restrict|role|only|admin|administrator|authorized|forbidden|unauthorized)\b/i;
const NAVIGATION_RE = /\b(navigate|redirect|go to|goes to|opens?|routes? to)\b/i;
const BUTTON_BEHAVIOR_RE = /\b(opens?|closes?|submits?|saves?|deletes?|navigates?|redirects?|shows?|displays?|toggles?|starts?|stops?|sends?|downloads?|uploads?|filters?|searches?|cancels?|confirms?|triggers?)\b/i;

const CONFLICT_PAIRS: Array<{ title: string; a: RegExp; b: RegExp; why: string }> = [
  {
    title: 'Mandatory vs optional field',
    a: /\b(mandatory|required|must be (?:filled|provided|entered)|cannot be empty)\b/i,
    b: /\b(optional|not required|may (?:be )?(?:left|leave) blank|can be empty)\b/i,
    why: 'Validation and submission behaviour cannot be implemented until the field is confirmed mandatory or optional.',
  },
  {
    title: 'Public vs restricted access',
    a: /\b(public|anyone|all employees|all users|everyone|unauthenticated|no login)\b/i,
    b: /\b(admin(?:istrator)?s? only|restricted to|authorized users only|logged-in users only|private)\b/i,
    why: 'The access-control rule changes who can see the screen and what permissions the implementation needs.',
  },
  {
    title: 'Fixed vs disappearing navigation',
    a: /\b(fixed|sticky|always visible|persistent|pinned)\b/i,
    b: /\b(hide|hidden|disappear|disappears|collapses?|auto-hide)\b/i,
    why: 'The navigation layout conflicts across scrolling states and must be resolved before wireframing.',
  },
  {
    title: 'Editable vs read-only',
    a: /\b(editable|can edit|allow editing|update the|modify the)\b/i,
    b: /\b(read[- ]only|cannot edit|not editable|view only)\b/i,
    why: 'The screen cannot be both editable and read-only without a role or state condition.',
  },
  {
    title: 'Automatic vs manual save',
    a: /\b(auto[- ]?save|automatic(?:ally)? save|saves? automatically)\b/i,
    b: /\b(manual save|save button|press save|click save)\b/i,
    why: 'The interaction model for persistence conflicts and affects validation, feedback and undo behaviour.',
  },
  {
    title: 'Desktop-only vs responsive requirement',
    a: /\b(desktop only|not (?:for|on) mobile|mobile not supported)\b/i,
    b: /\b(mobile|responsive|tablet|small screen)\b/i,
    why: 'The responsive scope is contradictory and changes the required layouts and breakpoints.',
  },
];

function truncate(text: string, max = 54): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function stableId(prefix: string, parts: string[]): string {
  const value = parts.join('|');
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOP.has(word))
  );
}

function evidence(requirement: RequirementRecord): FindingEvidence {
  return {
    requirementId: requirement.id,
    requirementCode: requirement.requirementCode,
    text: requirement.originalText,
    sourcePage: requirement.sourcePage,
  };
}

function sharesSubject(a: RequirementRecord, b: RequirementRecord): boolean {
  const overlap = (left: string[], right: string[]) => {
    const rightSet = new Set(right.map((value) => value.toLowerCase()));
    return left.some((value) => rightSet.has(value.toLowerCase()));
  };
  if (overlap(a.metadata.screens || [], b.metadata.screens || [])) return true;
  if (overlap(a.metadata.components || [], b.metadata.components || [])) return true;
  if (overlap(a.metadata.roles || [], b.metadata.roles || [])) return true;
  const left = words(a.normalizedText);
  const right = words(b.normalizedText);
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared >= Math.max(2, Math.min(left.size, right.size) * 0.3);
}

function severityFor(type: FindingType, title: string): FindingSeverity {
  if (type === 'conflict') return 'high';
  if (type === 'dependency' && /circular/i.test(title)) return 'critical';
  if (type === 'dependency') return 'medium';
  if (/validation|button action|permission/i.test(title)) return 'high';
  if (/navigation|responsive/i.test(title)) return 'medium';
  return 'low';
}

export function buildRequirementGraph(requirements: RequirementRecord[]): RequirementGraph {
  const nodes = new Map<string, RequirementGraphNode>();
  const edges = new Map<string, RequirementGraphEdge>();
  const addNode = (node: RequirementGraphNode) => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
  };
  const addEdge = (edge: Omit<RequirementGraphEdge, 'id'>) => {
    const id = stableId('edge', [edge.source, edge.target, edge.kind]);
    if (!edges.has(id)) edges.set(id, { ...edge, id });
  };

  for (const requirement of requirements) {
    const reqId = `req:${requirement.id}`;
    addNode({
      id: reqId,
      kind: 'requirement',
      label: `${requirement.requirementCode} · ${truncate(requirement.originalText)}`,
      requirementId: requirement.id,
    });
    for (const screen of requirement.metadata.screens || []) {
      const id = `screen:${slug(screen)}`;
      addNode({ id, kind: 'screen', label: screen });
      addEdge({ source: reqId, target: id, kind: 'belongs_to', label: 'belongs to' });
    }
    for (const component of requirement.metadata.components || []) {
      const id = `component:${slug(component)}`;
      addNode({ id, kind: 'component', label: component });
      addEdge({ source: id, target: reqId, kind: 'implements', label: 'implements' });
    }
    for (const role of requirement.metadata.roles || []) {
      const id = `role:${slug(role)}`;
      addNode({ id, kind: 'role', label: role });
      addEdge({ source: reqId, target: id, kind: 'related_to', label: 'applies to' });
    }
    for (const behaviour of requirement.metadata.behaviours || []) {
      const id = `interaction:${slug(behaviour)}`;
      addNode({ id, kind: 'interaction', label: behaviour });
      addEdge({ source: reqId, target: id, kind: 'triggers', label: 'triggers' });
    }
  }

  return { nodes: [...nodes.values()], edges: [...edges.values()] };
}

function detectConflicts(requirements: RequirementRecord[]): RequirementFinding[] {
  const findings: RequirementFinding[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < requirements.length; i += 1) {
    for (let j = i + 1; j < requirements.length; j += 1) {
      const left = requirements[i];
      const right = requirements[j];
      if (!sharesSubject(left, right)) continue;
      for (const pair of CONFLICT_PAIRS) {
        const leftA = pair.a.test(left.normalizedText);
        const leftB = pair.b.test(left.normalizedText);
        const rightA = pair.a.test(right.normalizedText);
        const rightB = pair.b.test(right.normalizedText);
        if (!((leftA && rightB) || (leftB && rightA))) continue;
        const key = `${pair.title}:${left.id}:${right.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          id: stableId('conflict', [left.id, right.id, pair.title]),
          type: 'conflict',
          severity: severityFor('conflict', pair.title),
          title: pair.title,
          detail: `“${left.originalText}” conflicts with “${right.originalText}”.`,
          whyItMatters: pair.why,
          affectedRequirementIds: [left.id, right.id],
          evidence: [evidence(left), evidence(right)],
          source: 'deterministic',
          status: 'pending_review',
        });
      }
    }
  }
  return findings;
}

function inferredDependencyTargets(requirement: RequirementRecord, requirements: RequirementRecord[]): RequirementRecord[] {
  const text = requirement.normalizedText.toLowerCase();
  const targets: RequirementRecord[] = [];
  const add = (candidate: RequirementRecord | undefined) => {
    if (candidate && candidate.id !== requirement.id && !targets.some((item) => item.id === candidate.id)) targets.push(candidate);
  };
  const has = (pattern: RegExp) => pattern.test(text);

  if (has(/\b(edit|update|change)\b.*\b(profile|account)\b/) && !has(/\b(auth|login|sign in|password)\b/)) {
    add(requirements.find((item) => /\b(auth|login|sign in|password)\b/i.test(item.normalizedText)));
  }
  if (has(/\b(dashboard|statistics|reports?)\b/) && has(/\b(employee|data|records?)\b/)) {
    add(requirements.find((item) => /\b(employee|hr)\b.*\b(data|records?|management|database)\b/i.test(item.normalizedText)));
  }
  if (has(/\b(payment|checkout)\b.*\b(confirmation|receipt|success)\b/)) {
    add(requirements.find((item) => /\b(payment|checkout)\b.*\b(processing|process|gateway|provider)\b/i.test(item.normalizedText)));
  }
  return targets;
}

function explicitDependencyTargets(requirement: RequirementRecord, requirements: RequirementRecord[]): RequirementRecord[] {
  const match = requirement.normalizedText.match(
    /\b(?:depends? on|requires?|needs?|after|before|once|only after|prerequisite(?: for)?)\s+([^.;\n]+)/i
  );
  if (!match) return [];
  const cue = words(match[1]);
  const candidates = requirements.filter((item) => item.id !== requirement.id);
  const scored = candidates
    .map((item) => {
      const target = words(item.normalizedText);
      let overlap = 0;
      for (const word of cue) if (target.has(word)) overlap += 1;
      return { item, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);
  return scored.length ? [scored[0].item] : [];
}

function findCycle(adjacency: Map<string, string[]>): string[] | null {
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const dfs = (node: string): string[] | null => {
    if (active.has(node)) {
      const start = stack.indexOf(node);
      return [...stack.slice(start), node];
    }
    if (visited.has(node)) return null;
    visited.add(node);
    active.add(node);
    stack.push(node);
    for (const next of adjacency.get(node) || []) {
      const cycle = dfs(next);
      if (cycle) return cycle;
    }
    stack.pop();
    active.delete(node);
    return null;
  };
  for (const node of adjacency.keys()) {
    const cycle = dfs(node);
    if (cycle) return cycle;
  }
  return null;
}

function detectDependencies(requirements: RequirementRecord[]): { findings: RequirementFinding[]; cycles: DependencyCycle[]; edges: RequirementGraphEdge[] } {
  const findings: RequirementFinding[] = [];
  const edges: RequirementGraphEdge[] = [];
  const adjacency = new Map<string, string[]>();
  const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const seen = new Set<string>();

  for (const requirement of requirements) {
    const targets = [
      ...explicitDependencyTargets(requirement, requirements),
      ...inferredDependencyTargets(requirement, requirements),
    ];
    for (const target of targets) {
      if (seen.has(`${requirement.id}:${target.id}`)) continue;
      seen.add(`${requirement.id}:${target.id}`);
      adjacency.set(requirement.id, [...(adjacency.get(requirement.id) || []), target.id]);
      edges.push({
        id: stableId('dep-edge', [requirement.id, target.id]),
        source: `req:${requirement.id}`,
        target: `req:${target.id}`,
        kind: 'depends_on',
        label: 'depends on',
      });
      findings.push({
        id: stableId('dependency', [requirement.id, target.id]),
        type: 'dependency',
        severity: 'medium',
        title: 'Requirement depends on a prerequisite',
        detail: `${requirement.requirementCode} depends on ${target.requirementCode}.`,
        whyItMatters: 'Implementation and testing order may be blocked until the prerequisite is available.',
        affectedRequirementIds: [requirement.id, target.id],
        evidence: [evidence(requirement), evidence(target)],
        source: 'deterministic',
        status: 'pending_review',
      });
    }
  }

  const cycles: DependencyCycle[] = [];
  const cycle = findCycle(adjacency);
  if (cycle) {
    const unique = [...new Set(cycle)];
    const records = unique.map((id) => byId.get(id)).filter(Boolean) as RequirementRecord[];
    cycles.push({ requirementIds: unique, codes: records.map((item) => item.requirementCode) });
    findings.push({
      id: stableId('cycle', unique),
      type: 'dependency',
      severity: 'critical',
      title: 'Circular dependency',
      detail: `Circular dependency detected: ${records.map((item) => item.requirementCode).join(' → ')} → ${records[0]?.requirementCode || ''}.`,
      whyItMatters: 'No requirement in the loop can be implemented or accepted independently.',
      affectedRequirementIds: unique,
      evidence: records.map(evidence),
      source: 'deterministic',
      status: 'pending_review',
    });
  }

  return { findings, cycles, edges };
}

function detectAmbiguities(requirements: RequirementRecord[]): RequirementFinding[] {
  const findings: RequirementFinding[] = [];
  const seen = new Set<string>();
  const add = (
    requirement: RequirementRecord,
    title: string,
    detail: string,
    why: string,
    severity: FindingSeverity,
  ) => {
    const key = `${requirement.id}:${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      id: stableId('ambiguity', [requirement.id, title]),
      type: 'ambiguity',
      severity,
      title,
      detail,
      whyItMatters: why,
      affectedRequirementIds: [requirement.id],
      evidence: [evidence(requirement)],
      source: 'deterministic',
      status: 'needs_clarification',
    });
  };

  for (const requirement of requirements) {
    const text = requirement.normalizedText;
    if (VAGUE_RE.test(text)) {
      add(
        requirement,
        'Ambiguous wording',
        `“${requirement.originalText}” uses subjective wording.`,
        'Different designers and implementers may interpret the requirement differently.',
        'medium',
      );
    }
    if (/\bbutton\b/i.test(text) && !BUTTON_BEHAVIOR_RE.test(text)) {
      add(
        requirement,
        'Button action unspecified',
        'The requirement mentions a button but does not state what the button does.',
        'The interaction and resulting application state are not implementable without an action.',
        'high',
      );
    }
    if (NAVIGATION_RE.test(text) && !/\b(page|screen|view|route|url|dashboard|profile|settings|home)\b/i.test(text)) {
      add(
        requirement,
        'Navigation target unclear',
        'The requirement describes navigation without naming the destination.',
        'The routing and back-navigation behaviour are ambiguous.',
        'medium',
      );
    }
    if (/\b(input|form|field|textbox|text box)\b/i.test(text) && !VALIDATION_RE.test(text)) {
      add(
        requirement,
        'Validation rules unspecified',
        'The requirement mentions data entry without validation or error behaviour.',
        'Invalid data handling, error messaging and submission rules are undefined.',
        'high',
      );
    }
    if ((requirement.metadata.roles || []).length > 0 && !PERMISSION_RE.test(text)) {
      add(
        requirement,
        'User permissions unclear',
        'A user role is named without stating what that role may see or do.',
        'Access control and row-level permissions cannot be implemented safely.',
        'high',
      );
    }
  }

  if (requirements.length && !requirements.some((requirement) => RESPONSIVE_RE.test(requirement.normalizedText))) {
    const first = requirements[0];
    findings.push({
      id: stableId('ambiguity', ['responsive', first.projectId]),
      type: 'ambiguity',
      severity: 'medium',
      title: 'Responsive behaviour unspecified',
      detail: 'No requirement states how the interface behaves on mobile, tablet or small screens.',
      whyItMatters: 'Deliverables and acceptance criteria may omit required responsive layouts.',
      affectedRequirementIds: requirements.map((requirement) => requirement.id),
      evidence: requirements.slice(0, 2).map(evidence),
      source: 'deterministic',
      status: 'needs_clarification',
    });
  }

  return findings;
}

export function analyzeRequirements(requirements: RequirementRecord[]): RequirementAnalysisResult {
  const graph = buildRequirementGraph(requirements);
  const conflicts = detectConflicts(requirements);
  const dependencies = detectDependencies(requirements);
  const ambiguities = detectAmbiguities(requirements);
  const findings = [...conflicts, ...dependencies.findings, ...ambiguities];

  for (const conflict of conflicts) {
    const [left, right] = conflict.affectedRequirementIds;
    if (!left || !right) continue;
    graph.edges.push({
      id: stableId('conflict-edge', [left, right, conflict.title]),
      source: `req:${left}`,
      target: `req:${right}`,
      kind: 'conflicts_with',
      label: 'conflicts with',
    });
  }
  graph.edges.push(...dependencies.edges);

  return {
    graph,
    findings,
    cycles: dependencies.cycles,
    generatedAt: new Date().toISOString(),
    requirements,
  };
}
