import type { RequirementRecord } from './requirements.ts';

export type GraphNodeKind = 'requirement' | 'screen' | 'component' | 'role' | 'interaction';
export type GraphEdgeKind = 'belongs_to' | 'implements' | 'depends_on' | 'triggers' | 'conflicts_with' | 'related_to';

export interface RequirementGraphNode {
  id: string;
  kind: GraphNodeKind;
  label: string;
  requirementId?: string;
}

export interface RequirementGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphEdgeKind;
  label: string;
}

export interface RequirementGraph {
  nodes: RequirementGraphNode[];
  edges: RequirementGraphEdge[];
}

export type FindingType = 'ambiguity' | 'conflict' | 'dependency';
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';
export type FindingSource = 'deterministic' | 'llm';

export interface FindingEvidence {
  requirementId: string;
  requirementCode: string;
  text: string;
  sourcePage: number | null;
}

export interface RequirementFinding {
  id: string;
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  detail: string;
  whyItMatters: string;
  affectedRequirementIds: string[];
  evidence: FindingEvidence[];
  source: FindingSource;
  status: 'pending_review' | 'needs_clarification' | 'approved' | 'rejected';
}

export interface DependencyCycle {
  requirementIds: string[];
  codes: string[];
}

export interface RequirementAnalysisResult {
  graph: RequirementGraph;
  findings: RequirementFinding[];
  cycles: DependencyCycle[];
  generatedAt: string;
  requirements: RequirementRecord[];
}
