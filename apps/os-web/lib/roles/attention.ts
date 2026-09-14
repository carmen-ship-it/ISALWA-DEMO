import {
  asesorMaySee,
  hasCommercialSearchScope,
  hasCompanyCommercialRead,
  hasTeamCommercialRead,
  jefeMaySee,
  requireSessionOrganization,
  type AccessDenial,
  type CommercialRow,
  type RoleSession,
  type Visibility,
} from '@/lib/roles/access';
import { queueItem, type QueueItem } from '@/lib/roles/queues';

export type AttentionCandidate = CommercialRow & {
  subject: string;
  href: string | null;
  visibility: Visibility;
};

export type AttentionDecision = {
  allowed: boolean;
  denial: AccessDenial | null;
  items: QueueItem[];
};

function lensCanRead(session: RoleSession, lens: 'asesor' | 'jefe' | 'gerente'): boolean {
  if (lens === 'asesor') return asesorMaySee(session, emptyProbe(session));
  if (lens === 'jefe') return hasTeamCommercialRead(session.grantedScopes);
  return hasCompanyCommercialRead(session.grantedScopes);
}

function emptyProbe(session: RoleSession): CommercialRow {
  return {
    id: '',
    organizationId: requireSessionOrganization(session) ?? '',
    ownerMemberId: session.actorMemberId?.trim() ?? '',
    partyId: null,
    visibility: 'own',
  };
}

function rowAllowed(
  session: RoleSession,
  row: AttentionCandidate,
  lens: 'asesor' | 'jefe' | 'gerente',
): boolean {
  if (lens === 'asesor') return asesorMaySee(session, row);
  if (lens === 'jefe') return jefeMaySee(session, row);
  if (!hasCompanyCommercialRead(session.grantedScopes)) return false;
  if (row.organizationId.trim() !== requireSessionOrganization(session)) return false;
  return row.visibility === 'org' || row.visibility === 'team';
}

/**
 * Hidden navigation is not the boundary. A direct call without a session
 * organization, without the lens scope, or for another tenant returns no rows.
 */
export function decideAttention(
  session: RoleSession | null | undefined,
  rows: readonly AttentionCandidate[],
  lens: 'asesor' | 'jefe' | 'gerente',
): AttentionDecision {
  if (!requireSessionOrganization(session) || !session) {
    return { allowed: false, denial: 'missing-organization', items: [] };
  }
  if (!hasCommercialSearchScope(session.grantedScopes) || !lensCanRead(session, lens)) {
    return { allowed: false, denial: 'unauthorized-role', items: [] };
  }
  return {
    allowed: true,
    denial: null,
    items: rows
      .filter((row) => rowAllowed(session, row, lens))
      .map((row) => queueItem({ id: row.id, subject: row.subject, href: row.href })),
  };
}

export function authorizedAttentionItems(
  session: RoleSession | null | undefined,
  rows: readonly AttentionCandidate[],
  lens: 'asesor' | 'jefe' | 'gerente',
): QueueItem[] {
  return decideAttention(session, rows, lens).items;
}
