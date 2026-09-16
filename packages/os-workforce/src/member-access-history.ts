import type { StoredBusinessEvent } from '@isalwa/os-events';
import type { OsWorkforceStore } from './os-workforce-store';

/** Workforce access events surfaced on admin member detail (bounded read). */
export const MEMBER_ACCESS_HISTORY_EVENT_TYPES = [
  'member.role.changed',
  'member.additional_role.granted',
  'member.additional_role.ended',
  'member.manager.changed',
  'member.suspended',
  'member.activated',
  'member.terminated',
  'delegation.granted',
  'delegation.revoked',
] as const;

export type MemberAccessHistoryEntry = {
  id: string;
  occurredAt: string;
  label: string;
  detail: string | null;
  actorMemberId: string | null;
};

const ACCESS_EVENT_TYPE_SET = new Set<string>(MEMBER_ACCESS_HISTORY_EVENT_TYPES);

function payloadMemberId(event: StoredBusinessEvent): string | undefined {
  const memberId = event.payload?.memberId;
  return typeof memberId === 'string' ? memberId : undefined;
}

function payloadRoleKey(event: StoredBusinessEvent): string | undefined {
  const roleKey = event.payload?.roleKey;
  return typeof roleKey === 'string' ? roleKey : undefined;
}

/** Human label for a stored role key — never raw capability strings in UI copy. */
export function accessHistoryRoleLabel(roleKey: string): string {
  switch (roleKey) {
    case 'org.admin':
      return 'Administrador';
    case 'people.admin':
      return 'Administración de personas';
    case 'sales_rep':
      return 'Ventas';
    case 'sales_manager':
      return 'Jefe de ventas';
    case 'Owner':
      return 'Propietario';
    case 'Gerente':
      return 'Gerente';
    case 'system.admin':
      return 'Controles del sistema';
    default:
      return roleKey.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function activationLabel(eventsAsc: StoredBusinessEvent[], index: number): string {
  for (let i = index - 1; i >= 0; i -= 1) {
    const prior = eventsAsc[i];
    if (prior?.eventType === 'member.suspended') return 'Acceso reactivado';
    if (prior?.eventType === 'member.terminated') break;
  }
  return 'Acceso activado';
}

function projectEntry(
  event: StoredBusinessEvent,
  memberId: string,
  eventsAsc: StoredBusinessEvent[],
  index: number,
): MemberAccessHistoryEntry | null {
  const payload = event.payload ?? {};
  switch (event.eventType) {
    case 'member.role.changed': {
      const roleKey = payloadRoleKey(event);
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Rol principal asignado',
        detail: roleKey ? accessHistoryRoleLabel(roleKey) : null,
        actorMemberId: event.actorMemberId,
      };
    }
    case 'member.additional_role.granted': {
      const roleKey = payloadRoleKey(event);
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Permiso adicional otorgado',
        detail: roleKey ? accessHistoryRoleLabel(roleKey) : null,
        actorMemberId: event.actorMemberId,
      };
    }
    case 'member.additional_role.ended': {
      const roleKey = payloadRoleKey(event);
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Permiso adicional removido',
        detail: roleKey ? accessHistoryRoleLabel(roleKey) : null,
        actorMemberId: event.actorMemberId,
      };
    }
    case 'member.manager.changed':
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Responsable cambiado',
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    case 'member.suspended':
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Acceso suspendido',
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    case 'member.activated':
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: activationLabel(eventsAsc, index),
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    case 'member.terminated':
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Relación terminada',
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    case 'delegation.granted': {
      const delegateId =
        typeof payload.delegateMemberId === 'string' ? payload.delegateMemberId : undefined;
      const asDelegate = delegateId === memberId;
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: asDelegate ? 'Delegación recibida' : 'Delegación otorgada',
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    }
    case 'delegation.revoked':
      return {
        id: event.id,
        occurredAt: event.occurredAt.toISOString(),
        label: 'Delegación revocada',
        detail: null,
        actorMemberId: event.actorMemberId,
      };
    default:
      return null;
  }
}

export async function collectMemberAccessHistory(
  store: OsWorkforceStore,
  organizationId: string,
  memberId: string,
  limit = 20,
): Promise<MemberAccessHistoryEntry[]> {
  const raw = await store.listMemberAccessBusinessEvents(organizationId, memberId, limit);
  const eventsAsc = [...raw].sort(
    (a, b) => a.occurredAt.getTime() - b.occurredAt.getTime(),
  );
  const entries: MemberAccessHistoryEntry[] = [];
  for (let i = 0; i < eventsAsc.length; i += 1) {
    const event = eventsAsc[i]!;
    if (!ACCESS_EVENT_TYPE_SET.has(event.eventType)) continue;
    const entry = projectEntry(event, memberId, eventsAsc, i);
    if (entry) entries.push(entry);
  }
  return entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, limit);
}

export function memberMatchesAccessEvent(
  event: StoredBusinessEvent,
  organizationId: string,
  memberId: string,
  delegationIdsForMember: ReadonlySet<string>,
): boolean {
  if (event.organizationId !== organizationId) return false;
  if (!ACCESS_EVENT_TYPE_SET.has(event.eventType)) return false;
  if (event.primaryEntityType === 'organization_member' && event.primaryEntityId === memberId) {
    return true;
  }
  if (payloadMemberId(event) === memberId) return true;
  if (
    (event.eventType === 'delegation.granted' || event.eventType === 'delegation.revoked') &&
    delegationIdsForMember.has(event.primaryEntityId)
  ) {
    return true;
  }
  return false;
}
