import type {
  AttentionItemReadModel,
  OpportunitySummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import { quoteHref } from '@/lib/commercial/navigation';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { elapsedAge } from '@/lib/time/elapsed';
import { attentionDueLabel, formatAttentionType, formatDueDate } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { attentionTargetHref, workItemHref } from '@/lib/work/navigation';
import { groupInicioAttention } from '@/lib/work/inicio-attention';
import { isEngineeringFixtureCopy, usableStaffTitle } from '@/lib/work/staff-subject';

/**
 * Exception-first reading of records already loaded.
 * Does not invent totals, deadlines, or a company figure.
 * Promises recorded elsewhere are omitted until that contract is exported.
 */
export const EXECUTIVE_LEAD =
  'Solo excepciones ya registradas. No es un indicador ni un total de la empresa.';

export const EXECUTIVE_QUOTE_AGE_NOTE =
  'La antigüedad es el tiempo desde el envío. No es un plazo incumplido.';

export const EXECUTIVE_PARTIAL_NOTE =
  'Hay más registros de los que esta lectura muestra. No es el total.';

export const EXECUTIVE_VISIBLE_LIMIT = 8;

export type ExecutiveExceptionKind = 'overdue_work' | 'pending_decision' | 'submitted_quote';

export type ExecutiveException = {
  id: string;
  kind: ExecutiveExceptionKind;
  title: string;
  href: string;
  ownerMemberId: string | null;
  partyId: string | null;
  /** Spoken age from the stored send instant. Absent when the instant is missing or too recent. */
  agePhrase: string | null;
  detail: string;
};

export type ExecutiveIdentityGroup = {
  id: string;
  label: string;
  href: string | null;
  exceptions: ExecutiveException[];
};

export type ExecutiveCommandModel = {
  lead: string;
  quoteAgeNote: string;
  partialNote: string | null;
  partial: boolean;
  overdue: ExecutiveException[];
  pendingDecisions: ExecutiveException[];
  quoteWaiting: ExecutiveException[];
  /** People who own already-derived overdue work or a pending decision. Not a score. */
  bottlenecks: ExecutiveIdentityGroup[];
  byResponsible: ExecutiveIdentityGroup[];
  byCustomer: ExecutiveIdentityGroup[];
  empty: boolean;
};

export type ExecutiveCommandInput = {
  opportunities?: OpportunitySummaryReadModel[];
  quotesDraft?: QuoteSummaryReadModel[];
  quotesSubmitted?: QuoteSummaryReadModel[];
  openWork?: WorkSummaryReadModel[];
  /** Already-derived overdue page. Membership is not recomputed from dueAt. */
  overdueWork?: WorkSummaryReadModel[];
  followUps?: WorkSummaryReadModel[];
  /** Optional. When omitted, attention groups are not invented. */
  attentionItems?: AttentionItemReadModel[];
  memberLabels?: MemberLabelMap;
  partyLabels?: PartyLabelMap;
  asOf?: Date;
  partial?: boolean;
  /** Omit person and customer groups when names were not loaded. */
  identity?: 'labeled' | 'omit';
};

const EMPTY_MEMBERS: MemberLabelMap = new Map();
const EMPTY_PARTIES: PartyLabelMap = new Map();

export function composeExecutiveCommand(input: ExecutiveCommandInput): ExecutiveCommandModel {
  const asOf = input.asOf ?? new Date();
  const members = input.memberLabels ?? EMPTY_MEMBERS;
  const parties = input.partyLabels ?? EMPTY_PARTIES;
  const overdueIds = new Set((input.overdueWork ?? []).map((item) => item.workItemId));
  const pendingWorkIds = new Set<string>();

  const overdue = uniqueExceptions([
    ...(input.overdueWork ?? []).flatMap((work) => overdueException(work, parties)),
    ...attentionOverdue(input.attentionItems, overdueIds, parties, asOf),
  ]);

  const pendingDecisions = uniqueExceptions([
    ...(input.openWork ?? []).flatMap((work) => pendingWorkException(work, parties, pendingWorkIds)),
    ...(input.overdueWork ?? []).flatMap((work) => pendingWorkException(work, parties, pendingWorkIds)),
    ...attentionPending(input.attentionItems, pendingWorkIds, parties),
  ]);

  const quoteWaiting = quoteExceptions(input.quotesSubmitted ?? [], parties, asOf);
  const labeled = (input.identity ?? 'labeled') === 'labeled';
  const forPeople = uniqueExceptions([...overdue, ...pendingDecisions, ...quoteWaiting]);

  const model: ExecutiveCommandModel = {
    lead: EXECUTIVE_LEAD,
    quoteAgeNote: EXECUTIVE_QUOTE_AGE_NOTE,
    partialNote: input.partial ? EXECUTIVE_PARTIAL_NOTE : null,
    partial: Boolean(input.partial),
    overdue,
    pendingDecisions,
    quoteWaiting,
    bottlenecks: labeled ? bottleneckGroups(forPeople, members) : [],
    byResponsible: labeled ? groupByOwner(forPeople, members) : [],
    byCustomer: labeled ? groupByCustomer(forPeople, parties) : [],
    empty: overdue.length === 0 && pendingDecisions.length === 0 && quoteWaiting.length === 0,
  };
  return model;
}

export function submittedQuoteAttentionLine(
  count: number,
  oldestPhrase: string | null,
): string | null {
  if (count <= 0) return null;
  const noun = count === 1 ? 'cotización enviada' : 'cotizaciones enviadas';
  const age = oldestPhrase ? `. La más antigua, ${oldestPhrase}` : '';
  return `${count} ${noun}${age}. No es un plazo incumplido.`;
}

export function visibleExecutiveSlice<T>(
  items: readonly T[],
  limit = EXECUTIVE_VISIBLE_LIMIT,
): { items: T[]; hidden: number } {
  if (items.length <= limit) return { items: [...items], hidden: 0 };
  return { items: items.slice(0, limit), hidden: items.length - limit };
}

function overdueException(
  work: WorkSummaryReadModel,
  parties: PartyLabelMap,
): ExecutiveException[] {
  if (!visibleWork(work, parties)) return [];
  const partyId = partyIdOf(work);
  const customer = partyId ? namedParty(parties, partyId) : null;
  const storedDate = work.dueAt ? formatDueDate(work.dueAt) : null;
  const dateBit =
    storedDate && storedDate !== 'Sin fecha' ? `Fecha registrada: ${storedDate}.` : 'Ya figura como trabajo vencido.';
  return [
    {
      id: `work:${work.workItemId}`,
      kind: 'overdue_work',
      title: workTitle(work, customer),
      href: workItemHref(work.workItemId),
      ownerMemberId: work.ownerMemberId || null,
      partyId,
      agePhrase: null,
      detail: `Vencido. ${dateBit}`,
    },
  ];
}

function pendingWorkException(
  work: WorkSummaryReadModel,
  parties: PartyLabelMap,
  seen: Set<string>,
): ExecutiveException[] {
  if (!visibleWork(work, parties) || !isPendingDecision(work) || seen.has(work.workItemId)) return [];
  seen.add(work.workItemId);
  const partyId = partyIdOf(work);
  const customer = partyId ? namedParty(parties, partyId) : null;
  return [
    {
      id: `decision:${work.workItemId}`,
      kind: 'pending_decision',
      title: workTitle(work, customer),
      href: workItemHref(work.workItemId),
      ownerMemberId: work.ownerMemberId || null,
      partyId,
      agePhrase: null,
      detail: 'Aprobación pendiente.',
    },
  ];
}

function quoteExceptions(
  quotes: readonly QuoteSummaryReadModel[],
  parties: PartyLabelMap,
  asOf: Date,
): ExecutiveException[] {
  return quotes
    .filter((item) => visibleSubmittedQuote(item) && !fixtureParty(parties, item.partyId))
    .map((quote) => ({ quote, at: Date.parse(quote.submittedAt ?? '') }))
    .filter((item) => Number.isFinite(item.at))
    .sort((left, right) => left.at - right.at || left.quote.quoteId.localeCompare(right.quote.quoteId))
    .map(({ quote }) => {
      const customer = namedParty(parties, quote.partyId);
      const age = quote.submittedAt ? elapsedAge(quote.submittedAt, asOf) : null;
      return {
        id: `quote:${quote.quoteId}`,
        kind: 'submitted_quote' as const,
        title: customer ? `${quote.quoteNumber} · ${customer}` : quote.quoteNumber,
        href: quoteHref(quote.partyId, quote.quoteId),
        ownerMemberId: quote.ownerMemberId || null,
        partyId: quote.partyId,
        agePhrase: age?.phrase ?? null,
        detail: age ? `Enviada. ${age.phrase}.` : 'Enviada.',
      };
    });
}

function attentionOverdue(
  items: AttentionItemReadModel[] | undefined,
  already: Set<string>,
  parties: PartyLabelMap,
  asOf: Date,
): ExecutiveException[] {
  if (!items || items.length === 0) return [];
  const group = groupInicioAttention(items).find((entry) => entry.id === 'overdue_work');
  if (!group) return [];
  return group.items.flatMap((item) => {
    if (!item.isActive || !item.workItemId || already.has(item.workItemId)) return [];
    if (attentionFixture(item)) return [];
    const href = attentionTargetHref(item);
    if (!href) return [];
    const partyId = item.subjectType === 'party' ? item.subjectId : null;
    const due = attentionDueLabel(item, asOf);
    return [
      {
        id: `attention:${item.attentionKey}`,
        kind: 'overdue_work' as const,
        title: attentionTitle(item, parties),
        href,
        ownerMemberId: item.memberId || null,
        partyId,
        agePhrase: null,
        detail: due ? `Vencido. ${due}.` : 'Vencido. Ya figura como atención vencida.',
      },
    ];
  });
}

function attentionPending(
  items: AttentionItemReadModel[] | undefined,
  already: Set<string>,
  parties: PartyLabelMap,
): ExecutiveException[] {
  if (!items || items.length === 0) return [];
  const group = groupInicioAttention(items).find((entry) => entry.id === 'pending_approval');
  if (!group) return [];
  return group.items.flatMap((item) => {
    if (!item.isActive) return [];
    if (item.workItemId && already.has(item.workItemId)) return [];
    if (attentionFixture(item)) return [];
    const href = attentionTargetHref(item);
    if (!href) return [];
    const partyId = item.subjectType === 'party' ? item.subjectId : null;
    return [
      {
        id: `attention:${item.attentionKey}`,
        kind: 'pending_decision' as const,
        title: attentionTitle(item, parties),
        href,
        ownerMemberId: item.memberId || null,
        partyId,
        agePhrase: null,
        detail: 'Aprobación pendiente.',
      },
    ];
  });
}

function bottleneckGroups(
  items: readonly ExecutiveException[],
  members: MemberLabelMap,
): ExecutiveIdentityGroup[] {
  return groupByOwner(items, members)
    .map((group) => ({
      ...group,
      exceptions: group.exceptions.filter(
        (item) => item.kind === 'overdue_work' || item.kind === 'pending_decision',
      ),
    }))
    .filter((group) => group.exceptions.length > 0)
    .sort(compareBurden);
}

function groupByOwner(
  items: readonly ExecutiveException[],
  members: MemberLabelMap,
): ExecutiveIdentityGroup[] {
  return groupBy(
    items.filter((item) => item.ownerMemberId),
    (item) => item.ownerMemberId as string,
    (id) => (members.has(id) ? memberLabel(members, id) : 'Responsable'),
    () => null,
  ).sort(compareBurden);
}

function groupByCustomer(
  items: readonly ExecutiveException[],
  parties: PartyLabelMap,
): ExecutiveIdentityGroup[] {
  return groupBy(
    items.filter((item) => item.partyId && !fixtureParty(parties, item.partyId)),
    (item) => item.partyId as string,
    (id) => namedParty(parties, id) ?? 'Cliente',
    (id) => `/clientes/${encodeURIComponent(id)}`,
  ).sort(compareBurden);
}

function groupBy(
  items: readonly ExecutiveException[],
  keyOf: (item: ExecutiveException) => string,
  labelOf: (id: string) => string,
  hrefOf: (id: string) => string | null,
): ExecutiveIdentityGroup[] {
  const buckets = new Map<string, ExecutiveException[]>();
  for (const item of items) {
    const key = keyOf(item);
    const current = buckets.get(key) ?? [];
    current.push(item);
    buckets.set(key, current);
  }
  return [...buckets.entries()].map(([id, exceptions]) => ({
    id,
    label: labelOf(id),
    href: hrefOf(id),
    exceptions,
  }));
}

function compareBurden(left: ExecutiveIdentityGroup, right: ExecutiveIdentityGroup): number {
  const leftOverdue = countKind(left, 'overdue_work');
  const rightOverdue = countKind(right, 'overdue_work');
  if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue;
  const leftPending = countKind(left, 'pending_decision');
  const rightPending = countKind(right, 'pending_decision');
  if (leftPending !== rightPending) return rightPending - leftPending;
  const leftQuotes = countKind(left, 'submitted_quote');
  const rightQuotes = countKind(right, 'submitted_quote');
  if (leftQuotes !== rightQuotes) return rightQuotes - leftQuotes;
  return left.label.localeCompare(right.label, 'es');
}

function countKind(group: ExecutiveIdentityGroup, kind: ExecutiveExceptionKind): number {
  return group.exceptions.filter((item) => item.kind === kind).length;
}

function uniqueExceptions(items: ExecutiveException[]): ExecutiveException[] {
  const seen = new Set<string>();
  const unique: ExecutiveException[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function isPendingDecision(work: WorkSummaryReadModel): boolean {
  return work.status === 'open' && (work.approvalStatus === 'pending' || Boolean(work.pendingApprovalId));
}

function visibleWork(work: WorkSummaryReadModel, parties: PartyLabelMap): boolean {
  if (work.status === 'cancelled' || work.cancelledAt) return false;
  if (isEngineeringFixtureCopy(work.title) || isEngineeringFixtureCopy(work.description)) return false;
  const partyId = partyIdOf(work);
  if (partyId && fixtureParty(parties, partyId)) return false;
  return Boolean(usableStaffTitle(work.title) || usableStaffTitle(work.description));
}

function visibleSubmittedQuote(quote: QuoteSummaryReadModel): boolean {
  if (quote.status !== 'submitted' || quote.cancelledAt || !quote.submittedAt) return false;
  if (isEngineeringFixtureCopy(quote.quoteNumber) || isEngineeringFixtureCopy(quote.notes)) return false;
  return true;
}

function partyIdOf(work: WorkSummaryReadModel): string | null {
  if (work.subjectType !== 'party' || !work.subjectId) return null;
  return work.subjectId;
}

function namedParty(parties: PartyLabelMap, partyId: string): string | null {
  if (!parties.has(partyId)) return null;
  const name = partyLabel(parties, partyId);
  if (!name || name === 'Cliente' || isEngineeringFixtureCopy(name)) return null;
  return name;
}

function fixtureParty(parties: PartyLabelMap, partyId: string): boolean {
  if (!parties.has(partyId)) return false;
  return isEngineeringFixtureCopy(partyLabel(parties, partyId));
}

function workTitle(work: WorkSummaryReadModel, customer: string | null): string {
  const title = usableStaffTitle(work.title) ?? usableStaffTitle(work.description) ?? 'Trabajo';
  if (customer && !title.toLocaleLowerCase('es').includes(customer.toLocaleLowerCase('es'))) {
    return `${title} · ${customer}`;
  }
  return title;
}

function attentionTitle(item: AttentionItemReadModel, parties: PartyLabelMap): string {
  const stored = item.reasonDetail.title;
  const title = typeof stored === 'string' ? usableStaffTitle(stored) : null;
  const partyId = item.subjectType === 'party' ? item.subjectId : null;
  const customer = partyId ? namedParty(parties, partyId) : null;
  const base = title ?? formatAttentionType(item.attentionType);
  if (customer && !base.toLocaleLowerCase('es').includes(customer.toLocaleLowerCase('es'))) {
    return `${base} · ${customer}`;
  }
  return base;
}

function attentionFixture(item: AttentionItemReadModel): boolean {
  const stored = item.reasonDetail.title;
  return typeof stored === 'string' && isEngineeringFixtureCopy(stored);
}
