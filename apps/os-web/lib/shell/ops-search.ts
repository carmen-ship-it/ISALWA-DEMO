import {
  asesorMaySee,
  hasCommercialSearchScope,
  hasCompanyCommercialRead,
  hasTeamCommercialRead,
  jefeMaySee,
  requireSessionOrganization,
  sameTenant,
  type AccessDenial,
  type RoleSession,
  type Visibility,
} from '@/lib/roles/access';
import { orderHref, quoteHref } from '@/lib/commercial/navigation';
import { mountedDeskHref, mountedRecordHref } from '@/lib/roles/queues';

export type OpsSearchKind = 'client' | 'quote' | 'order' | 'product';

export type OpsSearchCandidate = {
  kind: OpsSearchKind;
  id: string;
  organizationId: string;
  label: string;
  partyId?: string | null;
  ownerMemberId?: string | null;
  visibility?: Visibility;
  href?: string | null;
};

export type OpsSearchHit = {
  kind: OpsSearchKind;
  id: string;
  organizationId: string;
  label: string;
  href: string | null;
};

export type OpsSearchDecision = {
  allowed: boolean;
  denial: AccessDenial | null;
  hits: OpsSearchHit[];
};

function candidateHref(row: OpsSearchCandidate): string | null {
  const provided = mountedRecordHref(row.href);
  if (provided) return provided;
  if (row.kind === 'product') return mountedDeskHref('/productos');
  const partyId = row.partyId?.trim() ?? '';
  if (row.kind === 'client' && (partyId || row.id.trim())) {
    return mountedRecordHref(`/clientes/${encodeURIComponent(partyId || row.id.trim())}`);
  }
  if (row.kind === 'quote' && partyId) return mountedRecordHref(quoteHref(partyId, row.id));
  if (row.kind === 'order' && partyId) return mountedRecordHref(orderHref(partyId, row.id));
  return null;
}

function commercialAllowed(session: RoleSession, row: OpsSearchCandidate): boolean {
  if (!sameTenant(session, row.organizationId)) return false;
  const commercial = {
    id: row.id,
    organizationId: row.organizationId,
    ownerMemberId: row.ownerMemberId?.trim() ?? '',
    partyId: row.partyId ?? null,
    visibility: row.visibility ?? 'own',
  };
  if (hasCompanyCommercialRead(session.grantedScopes)) return true;
  if (hasTeamCommercialRead(session.grantedScopes) && jefeMaySee(session, commercial)) return true;
  return asesorMaySee(session, commercial);
}

function productAllowed(session: RoleSession, row: OpsSearchCandidate): boolean {
  return sameTenant(session, row.organizationId) && hasCommercialSearchScope(session.grantedScopes);
}

function rowAllowed(session: RoleSession, row: OpsSearchCandidate): boolean {
  if (row.kind === 'product') return productAllowed(session, row);
  return commercialAllowed(session, row);
}

/**
 * Authorized palette suggestions for clients, quotes, orders, and products.
 * Does not wire the palette. A denied call returns no rows — hiding a nav
 * item is not this boundary.
 */
export function decideOpsSearch(
  session: RoleSession | null | undefined,
  rows: readonly OpsSearchCandidate[],
): OpsSearchDecision {
  if (!requireSessionOrganization(session) || !session) {
    return { allowed: false, denial: 'missing-organization', hits: [] };
  }
  if (!hasCommercialSearchScope(session.grantedScopes)) {
    return { allowed: false, denial: 'unauthorized-role', hits: [] };
  }
  return {
    allowed: true,
    denial: null,
    hits: rows.filter((row) => rowAllowed(session, row)).map((row) => ({
      kind: row.kind,
      id: row.id,
      organizationId: row.organizationId.trim(),
      label: row.label.trim() || 'Registro',
      href: candidateHref(row),
    })),
  };
}

export function authorizedOpsSearchHits(
  session: RoleSession | null | undefined,
  rows: readonly OpsSearchCandidate[],
): OpsSearchHit[] {
  return decideOpsSearch(session, rows).hits;
}
