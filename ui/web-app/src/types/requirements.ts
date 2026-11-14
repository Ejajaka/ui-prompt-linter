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
