/**
 * Client-safe evaluation projection model (no next/headers).
 * Server cookie reader lives in evaluation-projection.ts.
 */
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';
import { previewScopesForPersona } from '@/lib/role-preview/presets';
import { parseStoredRolePreview } from '@/lib/role-preview/storage';

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

/** Client-safe projection for shell nav filtering (mirrors cookie state). */
export function buildClientEvaluationProjection(input: {
  active: boolean;
  persona: RolePreviewPersonaId | null;
  subjectMemberId: string | null;
}): EvaluationProjection {
  const { active, persona, subjectMemberId } = input;
  return {
    active,
    persona,
    subjectMemberId: persona === 'asesor' ? subjectMemberId : null,
    readOnly: active,
    commercialVisibility: commercialVisibilityForPersona(persona),
    presentationScopes: persona ? previewScopesForPersona(persona) : [],
  };
}
