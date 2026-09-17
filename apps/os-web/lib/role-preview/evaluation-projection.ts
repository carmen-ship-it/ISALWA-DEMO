/**
 * Vista de evaluación projection — narrows READ universe; never elevates.
 * Authenticated actor remains Carmen. Mutations blocked separately.
 */
import { cookies } from 'next/headers';
import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
} from '@isalwa/os-contracts';
import { ROLE_PREVIEW_PERSONA_COOKIE } from '@/lib/role-preview/persona-cookie';
import { previewScopesForPersona } from '@/lib/role-preview/presets';
import {
  commercialVisibilityForPersona,
  parseEvaluationProjectionCookie,
  type EvaluationProjection,
} from '@/lib/role-preview/evaluation-projection-model';

export type {
  EvaluationCommercialVisibility,
  EvaluationProjection,
} from '@/lib/role-preview/evaluation-projection-model';
export {
  buildClientEvaluationProjection,
  commercialVisibilityForPersona,
  encodeEvaluationProjectionCookie,
  parseEvaluationProjectionCookie,
} from '@/lib/role-preview/evaluation-projection-model';

export async function getEvaluationProjection(): Promise<EvaluationProjection> {
  const store = await cookies();
  const raw = store.get(ROLE_PREVIEW_PERSONA_COOKIE)?.value;
  const { persona, subjectMemberId } = parseEvaluationProjectionCookie(raw);
  const active = persona !== null;
  const baseScopes = persona ? [...previewScopesForPersona(persona)] : [];
  // Gerencia preview includes management read for company factual lens (not tech admin).
  const presentationScopes =
    persona === 'gerencia'
      ? [...new Set([...baseScopes, MANAGEMENT_ORG_READ_SCOPE, COMMERCIAL_ORG_READ_SCOPE])]
      : persona === 'jefe-comercial'
        ? [...new Set([...baseScopes, COMMERCIAL_TEAM_READ_SCOPE])]
        : persona === 'entregas'
          ? [...new Set([...baseScopes, OPERATIONS_COORDINATOR_RECORD_SCOPE])]
          : baseScopes;

  return {
    active,
    persona,
    subjectMemberId: persona === 'asesor' ? subjectMemberId : null,
    readOnly: active,
    commercialVisibility: commercialVisibilityForPersona(persona),
    presentationScopes,
  };
}
