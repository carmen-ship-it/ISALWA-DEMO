import {
  locationHasCoordinates,
  selectLocationProvenanceUrl,
  type OpportunitySummaryReadModel,
  type OrderSummaryReadModel,
  type PartyTimelineEntryReadModel,
  type QuoteSummaryReadModel,
  type WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import type { FetchOutcome } from '@/lib/commercial/fetch-outcome';
import { formatTimestamp } from '@/lib/commercial/labels';
import {
  clienteSectionHref,
  opportunityHref,
  orderHref,
  quoteHref,
} from '@/lib/commercial/navigation';
import { timelineEntrySummary, timelineEventLabel } from '@/lib/commercial/timeline-labels';
import { OWNER_ABSENT_LABEL } from '@/lib/party/customer-self-service';
import {
  formatCoordinates,
  provenanceHref,
  provenanceLinkLabel,
  sortLocationsForDisplay,
} from '@/lib/party/customer-self-service';
import {
  contactDisplayName,
  formatCommercialAccountStatus,
  formatPartyRoles,
} from '@/lib/party/labels';
import { partyHref } from '@/lib/party/navigation';
import type { PartyDetailResponse, PartyLocationsResponse } from '@/lib/party/types';
import { formatWorkDueLine, sortOpenWorkByDue } from '@/lib/work/due-order';
import { staffFacingSubject } from '@/lib/work/staff-subject';
import { workItemHref } from '@/lib/work/navigation';

/**
 * Commitments and manual reported facts are other lanes.
 * They are not imported. Absence here is not a claim that none exist.
 */
export const CLIENTE_360_OMITTED_SIGNALS = ['commitments', 'manual_facts'] as const;

export const CLIENTE_360_COPY = {
  now: '¿Qué hago ahora?',
  why: '¿Por qué veo esto?',
  insufficient:
    'No hay señal suficiente para indicar una próxima acción.',
  unreadable:
    'No se indica una próxima acción porque no se pudo leer el seguimiento.',
  assignOwner: 'Asigne un responsable comercial.',
  openPrincipal: 'Abra el registro principal.',
  noInvented:
    'No se inventa una llamada, una visita ni una oportunidad.',
  provenanceNotLocation:
    'Sin coordenadas. El enlace es procedencia, no una ubicación.',
  coordinates: 'Coordenadas registradas',
  noCoordinates: 'Sin coordenadas registradas.',
  noContact:
    'Sin contacto activo. No hay marca de contacto principal, así que no se elige uno.',
  contactSource:
    'No hay marca de contacto principal. Se muestra el primer contacto activo de la lista.',
  noActivity: 'Sin actividad registrada.',
  activityUnread: 'No se pudo leer la actividad reciente.',
  noBlockers: 'No hay bloqueos derivables con los datos cargados.',
  ownerAbsent: 'No hay responsable asignado. No se infiere uno.',
  noAccount: 'Sin cuenta comercial. No se asigna un responsable.',
  listCoordinates: 'Ubicación disponible',
  listNoCoordinates: 'Sin coordenadas',
} as const;

export type OmittedCliente360Signal = (typeof CLIENTE_360_OMITTED_SIGNALS)[number];

export type LoadedSection<T> =
  | { status: 'ok'; items: readonly T[] }
  | { status: 'unavailable' }
  | { status: 'forbidden' }
  | { status: 'error' }
  | { status: 'not_loaded' };

export type LocationSignal = {
  status: string;
  label?: string | null;
  addressText?: string | null;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
};

export type ContactSignal = {
  id: string;
  givenName: string;
  familyName: string;
  title: string | null;
  phone: string | null;
  status: string;
};

export type Cliente360ComposeInput = {
  partyId: string;
  displayName: string;
  partyStatus: string;
  mergedIntoPartyId: string | null;
  roles: readonly { roleKey: string; endedAt: string | null }[];
  contacts: readonly ContactSignal[];
  commercialAccount: {
    status: string;
    ownerMemberId: string | null;
  } | null;
  ownerLabel: string | null;
  canReassignOwner: boolean;
  locations: LoadedSection<LocationSignal>;
  work: LoadedSection<WorkSummaryReadModel>;
  timeline: LoadedSection<PartyTimelineEntryReadModel>;
  opportunities: LoadedSection<OpportunitySummaryReadModel>;
  quotes: LoadedSection<QuoteSummaryReadModel>;
  orders: LoadedSection<OrderSummaryReadModel>;
  staleProjection: boolean;
  asOf?: Date;
};

export type Cliente360Blocker = {
  code:
    | 'merged'
    | 'inactive'
    | 'no_owner'
    | 'no_account'
    | 'account_inactive'
    | 'provenance_not_location'
    | 'overdue_follow_up'
    | 'pending_approval'
    | 'stale_projection'
    | 'work_unreadable'
    | 'locations_unreadable';
  label: string;
};

export type Cliente360NextActionKind =
  | 'recorded_follow_up'
  | 'open_principal_record'
  | 'assign_owner'
  | 'insufficient'
  | 'unreadable';

export type Cliente360Composition = {
  owner: {
    assigned: boolean;
    label: string;
    memberId: string | null;
    note: string | null;
  };
  primaryContact: {
    id: string | null;
    name: string | null;
    title: string | null;
    /** Stored phone only. Never synthesized. */
    phone: string | null;
    hasPhone: boolean;
    source: 'first_active_contact' | 'none';
    summary: string;
  };
  location: {
    state: 'coordinates' | 'provenance_only' | 'none' | 'unavailable' | 'forbidden' | 'error' | 'not_loaded';
    summary: string;
    /** Latitude/longitude text. Never a Maps or provenance URL. */
    coordinates: string | null;
    address: string | null;
    provenance: { href: string; label: string } | null;
  };
  latestActivity: {
    state: 'present' | 'empty' | 'unavailable' | 'forbidden' | 'error' | 'not_loaded';
    label: string | null;
    summary: string | null;
    occurredAt: string | null;
    occurredLabel: string | null;
    href: string | null;
  };
  relationship: {
    roleSummary: string;
    accountLabel: string | null;
    summary: string;
  };
  blockers: Cliente360Blocker[];
  blockersSummary: string;
  nextAction: {
    kind: Cliente360NextActionKind;
    statement: string;
    href: string | null;
    hrefLabel: string | null;
    dueText: string | null;
    overdue: boolean;
    workItemId: string | null;
  };
  now: string;
  why: string[];
  omittedSignals: readonly OmittedCliente360Signal[];
};

type PartyListLocationSource = {
  hasCoordinates?: boolean;
  locationProvenanceUrl?: string | null;
};

/** List meta already shown beside the owner. A Maps URL is not a location. */
export function partyListLocationMeta(party: PartyListLocationSource): string | null {
  if (party.hasCoordinates === true) return CLIENTE_360_COPY.listCoordinates;
  if (party.hasCoordinates === false && Boolean(party.locationProvenanceUrl?.trim())) {
    return CLIENTE_360_COPY.listNoCoordinates;
  }
  return null;
}

export function fromFetchItems<T>(
  outcome: FetchOutcome<{ items: readonly T[] }>,
): LoadedSection<T> {
  if (outcome.status === 'ok') return { status: 'ok', items: outcome.data.items };
  if (outcome.status === 'error') return { status: 'error' };
  return { status: outcome.status };
}

export function fromFetchLocations(
  outcome: FetchOutcome<PartyLocationsResponse>,
): LoadedSection<LocationSignal> {
  if (outcome.status === 'ok') return { status: 'ok', items: outcome.data.locations };
  if (outcome.status === 'error') return { status: 'error' };
  return { status: outcome.status };
}

export function composeCliente360FromLoaded(input: {
  partyId: string;
  detail: PartyDetailResponse;
  displayName: string;
  ownerLabel: string | null;
  canReassignOwner: boolean;
  locations: FetchOutcome<PartyLocationsResponse>;
  relatedWork: FetchOutcome<{ items: readonly WorkSummaryReadModel[] }>;
  timeline: FetchOutcome<{ items: readonly PartyTimelineEntryReadModel[] }>;
  opportunities: FetchOutcome<{ items: readonly OpportunitySummaryReadModel[] }>;
  quotes: FetchOutcome<{ items: readonly QuoteSummaryReadModel[] }>;
  orders: FetchOutcome<{ items: readonly OrderSummaryReadModel[] }>;
  staleProjection: boolean;
  asOf?: Date;
}): Cliente360Composition {
  const account = input.detail.commercialAccount;
  return composeCliente360({
    partyId: input.partyId,
    displayName: input.displayName,
    partyStatus: input.detail.party.status,
    mergedIntoPartyId: input.detail.party.mergedIntoPartyId,
    roles: input.detail.roles,
    contacts: input.detail.contacts,
    commercialAccount: account
      ? { status: account.status, ownerMemberId: account.ownerMemberId }
      : null,
    ownerLabel: input.ownerLabel,
    canReassignOwner: input.canReassignOwner,
    locations: fromFetchLocations(input.locations),
    work: fromFetchItems(input.relatedWork),
    timeline: fromFetchItems(input.timeline),
    opportunities: fromFetchItems(input.opportunities),
    quotes: fromFetchItems(input.quotes),
    orders: fromFetchItems(input.orders),
    staleProjection: input.staleProjection,
    asOf: input.asOf,
  });
}

export function composeCliente360(input: Cliente360ComposeInput): Cliente360Composition {
  const asOf = input.asOf ?? new Date();
  const owner = composeOwner(input);
  const primaryContact = composePrimaryContact(input.contacts);
  const location = composeLocation(input.locations);
  const latestActivity = composeLatestActivity(input.partyId, input.timeline);
  const relationship = composeRelationship(input);
  const workRead = readWork(input.work, asOf);
  const blockers = composeBlockers(input, owner, location, workRead);
  const nextAction = composeNextAction(input, owner, workRead);
  const why = composeWhy(input, nextAction, workRead, location, relationship);

  return {
    owner,
    primaryContact,
    location,
    latestActivity,
    relationship,
    blockers,
    blockersSummary:
      blockers.length > 0 ? blockers.map((item) => item.label).join(' ') : CLIENTE_360_COPY.noBlockers,
    nextAction,
    now: nextAction.statement,
    why,
    omittedSignals: CLIENTE_360_OMITTED_SIGNALS,
  };
}

function composeOwner(input: Cliente360ComposeInput): Cliente360Composition['owner'] {
  if (!input.commercialAccount) {
    return {
      assigned: false,
      label: CLIENTE_360_COPY.noAccount,
      memberId: null,
      note: CLIENTE_360_COPY.noAccount,
    };
  }
  const memberId = input.commercialAccount.ownerMemberId?.trim() || null;
  if (!memberId) {
    return {
      assigned: false,
      label: OWNER_ABSENT_LABEL,
      memberId: null,
      note: CLIENTE_360_COPY.ownerAbsent,
    };
  }
  return {
    assigned: true,
    label: input.ownerLabel?.trim() || 'Miembro del equipo',
    memberId,
    note: null,
  };
}

function composePrimaryContact(contacts: readonly ContactSignal[]): Cliente360Composition['primaryContact'] {
  const contact = contacts.find((item) => item.status === 'active') ?? null;
  if (!contact) {
    return {
      id: null,
      name: null,
      title: null,
      phone: null,
      hasPhone: false,
      source: 'none',
      summary: CLIENTE_360_COPY.noContact,
    };
  }
  const phone = contact.phone?.trim() || null;
  const name = contactDisplayName(contact.givenName, contact.familyName);
  return {
    id: contact.id,
    name,
    title: contact.title?.trim() || null,
    phone,
    hasPhone: Boolean(phone),
    source: 'first_active_contact',
    summary: contact.title?.trim() ? `${name} · ${contact.title.trim()}` : name,
  };
}

function composeLocation(section: LoadedSection<LocationSignal>): Cliente360Composition['location'] {
  if (section.status !== 'ok') {
    return {
      state: section.status,
      summary: locationUnreadSummary(section.status),
      coordinates: null,
      address: null,
      provenance: null,
    };
  }

  const locations = sortLocationsForDisplay(section.items);
  const withCoordinates = locations.find((location) => locationHasCoordinates(location)) ?? null;
  const coordinates = withCoordinates
    ? formatCoordinates(withCoordinates.latitude, withCoordinates.longitude)
    : null;
  const href = provenanceHref(selectLocationProvenanceUrl(locations));
  const provenance = href ? { href, label: provenanceLinkLabel(href) } : null;
  const addressSource = withCoordinates ?? locations.find((location) => location.status === 'active') ?? null;
  const address = addressSource?.addressText?.trim() || null;

  if (coordinates) {
    return {
      state: 'coordinates',
      summary: CLIENTE_360_COPY.coordinates,
      coordinates,
      address,
      provenance,
    };
  }
  if (provenance) {
    return {
      state: 'provenance_only',
      summary: CLIENTE_360_COPY.provenanceNotLocation,
      coordinates: null,
      address,
      provenance,
    };
  }
  return {
    state: 'none',
    summary: CLIENTE_360_COPY.noCoordinates,
    coordinates: null,
    address,
    provenance: null,
  };
}

function locationUnreadSummary(status: Exclude<LoadedSection<unknown>['status'], 'ok'>): string {
  if (status === 'forbidden') return 'No tiene acceso a las ubicaciones.';
  if (status === 'not_loaded') return 'Las ubicaciones no se cargaron en esta vista.';
  return 'No se pudieron leer las ubicaciones.';
}

function composeLatestActivity(
  partyId: string,
  section: LoadedSection<PartyTimelineEntryReadModel>,
): Cliente360Composition['latestActivity'] {
  if (section.status !== 'ok') {
    return {
      state: section.status,
      label: null,
      summary: activityUnreadSummary(section.status),
      occurredAt: null,
      occurredLabel: null,
      href: null,
    };
  }
  const latest = sortActivity(section.items)[0] ?? null;
  if (!latest) {
    return {
      state: 'empty',
      label: null,
      summary: CLIENTE_360_COPY.noActivity,
      occurredAt: null,
      occurredLabel: null,
      href: null,
    };
  }
  return {
    state: 'present',
                label: timelineEventLabel(latest.eventType, latest.facts),
    summary: timelineEntrySummary(latest),
    occurredAt: latest.occurredAt,
    occurredLabel: formatTimestamp(latest.occurredAt),
    href: activityHref(partyId, latest),
  };
}

function activityUnreadSummary(status: Exclude<LoadedSection<unknown>['status'], 'ok'>): string {
  if (status === 'forbidden') return 'No tiene acceso a la actividad reciente.';
  if (status === 'not_loaded') return 'La actividad reciente no se cargó en esta vista.';
  return CLIENTE_360_COPY.activityUnread;
}

function sortActivity(items: readonly PartyTimelineEntryReadModel[]): PartyTimelineEntryReadModel[] {
  return [...items].sort((left, right) => {
    const leftAt = Date.parse(left.occurredAt);
    const rightAt = Date.parse(right.occurredAt);
    if (leftAt !== rightAt) return rightAt - leftAt;
    return right.entryId.localeCompare(left.entryId);
  });
}

function activityHref(partyId: string, entry: PartyTimelineEntryReadModel): string {
  const id = entry.primaryEntityId?.trim();
  const type = entry.primaryEntityType;
  if (id && type === 'opportunity') return opportunityHref(partyId, id);
  if (id && type === 'quote') return quoteHref(partyId, id);
  if (id && type === 'order') return orderHref(partyId, id);
  if (id && (type === 'work_item' || entry.eventType.startsWith('work.'))) return workItemHref(id);
  return clienteSectionHref(partyId, 'historial');
}

function composeRelationship(input: Cliente360ComposeInput): Cliente360Composition['relationship'] {
  const roleLabels = formatPartyRoles(
    input.roles.filter((role) => !role.endedAt).map((role) => role.roleKey),
  );
  const roleSummary = roleLabels.length > 0 ? roleLabels.join(', ') : 'Sin relación activa';
  const accountLabel = input.commercialAccount
    ? formatCommercialAccountStatus(input.commercialAccount.status)
    : 'Sin cuenta comercial';
  const parts = [roleSummary, accountLabel, ...commercialMemory(input)].filter(
    (part): part is string => Boolean(part),
  );
  return {
    roleSummary,
    accountLabel,
    summary: parts.join('. ') + (parts.length > 0 ? '.' : ''),
  };
}

function commercialMemory(input: Cliente360ComposeInput): string[] {
  return [
    countMemory(input.opportunities, (items) => {
      const open = items.filter((item) => item.status === 'open');
      if (open.length === 0) return 'Sin oportunidades abiertas';
      const latest = latestByCreatedAt(open, (item) => item.createdAt, (item) => item.opportunityId);
      const title = latest?.title.trim();
      const count = plural(open.length, 'oportunidad abierta', 'oportunidades abiertas');
      return title ? `${count}: ${title}` : count;
    }, 'Oportunidades no leídas'),
    countMemory(input.quotes, (items) => {
      const submitted = items.filter((item) => item.status === 'submitted');
      const drafts = items.filter((item) => item.status === 'draft');
      const bits = [
        submitted.length === 0
          ? 'Sin cotizaciones enviadas'
          : quoteCount(submitted, 'enviada', 'enviadas'),
        drafts.length > 0 ? quoteCount(drafts, 'en borrador', 'en borrador') : null,
      ].filter((bit): bit is string => Boolean(bit));
      return bits.join('. ');
    }, 'Cotizaciones no leídas'),
    countMemory(input.orders, (items) => {
      const open = items.filter((item) => item.status === 'open');
      if (open.length === 0) return 'Sin pedidos registrados';
      const latest = latestByCreatedAt(open, (item) => item.createdAt, (item) => item.orderId);
      const count = plural(open.length, 'pedido registrado', 'pedidos registrados');
      return latest ? `${count} (${latest.orderNumber})` : count;
    }, 'Pedidos no leídos'),
  ];
}

function quoteCount(
  items: readonly QuoteSummaryReadModel[],
  oneTail: string,
  manyTail: string,
): string {
  const latest = latestByCreatedAt(items, (item) => item.createdAt, (item) => item.quoteId);
  const count = plural(items.length, `cotización ${oneTail}`, `cotizaciones ${manyTail}`);
  return latest ? `${count} (${latest.quoteNumber})` : count;
}

function countMemory<T>(
  section: LoadedSection<T>,
  present: (items: readonly T[]) => string,
  unread: string,
): string {
  if (section.status !== 'ok') return unread;
  return present(section.items);
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

function latestByCreatedAt<T>(
  items: readonly T[],
  createdAt: (item: T) => string,
  id: (item: T) => string,
): T | null {
  return (
    [...items].sort((left, right) => {
      const byTime = Date.parse(createdAt(right)) - Date.parse(createdAt(left));
      if (byTime !== 0) return byTime;
      return id(right).localeCompare(id(left));
    })[0] ?? null
  );
}

type WorkRead =
  | { status: 'ok'; selected: WorkSummaryReadModel | null; open: WorkSummaryReadModel[]; overdue: boolean; dueText: string | null }
  | { status: 'unavailable' | 'forbidden' | 'error' | 'not_loaded' };

function readWork(section: LoadedSection<WorkSummaryReadModel>, asOf: Date): WorkRead {
  if (section.status !== 'ok') return { status: section.status };
  const open = sortOpenWorkByDue(
    section.items.filter((item) => item.status === 'open'),
    asOf,
  );
  const selected = open[0] ?? null;
  if (!selected) return { status: 'ok', selected: null, open, overdue: false, dueText: null };
  const due = formatWorkDueLine(selected, { asOf });
  return { status: 'ok', selected, open, overdue: due.overdue, dueText: due.text };
}

function composeBlockers(
  input: Cliente360ComposeInput,
  owner: Cliente360Composition['owner'],
  location: Cliente360Composition['location'],
  workRead: WorkRead,
): Cliente360Blocker[] {
  const blockers: Cliente360Blocker[] = [];
  if (input.partyStatus === 'merged') {
    blockers.push({ code: 'merged', label: 'Este registro fue fusionado.' });
  }
  if (input.partyStatus === 'inactive' || input.partyStatus === 'deactivated') {
    blockers.push({ code: 'inactive', label: 'El cliente está inactivo.' });
  }
  if (!input.commercialAccount) {
    blockers.push({ code: 'no_account', label: CLIENTE_360_COPY.noAccount });
  } else if (!owner.assigned) {
    blockers.push({ code: 'no_owner', label: 'Sin responsable comercial asignado.' });
  } else if (input.commercialAccount.status === 'inactive') {
    blockers.push({ code: 'account_inactive', label: 'La cuenta comercial está inactiva.' });
  }
  if (location.state === 'provenance_only') {
    blockers.push({
      code: 'provenance_not_location',
      label: 'Hay un enlace de procedencia, pero no hay coordenadas.',
    });
  } else if (location.state === 'unavailable' || location.state === 'error' || location.state === 'forbidden') {
    blockers.push({ code: 'locations_unreadable', label: location.summary });
  }
  if (workRead.status !== 'ok') {
    blockers.push({ code: 'work_unreadable', label: 'No se pudo leer el seguimiento.' });
  } else {
    if (workRead.overdue) {
      blockers.push({ code: 'overdue_follow_up', label: 'El seguimiento pendiente está vencido.' });
    }
    if (workRead.open.some((item) => item.approvalStatus === 'pending')) {
      blockers.push({ code: 'pending_approval', label: 'Hay seguimiento con aprobación pendiente.' });
    }
  }
  if (input.staleProjection) {
    blockers.push({
      code: 'stale_projection',
      label: 'La lectura comercial puede estar desactualizada.',
    });
  }
  return blockers;
}

function composeNextAction(
  input: Cliente360ComposeInput,
  owner: Cliente360Composition['owner'],
  workRead: WorkRead,
): Cliente360Composition['nextAction'] {
  const survivor = input.mergedIntoPartyId?.trim() || null;
  if (input.partyStatus === 'merged' && survivor) {
    return {
      kind: 'open_principal_record',
      statement: CLIENTE_360_COPY.openPrincipal,
      href: partyHref(survivor),
      hrefLabel: 'Ver registro principal',
      dueText: null,
      overdue: false,
      workItemId: null,
    };
  }

  if (workRead.status !== 'ok') {
    return {
      kind: 'unreadable',
      statement: CLIENTE_360_COPY.unreadable,
      href: null,
      hrefLabel: null,
      dueText: null,
      overdue: false,
      workItemId: null,
    };
  }

  if (workRead.selected) {
    const work = workRead.selected;
    return {
      kind: 'recorded_follow_up',
      statement: staffFacingSubject({
        title: work.title,
        description: work.description,
        subjectType: work.subjectType,
        customerName: input.displayName,
      }),
      href: workItemHref(work.workItemId),
      hrefLabel: 'Ver seguimiento',
      dueText: workRead.dueText,
      overdue: workRead.overdue,
      workItemId: work.workItemId,
    };
  }

  if (input.commercialAccount && !owner.assigned && input.canReassignOwner) {
    return {
      kind: 'assign_owner',
      statement: CLIENTE_360_COPY.assignOwner,
      href: clienteSectionHref(input.partyId, 'resumen'),
      hrefLabel: 'Asignar responsable',
      dueText: null,
      overdue: false,
      workItemId: null,
    };
  }

  return {
    kind: 'insufficient',
    statement: CLIENTE_360_COPY.insufficient,
    href: null,
    hrefLabel: null,
    dueText: null,
    overdue: false,
    workItemId: null,
  };
}

function composeWhy(
  input: Cliente360ComposeInput,
  nextAction: Cliente360Composition['nextAction'],
  workRead: WorkRead,
  location: Cliente360Composition['location'],
  relationship: Cliente360Composition['relationship'],
): string[] {
  const why: string[] = [];
  if (nextAction.kind === 'open_principal_record') {
    why.push('Este registro fue fusionado. El registro principal es el que queda.');
  } else if (nextAction.kind === 'unreadable') {
    why.push('Sin la lectura de seguimiento no se puede afirmar que no haya una acción registrada.');
  } else if (nextAction.kind === 'recorded_follow_up') {
    why.push('La próxima acción es el seguimiento pendiente ya registrado.');
    if (nextAction.dueText) why.push(nextAction.dueText);
    if (nextAction.overdue) why.push('Está vencido.');
  } else if (nextAction.kind === 'assign_owner') {
    why.push('La cuenta comercial no tiene responsable y usted puede asignarlo. No se infiere un nombre.');
  } else {
    why.push('No hay seguimiento pendiente en los datos cargados.');
    why.push(commercialDoesNotSetNextStep(input));
    why.push(CLIENTE_360_COPY.noInvented);
  }

  if (location.state === 'provenance_only') {
    why.push('Las coordenadas y el enlace de procedencia se muestran aparte. Un enlace de Maps no es una ubicación.');
  } else if (location.state === 'coordinates' && location.provenance) {
    why.push('Las coordenadas y el enlace de procedencia se muestran aparte.');
  }

  if (relationship.summary) {
    why.push(`Relación actual: ${relationship.summary}`);
  }
  return why.filter((line, index, all) => line.trim().length > 0 && all.indexOf(line) === index);
}

function commercialDoesNotSetNextStep(input: Cliente360ComposeInput): string {
  const notes: string[] = [];
  if (input.opportunities.status === 'ok') {
    const open = input.opportunities.items.filter((item) => item.status === 'open');
    if (open.length > 0) {
      notes.push(`Hay ${plural(open.length, 'oportunidad abierta', 'oportunidades abiertas').toLowerCase()}. Eso no fija el siguiente paso.`);
    }
  }
  if (input.quotes.status === 'ok') {
    const submitted = input.quotes.items.filter((item) => item.status === 'submitted');
    const drafts = input.quotes.items.filter((item) => item.status === 'draft');
    if (submitted.length > 0) {
      notes.push('Hay cotización enviada. Eso no fija el siguiente paso.');
    }
    if (drafts.length > 0) {
      notes.push('Hay cotización en borrador. Eso no fija el siguiente paso.');
    }
  }
  if (input.orders.status === 'ok' && input.orders.items.some((item) => item.status === 'open')) {
    notes.push('Hay pedido registrado. Eso no fija el siguiente paso.');
  }
  if (notes.length === 0) return 'La relación comercial cargada no fija el siguiente paso.';
  return notes.join(' ');
}
