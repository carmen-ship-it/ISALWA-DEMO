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
import { parseStoredRolePreview } from '@/lib/role-preview/storage';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';
import { previewScopesForPersona } from '@/lib/role-preview/presets';

export type EvaluationCommercialVisibility = 'own' | 'team' | 'org';

export type EvaluationProjection = {
  active: boolean;
  persona: RolePreviewPersonaId | null;
  /** Required when persona === 'asesor' — which synthetic advisor slice. */
  subjectMemberId: string | null;
  readOnly: boolean;
  commercialVisibility: EvaluationCommercialVisibility | null;
  /** Scopes used for presentation / lens; subset of real; never sent as elevation. */
  presentationScopes: readonly string[];
};

const SUBJECT_SEP = '::';

export function encodeEvaluationProjectionCookie(
  persona: RolePreviewPersonaId | null,
  subjectMemberId?: string | null,
): string | null {
  if (!persona) return null;
  if (persona === 'asesor' && subjectMemberId?.trim()) {
    return `${persona}${SUBJECT_SEP}${subjectMemberId.trim()}`;
  }
  return persona;
}

export function parseEvaluationProjectionCookie(raw: string | null | undefined): {
  persona: RolePreviewPersonaId | null;
  subjectMemberId: string | null;
} {
  if (!raw) return { persona: null, subjectMemberId: null };
  const decoded = decodeURIComponent(raw);
  const sep = decoded.indexOf(SUBJECT_SEP);
  if (sep > 0) {
    const persona = parseStoredRolePreview(decoded.slice(0, sep));
    const subjectMemberId = decoded.slice(sep + SUBJECT_SEP.length).trim() || null;
    return { persona, subjectMemberId: persona === 'asesor' ? subjectMemberId : null };
  }
  return { persona: parseStoredRolePreview(decoded), subjectMemberId: null };
}

export function commercialVisibilityForPersona(
  persona: RolePreviewPersonaId | null,
): EvaluationCommercialVisibility | null {
  if (!persona) return null;
  switch (persona) {
    case 'asesor':
      return 'own';
    case 'jefe-comercial':
      return 'team';
    case 'gerencia':
      return 'org';
    default:
      return null;
  }
}

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
