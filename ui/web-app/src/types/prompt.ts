export interface PromptVersionRecord {
  id: string;
  projectId: string;
  version: number;
  promptMarkdown: string;
  specification: Record<string, unknown>;
  sourceRequirementIds: string[];
  changeSummary: string | null;
  createdAt: string;
}

export interface PromptVersionRow {
  id: string;
  project_id: string;
  version: number;
  prompt_markdown: string;
  specification: Record<string, unknown>;
  source_requirement_ids: string[] | null;
  change_summary: string | null;
  created_at: string;
}

export interface VersionComparison {
  addedRequirementIds: string[];
  removedRequirementIds: string[];
  addedCriteria: number;
  removedCriteria: number;
  summary: string;
}
