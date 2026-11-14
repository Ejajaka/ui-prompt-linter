import type { RequirementRecord } from '../../types/requirements.ts';
import type { FindingEvidence, FindingSeverity, FindingType, RequirementFinding } from '../../types/requirementIntelligence.ts';
import { supabase } from '../supabase/client.ts';

interface LlmFinding {
  type: FindingType;
  severity: FindingSeverity;
  title: string;
  detail: string;
  whyItMatters: string;
  affectedRequirementIds: string[];
  evidenceRequirementIds: string[];
  source: 'llm';
  status: 'pending_review';
}

export async function reviewRequirementsWithLlm(
  projectId: string,
  requirements: RequirementRecord[],
): Promise<RequirementFinding[]> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke('analyze-requirements', {
    body: { projectId },
  });
  if (error) throw new Error(error.message || 'AI requirement review is unavailable.');
  const byId = new Map(requirements.map((requirement) => [requirement.id, requirement]));
  const raw = Array.isArray((data as any)?.findings) ? (data as any).findings as LlmFinding[] : [];
  return raw
    .filter((finding) => ['ambiguity', 'conflict', 'dependency'].includes(finding.type))
    .map((finding, index) => {
      const affected = finding.affectedRequirementIds.filter((id) => byId.has(id));
      const evidenceIds = (finding.evidenceRequirementIds || affected).filter((id) => byId.has(id));
      const evidence: FindingEvidence[] = evidenceIds.map((id) => {
        const requirement = byId.get(id)!;
        return {
          requirementId: requirement.id,
          requirementCode: requirement.requirementCode,
          text: requirement.originalText,
          sourcePage: requirement.sourcePage,
        };
      });
      return {
        id: `llm-${projectId.slice(0, 8)}-${index}-${finding.type}`,
        type: finding.type,
        severity: finding.severity,
        title: finding.title,
        detail: finding.detail,
        whyItMatters: finding.whyItMatters,
        affectedRequirementIds: affected,
        evidence,
        source: 'llm' as const,
        status: 'pending_review' as const,
      };
    })
    .filter((finding) => finding.affectedRequirementIds.length > 0);
}
