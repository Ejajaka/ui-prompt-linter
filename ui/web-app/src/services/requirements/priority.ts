import type { RequirementPriority, RequirementRecord } from '../../types/requirements.ts';
import { supabase } from '../supabase/client.ts';

export interface PriorityResult {
  priority: RequirementPriority;
  reason: string;
}

export function classifyRequirementPriority(requirement: RequirementRecord): PriorityResult {
  const text = requirement.normalizedText.toLowerCase();
  if (/\b(payment|checkout|billing|password|authentication|login|authorization|permission|security|privacy|accessibility|audit)\b/.test(text)) {
    return {
      priority: 'critical',
      reason: 'Security, money, access-control or accessibility impact makes this a critical requirement.',
    };
  }
  if (/\b(customers?|employees?|users?)\b/.test(text) && /\b(must|shall|required|need)\b/.test(text)) {
    return {
      priority: 'high',
      reason: 'It is a mandatory user-facing flow with direct business impact.',
    };
  }
  if (requirement.kind === 'functional' && (requirement.metadata.components || []).length > 0) {
    return {
      priority: 'high',
      reason: 'It describes a core functional interaction on a named component.',
    };
  }
  if (requirement.kind === 'non_functional') {
    return {
      priority: 'medium',
      reason: 'It is a quality or system constraint that supports the functional flows.',
    };
  }
  if (/\b(colou?r|spacing|font|shadow|rounded|cosmetic|style)\b/.test(text)) {
    return {
      priority: 'low',
      reason: 'It primarily affects visual polish rather than a user or business-critical flow.',
    };
  }
  return {
    priority: 'medium',
    reason: 'It supports the interface but has no explicit criticality signal.',
  };
}

export async function applyRequirementPriorities(
  projectId: string,
  requirements: RequirementRecord[],
): Promise<RequirementRecord[]> {
  const classified = requirements.map((requirement) => {
    const result = classifyRequirementPriority(requirement);
    return { ...requirement, priority: result.priority, priorityReason: result.reason };
  });

  if (supabase) {
    for (const requirement of classified) {
      const { error } = await supabase
        .from('requirements')
        .update({ priority: requirement.priority, priority_reason: requirement.priorityReason })
        .eq('id', requirement.id)
        .eq('project_id', projectId);
      if (error) throw new Error(error.message);
    }
  }
  return classified;
}
