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
};

export type AuditListResponse = {
  boundary: string;
  items: AuditLogItem[];
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
