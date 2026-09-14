'use server';

import type { CommercialVisibilityMode } from '@isalwa/os-contracts';
import { createOsApiClient, type OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import type { TypeaheadOption } from '@/lib/operating/typeahead';
import { PALETTE_GROUP_LIMIT } from '@/lib/shell/command-palette';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import type { CoverageInputPage, CoverageRecord, CoverageSummary } from './coverage';
import { summarizeCoverage } from './coverage';
import { phoneIncludes, phoneSearchVariant } from './phone-match';
import {
  extensionItemsForParty,
  type SearchContactHit,
  type SearchPartyHit,
} from './search-extensions';
import type { PaletteItem } from '@/lib/shell/command-palette';
import { whatChangedFromTimeline, type WhatChangedItem } from './what-changed';


const COVERAGE_LIMIT = 8;
const LOOKUP_LIMIT = 8;
const CONTACT_ENRICH_LIMIT = 2;

type SessionFailure = { ok: false; reason: 'session' | 'unavailable' };

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
  { ok: true; client: OsApiClient } | SessionFailure
> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, reason: 'session' };
  return { ok: true, client: createOsApiClient(auth) };
}

function toPartyHit(party: {
  partyId: string;
  displayName: string;
  legalName: string | null;
  status: string;
  primaryPhone?: string | null;
}): SearchPartyHit | null {
  if (isEngineeringFixtureCopy(party.displayName) || isEngineeringFixtureCopy(party.legalName)) return null;
  return {
    partyId: party.partyId,
    displayName: party.displayName,
    legalName: party.legalName,
    status: party.status,
    primaryPhone: party.primaryPhone ?? null,
  };
}

export async function extendPaletteSearch(query: string): Promise<
  { ok: true; items: PaletteItem[]; partial: boolean } | SessionFailure
> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, items: [], partial: false };
  const ready = await clientOrSession();
  if (!ready.ok) return ready;
  const client = ready.client;
  let partial = false;
  const parties: SearchPartyHit[] = [];

  const queries = [q];
  const variant = phoneSearchVariant(q);
  if (variant) queries.push(variant);

  for (const text of queries) {
    try {
      const page = await client.searchParties({ q: text, status: 'active', limit: PALETTE_GROUP_LIMIT });
      if (page.meta.hasMore) partial = true;
      for (const party of page.items) {
        const hit = toPartyHit(party);
        if (hit) parties.push(hit);
      }
    } catch (err) {
      if (isSessionFailure(err)) return { ok: false, reason: 'session' };
      partial = true;
    }
  }

  const unique = new Map<string, SearchPartyHit>();
  for (const party of parties) unique.set(party.partyId, party);
  const items: PaletteItem[] = [];
  let enriched = 0;
  for (const party of unique.values()) {
    let contacts: SearchContactHit[] = [];
    const phoneOnly = Boolean(party.primaryPhone && phoneIncludes(party.primaryPhone, q));
    const needsContact =
      enriched < CONTACT_ENRICH_LIMIT && (phoneOnly || !party.displayName.toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')));
    if (needsContact) {
      enriched += 1;
      try {
        const detail = await client.getParty(party.partyId);
        contacts = detail.contacts.map((contact) => ({
          id: contact.id,
          givenName: contact.givenName,
          familyName: contact.familyName,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
        }));
      } catch (err) {
        if (isSessionFailure(err)) return { ok: false, reason: 'session' };
        partial = true;
      }
    }
    items.push(...extensionItemsForParty(party, contacts, q));
  }

  return { ok: true, items, partial };
}

export async function lookupCustomers(query: string): Promise<
  { ok: true; items: TypeaheadOption[] } | SessionFailure
> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, items: [] };
  const ready = await clientOrSession();
  if (!ready.ok) return ready;
  try {
    const page = await ready.client.searchParties({ q, status: 'active', limit: LOOKUP_LIMIT });
    return {
      ok: true,
      items: page.items.flatMap((party) => {
        const hit = toPartyHit(party);
        if (!hit) return [];
        const phone = hit.primaryPhone?.trim();
        const label = phone && phoneIncludes(phone, q) ? `${hit.displayName} · ${phone}` : hit.displayName;
        return [{ value: hit.partyId, label }];
      }),
    };
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    return { ok: false, reason: 'unavailable' };
  }
}

export async function lookupMembers(query: string): Promise<
  { ok: true; items: TypeaheadOption[]; authorized: boolean } | SessionFailure
