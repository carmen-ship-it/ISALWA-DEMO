'use server';

import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import type { TypeaheadOption } from '@/lib/operating/typeahead';

const LOOKUP_LIMIT = 20;

export type MemberSearchResult =
  | { ok: true; items: TypeaheadOption[] }
  | { ok: false; reason: 'denied' | 'unavailable' | 'session' };

function isSessionFailure(err: unknown): boolean {
  return (
    err instanceof OsApiError &&
    (err.kind === 'unauthorized' || err.code === 'AUTH_REQUIRED' || err.code === 'ACCESS_REVOKED')
  );
}

function isDenied(err: unknown): boolean {
  return err instanceof OsApiError && err.kind === 'forbidden';
}

async function clientOrSession(): Promise<
  { ok: true; client: OsApiClient } | { ok: false; reason: 'session' }
> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, reason: 'session' };
  return { ok: true, client: createOsApiClient(auth) };
}

/**
 * Tenant-scoped member search for pickers.
 * active: member_active + name only via /members/active-options?q=
 * admin: people.admin ListMembers with q (may match email)
 */
export async function searchActiveMembersAction(input: {
  q: string;
  excludeMemberId?: string;
  mode?: 'active' | 'admin';
}): Promise<MemberSearchResult> {
  const q = input.q.trim();
  if (q.length < 2) return { ok: true, items: [] };

  const ready = await clientOrSession();
  if (!ready.ok) return ready;

  try {
    if (input.mode === 'admin') {
      const page = await ready.client.listMembers({
        q,
        accessStatus: 'active',
        employmentStatus: 'active',
        limit: LOOKUP_LIMIT,
      });
      return {
        ok: true,
        items: page.items
          .filter((member) => member.memberId !== input.excludeMemberId)
          .slice(0, LOOKUP_LIMIT)
          .map((member) => ({
            value: member.memberId,
            label: member.displayName,
          })),
      };
    }

    const page = await ready.client.searchActiveMembers({
      q,
      limit: LOOKUP_LIMIT,
      excludeMemberId: input.excludeMemberId,
    });
    return {
      ok: true,
      items: page.items.map((member) => ({
        value: member.memberId,
        label: member.displayName,
      })),
    };
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    if (isDenied(err)) return { ok: false, reason: 'denied' };
    return { ok: false, reason: 'unavailable' };
  }
}
