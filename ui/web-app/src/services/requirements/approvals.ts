import { supabase } from '../supabase/client.ts';
import type { RequirementStatus } from '../../types/requirements.ts';

export async function recordRequirementDecision(
  projectId: string,
  requirementId: string,
  actorId: string,
  decision: Exclude<RequirementStatus, 'pending_review'>,
  reason = '',
): Promise<void> {
  if (!supabase) throw new Error('Connect Supabase to record approvals.');
  const { error: updateError } = await supabase
    .from('requirements')
    .update({ status: decision })
    .eq('id', requirementId)
    .eq('project_id', projectId);
  if (updateError) throw new Error(updateError.message);

  const { error: auditError } = await supabase.from('approvals').insert({
    project_id: projectId,
    entity_type: 'requirement',
    entity_id: requirementId,
    decision,
    actor_id: actorId,
    reason: reason || null,
  });
  if (auditError) throw new Error(auditError.message);
}

export async function recordCriterionDecision(
  projectId: string,
  criterionId: string,
  actorId: string,
  decision: 'approved' | 'rejected',
  reason = '',
): Promise<void> {
  if (!supabase) throw new Error('Connect Supabase to record approvals.');
  const { error } = await supabase.from('approvals').insert({
    project_id: projectId,
    entity_type: 'acceptance_criterion',
    entity_id: criterionId,
    decision,
    actor_id: actorId,
    reason: reason || null,
  });
  if (error) throw new Error(error.message);
}