> {
  const q = query.trim();
  if (q.length < 2) return { ok: true, items: [], authorized: false };
  const ready = await clientOrSession();
  if (!ready.ok) return ready;
  try {
    const page = await ready.client.listMembers({
      q,
      accessStatus: 'active',
      employmentStatus: 'active',
      limit: LOOKUP_LIMIT,
    });
    return {
      ok: true,
      authorized: true,
      items: page.items
        .filter((member) => !isEngineeringFixtureCopy(member.displayName))
        .slice(0, LOOKUP_LIMIT)
        .map((member) => ({ value: member.memberId, label: member.displayName })),
    };
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    if (isDenied(err)) return { ok: true, items: [], authorized: false };
    return { ok: false, reason: 'unavailable' };
  }
}

type OwnedCall<T> = (visibility?: Extract<CommercialVisibilityMode, 'team' | 'org'>) => Promise<T>;

async function withOwnerAccess<T>(
  run: OwnedCall<T>,
): Promise<{ ok: true; value: T } | { ok: false; reason: 'denied' | 'unavailable' | 'session' }> {
  const lenses: Array<Extract<CommercialVisibilityMode, 'team' | 'org'> | undefined> = [undefined, 'team', 'org'];
  let unavailable = false;
  for (const visibility of lenses) {
    try {
      return { ok: true, value: await run(visibility) };
    } catch (err) {
      if (isSessionFailure(err)) return { ok: false, reason: 'session' };
      if (isDenied(err)) continue;
      unavailable = true;
    }
  }
  return { ok: false, reason: unavailable ? 'unavailable' : 'denied' };
}

function visibleRecords(
  items: Array<{
    title?: string | null;
    quoteNumber?: string | null;
    status?: string | null;
    ownerMemberId?: string | null;
    subjectType?: string | null;
    subjectId?: string | null;
    approverMemberId?: string | null;
    requestedByMemberId?: string | null;
  }>,
  hasMore: boolean,
): CoverageInputPage {
  const visible = items.filter((item) => {
    const title = item.title ?? item.quoteNumber ?? null;
    return !isEngineeringFixtureCopy(title);
  });
  const records: CoverageRecord[] = visible.map((item) => ({
    title: item.title ?? item.quoteNumber ?? null,
    status: item.status ?? null,
    ownerMemberId: item.ownerMemberId ?? null,
    subjectType: item.subjectType ?? null,
    subjectId: item.subjectId ?? null,
    approverMemberId: item.approverMemberId ?? null,
    requestedByMemberId: item.requestedByMemberId ?? null,
  }));
  return { items: records, truncated: hasMore };
}

async function loadWorkLane(
  client: OsApiClient,
  input: { ownerMemberId?: string; other: boolean; overdue?: boolean; followUpOnly?: boolean },
): Promise<CoverageInputPage | 'session'> {
  const run = async (visibility?: 'team' | 'org') =>
    client.listWorkItems({
      status: 'open',
      limit: COVERAGE_LIMIT,
      ...(input.overdue ? { overdue: true } : {}),
      ...(input.followUpOnly ? { followUpOnly: true } : {}),
      ...(input.ownerMemberId ? { ownerMemberId: input.ownerMemberId } : {}),
      ...(visibility ? { visibility } : {}),
    });
  const result = input.other
    ? await withOwnerAccess(run)
    : await run().then(
        (value) => ({ ok: true as const, value }),
        (err: unknown) => {
          if (isSessionFailure(err)) return { ok: false as const, reason: 'session' as const };
          if (isDenied(err)) return { ok: false as const, reason: 'denied' as const };
          return { ok: false as const, reason: 'unavailable' as const };
        },
      );
  if (!result.ok) return result.reason === 'session' ? 'session' : result.reason === 'denied' ? 'denied' : 'unavailable';
  return visibleRecords(result.value.items, result.value.meta.hasMore);
}

export async function loadCoverageSummary(input?: {
  memberId?: string;
  memberLabel?: string;
}): Promise<
  | { ok: true; summary: CoverageSummary; canLookupMembers: boolean }
  | { ok: false; reason: 'session' | 'unavailable' | 'not_authorized' }
