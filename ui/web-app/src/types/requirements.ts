export type RequirementKind = 'functional' | 'non_functional';
export type RequirementStatus = 'pending_review' | 'approved' | 'rejected' | 'needs_clarification' | 'modified';
export type RequirementPriority = 'critical' | 'high' | 'medium' | 'low';
export type DocumentStatus = 'processing' | 'parsed' | 'failed';

export interface RequirementMetadata {
  screens: string[];
  components: string[];
  roles: string[];
  behaviours: string[];
  fileName?: string;
}

export interface RequirementDraft {
  requirementCode: string;
  originalText: string;
  normalizedText: string;
  kind: RequirementKind;
  sourcePage: number | null;
  sourceParagraph: number | null;
  sourceCharStart: number;
  sourceCharEnd: number;
  metadata: RequirementMetadata;
}

export interface RequirementRecord extends RequirementDraft {
  id: string;
  projectId: string;
  documentId: string | null;
  status: RequirementStatus;
  priority: RequirementPriority;
  priorityReason: string | null;
  createdAt: string;
}

export interface RequirementDocument {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string | null;
  storagePath: string;
  extractedText: string | null;
  pageCount: number | null;
  status: DocumentStatus;
  errorMessage: string | null;
  createdAt: string;
}

export interface ExtractedDocument {
  text: string;
  pages: string[];
  pageCount: number;
  fileName: string;
  mimeType: string;
}

export interface RequirementRow {
  id: string;
  project_id: string;
  document_id: string | null;
  requirement_code: string;
  original_text: string;
  normalized_text: string;
  kind: RequirementKind;
  status: RequirementStatus;
  priority: RequirementPriority;
  priority_reason: string | null;
  source_page: number | null;
  source_paragraph: number | null;
  source_char_start: number | null;
  source_char_end: number | null;
  metadata: RequirementMetadata | null;
  created_at: string;
}


export type SuggestionType = 'implicit_behavior' | 'edge_case';
export type SuggestionStatus = 'pending_review' | 'accepted' | 'rejected' | 'modified';
export type SuggestionSource = 'deterministic' | 'llm';

export interface RequirementSuggestion {
  id: string;
  projectId: string;
  requirementId: string | null;
  requirementCode: string | null;
  type: SuggestionType;
  title: string;
  detail: string;
  question: string;
  recommendation: string;
  status: SuggestionStatus;
  source: SuggestionSource;
  createdAt: string;
}

export interface AcceptanceCriterion {
  id: string;
  projectId: string;
  requirementId: string;
  requirementCode: string;
  given: string;
  when: string;
  then: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'modified';
  source: 'company' | 'ai_inferred' | 'user';
  createdAt: string;
}

export interface AcceptanceCriterionRow {
  id: string;
  project_id: string;
  requirement_id: string;
  given_text: string;
  when_text: string;
  then_text: string;
  status: AcceptanceCriterion['status'];
  source: AcceptanceCriterion['source'];
  created_at: string;
}
