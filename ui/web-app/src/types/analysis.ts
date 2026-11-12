export type RiskLevel = 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FindingSource = 'rule' | 'ai';

export interface AnalysisResource {
  id: string;
  label: string;
  category?: string;
}

export interface SecurityFinding {
  id: string;
  label: string;
  description: string;
  severity: FindingSeverity;
  dimension?: string;
  tier?: 'core' | 'clarify' | 'harden';
  clause?: string;
  fix?: string;
  appliesTo?: string[];
  source?: FindingSource;
  evidence?: string[];
  status?: 'confirmed' | 'rejected' | 'unknown';
  explicitlyRisky?: boolean;
  selected?: boolean;
  whyItMatters?: string;
  riskyStatement?: string;
}

export interface PromptIssue {
  id?: string;
  kind?: string;
  label: string;
  description?: string;
  fix?: string;
  severity?: string;
}

export interface AnalysisResult {
  id: string;
  prompt: string;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  coverageScore: number; // 0 - 100 %
  confidenceScore: number; // heuristic 0 - 100, not a calibrated probability
  resources: AnalysisResource[];
  mentioned: SecurityFinding[];
  missing: SecurityFinding[];
  riskyFindings: SecurityFinding[];
  feedback: string[];
  blocked?: boolean;
  outOfScope?: boolean;
  predictionStatus?: 'confirmed' | 'needs_clarification' | 'needs_ai_validation' | 'blocked' | 'rejected';
  actionability?: string;
  confidenceKind?: 'heuristic';
  riskKind?: 'rule_index';
  promptIssues?: PromptIssue[];
  sanity?: { verdict?: string; score?: number; issues?: number };
  typos?: Array<{ from: string; to: string }>;
  needsClarification?: boolean;
  clarificationQuestions?: string[];
  aiVerdict?: string | null;
  aiValidated?: boolean;
  requiresDeepScan?: boolean;
  createdAt?: string;
  projectedRiskScore?: number;
  projectedCoverageScore?: number;
}

export interface AnalyzerAdapter {
  analyze(prompt: string): Promise<AnalysisResult>;
  deepScan?(prompt: string): Promise<AnalysisResult>;
}

export type ActiveTab = 'about' | 'overview' | 'new-analysis' | 'history' | 'guidelines' | 'settings' | 'privacy';