> {
  const ready = await clientOrSession();
  if (!ready.ok) return ready;
  const client = ready.client;
  let actorId = '';
  try {
    const session = await client.getAuthenticatedSession();
    actorId = session.memberId;
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    return { ok: false, reason: 'unavailable' };
  }
  if (!actorId) return { ok: false, reason: 'unavailable' };

  const requested = input?.memberId?.trim() || actorId;
  const other = requested !== actorId;
  let memberLabel = other ? input?.memberLabel?.trim() || 'Cobertura autorizada' : 'Usted';
  if (other) {
    try {
      const member = await client.getMember(requested);
      const name = member.summary.displayName;
      if (name && !isEngineeringFixtureCopy(name)) memberLabel = name;
    } catch (err) {
      if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    }
  }

  const work = await loadWorkLane(client, { ownerMemberId: other ? requested : undefined, other });
  if (work === 'session') return { ok: false, reason: 'session' };
  const overdue = await loadWorkLane(client, { ownerMemberId: other ? requested : undefined, other, overdue: true });
  if (overdue === 'session') return { ok: false, reason: 'session' };
  const followUps = await loadWorkLane(client, {
    ownerMemberId: other ? requested : undefined,
    other,
    followUpOnly: true,
  });
  if (followUps === 'session') return { ok: false, reason: 'session' };

  const opportunities = await loadCommercialLane(client, other, (visibility) =>
    client.listOpportunities({
      status: 'open',
      limit: COVERAGE_LIMIT,
      ...(other ? { ownerMemberId: requested } : {}),
      ...(visibility ? { visibility } : {}),
    }),
  );
  if (opportunities === 'session') return { ok: false, reason: 'session' };
  const quotes = await loadCommercialLane(client, other, (visibility) =>
    client.listQuotes({
      status: 'submitted',
      limit: COVERAGE_LIMIT,
      ...(other ? { ownerMemberId: requested } : {}),
      ...(visibility ? { visibility } : {}),
    }),
  );
  if (quotes === 'session') return { ok: false, reason: 'session' };

  let approvals: CoverageInputPage | 'session' = 'unavailable';
  try {
    const page = await client.listApprovals({
      limit: COVERAGE_LIMIT,
      ...(other ? { approverMemberId: requested } : {}),
    });
    approvals = visibleRecords(
      page.items.map((item) => ({
        title: 'Aprobación',
        status: item.status,
        approverMemberId: item.approverMemberId,
        requestedByMemberId: item.requestedByMemberId,
      })),
      page.meta.hasMore,
    );
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    approvals = isDenied(err) ? 'denied' : 'unavailable';
  }

  let canLookupMembers = false;
  try {
    await client.listMembers({ limit: 1 });
    canLookupMembers = true;
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    canLookupMembers = false;
  }

  if (other && work === 'denied' && opportunities === 'denied' && quotes === 'denied') {
    return { ok: false, reason: 'not_authorized' };
  }

  return {
    ok: true,
    canLookupMembers,
    summary: summarizeCoverage({
      subject: other ? 'member' : 'self',
      memberId: requested,
      memberLabel,
      openWork: work,
      overdueWork: overdue,
      openFollowUps: followUps,
      openOpportunities: opportunities,
      submittedQuotes: quotes,
      pendingApprovals: approvals,
    }),
  };
}

async function loadCommercialLane(
  client: OsApiClient,
  other: boolean,
  run: (visibility?: 'team' | 'org') => Promise<{ items: Array<{ title?: string; quoteNumber?: string; status: string; ownerMemberId: string }>; meta: { hasMore: boolean } }>,
): Promise<CoverageInputPage | 'session'> {
  const result = other
    ? await withOwnerAccess(run)
    : await run().then(
        (value) => ({ ok: true as const, value }),
        (err: unknown) => {
          if (isSessionFailure(err)) return { ok: false as const, reason: 'session' as const };
          if (isDenied(err)) return { ok: false as const, reason: 'denied' as const };
          return { ok: false as const, reason: 'unavailable' as const };
        },
      );
  if (!result.ok) return result.reason === 'session' ? 'session' : result.reason === 'denied' ? 'denied' : 'unavailable';
  return visibleRecords(result.value.items, result.value.meta.hasMore);
}

export async function loadWhatChanged(partyId: string): Promise<
  { ok: true; customer: string; items: WhatChangedItem[]; partial: boolean } | { ok: false; reason: 'session' | 'unavailable' | 'not_found' }
> {
  const id = partyId.trim();
  if (!id || /[/?#\\]/.test(id)) return { ok: false, reason: 'not_found' };
  const ready = await clientOrSession();
  if (!ready.ok) return ready;
  try {
    const [party, timeline] = await Promise.all([
      ready.client.getParty(id),
      ready.client.listPartyTimeline(id, { limit: 25 }),
    ]);
    if (isEngineeringFixtureCopy(party.party.displayName)) {
      return { ok: true, customer: 'Cliente', items: [], partial: false };
    }
    return {
      ok: true,
      customer: party.party.displayName,
      items: whatChangedFromTimeline(timeline.items),
      partial: timeline.meta.hasMore,
    };
  } catch (err) {
    if (isSessionFailure(err)) return { ok: false, reason: 'session' };
    if (err instanceof OsApiError && err.kind === 'not_found') return { ok: false, reason: 'not_found' };
    if (isDenied(err)) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'unavailable' };
  }
}
