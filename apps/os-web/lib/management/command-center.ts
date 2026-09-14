import {
  hasCompanyCommercialRead,
  requireSessionOrganization,
  sameTenant,
  type AccessDenial,
  type RoleSession,
} from '@/lib/roles/access';
import { queueItem, type QueueItem } from '@/lib/roles/queues';
import type { NamedExceptionId } from '@/lib/management/exceptions';

export type CommandCenterRecord = {
  id: string;
  organizationId: string;
  exceptionId: NamedExceptionId;
  subject: string;
  href?: string | null;
};

export type CommandCenterItem = QueueItem & {
  organizationId: string;
  exceptionId: NamedExceptionId;
};

export type CommandCenterDecision = {
  allowed: boolean;
  denial: AccessDenial | null;
  items: CommandCenterItem[];
  /** Null when denied so a dashboard cannot render a leaked count. */
  count: number | null;
};

/**
 * Company exception queue. Other tenants are dropped before the count.
 * people.admin and system.admin do not open this queue.
 */
export function managementCommandCenter(input: {
  session: RoleSession | null | undefined;
  records: readonly CommandCenterRecord[];
}): CommandCenterDecision {
  const session = input.session;
  if (!requireSessionOrganization(session) || !session) {
    return { allowed: false, denial: 'missing-organization', items: [], count: null };
  }
  if (!hasCompanyCommercialRead(session.grantedScopes)) {
    return { allowed: false, denial: 'unauthorized-role', items: [], count: null };
  }
  const items = input.records
    .filter((row) => sameTenant(session, row.organizationId))
    .map((row) => ({
      ...queueItem({ id: row.id, subject: row.subject, href: row.href }),
      organizationId: row.organizationId.trim(),
      exceptionId: row.exceptionId,
    }));
  return { allowed: true, denial: null, items, count: items.length };
}

export function exceptionCountForSession(input: {
  session: RoleSession | null | undefined;
  records: readonly CommandCenterRecord[];
}): number | null {
  return managementCommandCenter(input).count;
}
