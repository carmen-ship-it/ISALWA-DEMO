import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';

/**
 * Builds commercial list query params for Vista de evaluación narrowing.
 * Uses visibility=org + ownerMemberId for Asesor subject (Carmen has org.read).
 * Never elevates — only adds filters.
 */
export function commercialListQueryFromProjection(
  projection: EvaluationProjection,
): Record<string, string> {
  if (!projection.active || !projection.commercialVisibility) return {};

  if (projection.persona === 'asesor') {
    if (!projection.subjectMemberId) {
      // Active Asesor preview without subject → empty result force via impossible owner
      return { visibility: 'org', ownerMemberId: '__evaluation_asesor_subject_required__' };
    }
    return { visibility: 'org', ownerMemberId: projection.subjectMemberId };
  }

  if (projection.commercialVisibility === 'team') {
    return { visibility: 'team' };
  }

  if (projection.commercialVisibility === 'org') {
    return { visibility: 'org' };
  }

  return {};
}
