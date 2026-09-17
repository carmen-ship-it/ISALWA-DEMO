import type { OsApiClient } from '@/lib/api/os-api-client';
import type { AuditLogItem } from '@/lib/audit/types';
import type { AuditQueryState } from '@/lib/audit/types';

export const AUDIT_PAGE_SIZE = 25;

export type AuditListPage = {
  items: AuditLogItem[];
  hasMore: boolean;
  nextCursor?: string;
  boundary: string;
};

function toIsoDateStart(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (value.includes('T')) return value;
  return `${value}T00:00:00.000Z`;
}

function toIsoDateEnd(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  if (value.includes('T')) return value;
  return `${value}T23:59:59.999Z`;
}

export function buildAuditApiQuery(state: AuditQueryState): Record<string, string | number> {
  const query: Record<string, string | number> = { limit: AUDIT_PAGE_SIZE };
  const from = toIsoDateStart(state.from);
  const to = toIsoDateEnd(state.to);
  if (from) query.from = from;
  if (to) query.to = to;
  if (state.actorMemberId) query.actorMemberId = state.actorMemberId;
  if (state.resourceId) query.resourceId = state.resourceId;
  if (state.resourceType) query.resourceType = state.resourceType;
  if (state.action) query.action = state.action;
  if (state.q) query.q = state.q;
  if (state.cursor) query.cursor = state.cursor;
  return query;
}

export async function loadAuditListPage(
  client: OsApiClient,
  state: AuditQueryState,
): Promise<AuditListPage> {
  const result = await client.listAudit(buildAuditApiQuery(state));
  return {
    items: result.items,
    hasMore: result.meta?.hasMore ?? false,
    nextCursor: result.meta?.nextCursor,
    boundary: result.boundary,
  };
}

export async function loadAuditDetail(
  client: OsApiClient,
  auditId: string,
): Promise<AuditLogItem | null> {
  const result = await client.listAudit({ id: auditId, limit: 1 });
  return result.items[0] ?? null;
}
