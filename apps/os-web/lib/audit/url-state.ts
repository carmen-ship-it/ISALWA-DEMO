import { buildAuditApiQuery } from '@/lib/audit/query';
import type { AuditQueryState } from '@/lib/audit/types';

export type { AuditQueryState };

const AUDIT_KEYS = [
  'q',
  'from',
  'to',
  'actorMemberId',
  'resourceId',
  'resourceType',
  'action',
  'cursor',
  'entry',
] as const;

export const AUDITORIA_PATH = '/auditoria';

export function parseAuditQuery(
  input: Record<string, string | string[] | undefined>,
): AuditQueryState {
  const read = (key: string): string | undefined => {
    const raw = input[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  };
  const state: AuditQueryState = {};
  for (const key of AUDIT_KEYS) {
    const value = read(key);
    if (value) state[key] = value;
  }
  return state;
}

export function auditSearchParams(
  state: AuditQueryState,
  omit: Array<keyof AuditQueryState> = [],
): URLSearchParams {
  const search = new URLSearchParams();
  for (const key of AUDIT_KEYS) {
    if (omit.includes(key)) continue;
    const value = state[key];
    if (value) search.set(key, value);
  }
  return search;
}

export function auditoriaHref(path: string = AUDITORIA_PATH, state: AuditQueryState): string {
  const search = auditSearchParams(state);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function auditoriaHrefWithoutCursor(
  path: string = AUDITORIA_PATH,
  state: AuditQueryState,
): string {
  const search = auditSearchParams(state, ['cursor', 'entry']);
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function auditoriaEntryHref(
  path: string,
  state: AuditQueryState,
  entryId: string,
): string {
  return auditoriaHref(path, { ...state, entry: entryId, cursor: undefined });
}

export function auditoriaHrefCloseEntry(path: string, state: AuditQueryState): string {
  const { entry: _entry, ...rest } = state;
  return auditoriaHref(path, rest);
}

export function auditListQuery(state: AuditQueryState): Record<string, string | number> {
  const { entry: _entry, ...filters } = state;
  return buildAuditApiQuery(filters);
}

export function countAuditFilters(state: AuditQueryState): number {
  let count = 0;
  if (state.from || state.to) count += 1;
  if (state.actorMemberId) count += 1;
  if (state.resourceId) count += 1;
  if (state.resourceType) count += 1;
  if (state.action) count += 1;
  if (state.q) count += 1;
  return count;
}
