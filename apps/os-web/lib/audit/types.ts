export type AuditQueryState = {
  q?: string;
  from?: string;
  to?: string;
  actorMemberId?: string;
  resourceId?: string;
  resourceType?: string;
  action?: string;
  cursor?: string;
  /** Open detail drawer for this audit log id. */
  entry?: string;
};

export type AuditLogItem = {
  id: string;
  occurredAt: string;
  actorMemberId: string | null;
  actionLabel: string;
  resourceLabel: string;
  resourceType: string;
  resourceId: string;
  action: string;
  hasBefore: boolean;
  hasAfter: boolean;
  correlationId: string;
  beforeJson?: unknown;
  afterJson?: unknown;
};

export type AuditListMeta = {
  hasMore: boolean;
  nextCursor?: string;
};

export type AuditListResponse = {
  boundary: string;
  items: AuditLogItem[];
  meta?: AuditListMeta;
};

export type MemoryChangeItem = {
  id: string;
  occurredAt: string;
  actorMemberId: string | null;
  eventLabel: string;
  eventType: string;
  entityLabel: string;
  primaryEntityType: string;
  primaryEntityId: string;
  correlationId: string;
};

export type MemoryChangesResponse = {
  window: string;
  boundary: string;
  items: MemoryChangeItem[];
};
