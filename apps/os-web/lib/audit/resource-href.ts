import { conversationHref } from '@/lib/conversations/model';
import { issueHref } from '@/lib/issue/navigation';
import { partyHref } from '@/lib/party/navigation';
import { orderHref, quoteHref, opportunityHref } from '@/lib/commercial/navigation';

export type AuditResourceHrefOptions = {
  /** When known (Cliente360 context or snapshot), prefer party-scoped commercial deep links. */
  partyId?: string | null;
};

function safeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  if (!id || id === '.' || id === '..' || /[/?#\\]/.test(id)) return null;
  return id;
}

/** Peek durable partyId from audit snapshots without inventing associations. */
export function partyIdFromAuditSnapshot(snapshot: unknown): string | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const row = snapshot as Record<string, unknown>;
  return (
    safeId(row.partyId) ??
    safeId(row.organizationPartyId) ??
    safeId(row.customerPartyId) ??
    null
  );
}

/** Deep link when a durable in-app route exists; otherwise null (no invented URLs). */
export function auditResourceHref(
  resourceType: string,
  resourceId: string,
  options: AuditResourceHrefOptions = {},
): string | null {
  const type = resourceType.trim();
  const id = safeId(resourceId);
  if (!id) return null;
  const partyId = safeId(options.partyId ?? null);

  switch (type) {
    case 'party':
      return partyHref(id);
    case 'member':
      return `/administracion/equipo/${encodeURIComponent(id)}`;
    case 'issue':
      return issueHref(id);
    case 'work_item':
      return `/trabajo?subjectType=work_item&subjectId=${encodeURIComponent(id)}`;
    case 'approval_request':
      return '/aprobaciones';
    case 'quote':
      return partyId ? quoteHref(partyId, id) : '/cotizaciones';
    case 'order':
      return partyId ? orderHref(partyId, id) : null;
    case 'opportunity':
      return partyId ? opportunityHref(partyId, id) : '/oportunidades';
    case 'commitment':
      return '/compromisos';
    case 'conversation':
      return conversationHref(id);
    default:
      return null;
  }
}

export function auditResourceHrefForEntry(input: {
  resourceType: string;
  resourceId: string;
  partyId?: string | null;
  beforeJson?: unknown;
  afterJson?: unknown;
}): string | null {
  const partyId =
    safeId(input.partyId ?? null) ??
    partyIdFromAuditSnapshot(input.afterJson) ??
    partyIdFromAuditSnapshot(input.beforeJson);
  return auditResourceHref(input.resourceType, input.resourceId, { partyId });
}
