import { z } from 'zod';

/**
 * Coordination decision. Continuous operating truth, not a meeting calendar.
 *
 * The committee is only the cross-functional matters the caller already marked
 * with a factual trigger. An empty input is an empty committee. A meeting is
 * not required to exist, and this module never invents a case, a name, or a trigger.
 *
 * Capability is the exact string coordination.decision.record. Cargo and title,
 * including Auxiliar, never grant it. Recording a decision does not grant
 * production, finance, or warehouse authority and does not mutate those records.
 *
 * Resolution is a new row. Previous rows stay. Tenant reads, search, and
 * aggregates use the session organization only. A missing session organization
 * is a denial, not a fallback to the resource organization.
 * Record and resolve prove the target organization equals the trusted session
 * organization before append. A foreign id is not mutated and is not a
 * success event. Live writes are UNPROVEN: this file is not a Prisma writer.
 * There is no coordination read scope.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * Do not register the capability on invite, GrantAdditionalRole, or cargo.
 * Do not treat this row as a production, finance, or warehouse command.
 */

export const COORDINATION_DECISION_CAPABILITY = 'coordination.decision.record' as const;

/**
 * In-memory command only. There is no Prisma writer in this module.
 * A hosted insert of os_coordination_decisions is UNPROVEN.
 */
export const COORDINATION_DECISION_LIVE_WRITE_PROOF = 'UNPROVEN' as const;

export const COORDINATION_DECISION_KINDS = ['recorded', 'resolved'] as const;
export type CoordinationDecisionKind = (typeof COORDINATION_DECISION_KINDS)[number];

export const COORDINATION_TRIGGER_KINDS = [
  'customer_date_at_risk',
  'production_issue_flag',
  'purchase_pending',
  'commercial_decision_required',
  'payment_exception',
  'customer_not_informed',
  'finished_goods_awaiting_allocation',
  'delivery_blocked',
  'previous_decision_overdue',
  'missing_evidence',
] as const;
export type CoordinationTrigger = (typeof COORDINATION_TRIGGER_KINDS)[number];

export const COORDINATION_TRIGGER_LABELS: Record<CoordinationTrigger, string> = {
  customer_date_at_risk: 'Fecha con el cliente en riesgo',
  production_issue_flag: 'Incidencia de producción',
  purchase_pending: 'Compra pendiente',
  commercial_decision_required: 'Decisión comercial requerida',
  payment_exception: 'Excepción de pago',
  customer_not_informed: 'Cliente no informado',
  finished_goods_awaiting_allocation: 'Producto terminado sin asignar',
  delivery_blocked: 'Entrega bloqueada',
  previous_decision_overdue: 'Decisión anterior vencida',
  missing_evidence: 'Falta evidencia',
};

export const COORDINATION_FIELD_LABELS = {
  cliente: 'Cliente',
  pedido: 'Pedido',
  productos: 'Productos',
  problema: 'Problema',
  areaResponsable: 'Área responsable',
  responsable: 'Responsable',
  fechaConElCliente: 'Fecha con el cliente',
  fechaInterna: 'Fecha interna',
  queCambio: 'Qué cambió',
  clienteInformado: 'Cliente informado',
  proximaAccion: 'Próxima acción',
} as const;

export const COORDINATION_EMPTY_COMMITTEE_TITLE =
  'No hay nada que necesite una decisión de comité.';

export const COORDINATION_EMPTY_COMMITTEE_DESCRIPTION =
  'No hace falta una reunión. Si un asunto cruza áreas y necesita una decisión, aparecerá aquí con los datos que ya existen.';

export const COORDINATION_RECORD_LABEL = 'Registrar decisión';
export const COORDINATION_RESOLVE_LABEL = 'Registrar resolución';

export const COORDINATION_DECISION_TABLE = 'os_coordination_decisions' as const;

const TRIGGER_SET = new Set<string>(COORDINATION_TRIGGER_KINDS);

const FORBIDDEN_MUTATION_KEYS = [
  'productionStatus',
  'productionStage',
  'paymentConfirmed',
  'paymentStatus',
  'paidAt',
  'paid_at',
  'ledgerEntryId',
  'warehouseMovement',
  'stockMovement',
  'inventoryMovementId',
  'grantsProduction',
  'grantsFinance',
  'grantsWarehouse',
  'grantsProductionAuthority',
  'grantsFinanceAuthority',
  'grantsWarehouseAuthority',
] as const;

export type CoordinationFailure =
  | 'missing_session_org'
  | 'unauthorized_role'
  | 'cross_tenant'
  | 'id_required'
  | 'decision_required'
  | 'actor_required'
  | 'invalid_time'
  | 'not_found'
  | 'already_resolved'
  | 'already_exists'
  | 'forbidden_production_mutation'
  | 'forbidden_payment_mutation'
  | 'forbidden_authority';

export type CoordinationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: CoordinationFailure };

export type CoordinationSession = {
  organizationId?: string | null;
  actorMemberId?: string | null;
  actorLabel?: string | null;
  grantedCapabilities?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
};

export type CoordinationMatterInput = {
  id: string;
  organizationId: string;
  triggers?: readonly string[] | null;
  cliente?: string | null;
  pedido?: string | null;
  productos?: string | readonly string[] | null;
  problema?: string | null;
  areaResponsable?: string | null;
  responsable?: string | null;
  fechaConElCliente?: string | null;
  fechaInterna?: string | null;
  queCambio?: string | null;
  clienteInformado?: boolean | null;
  proximaAccion?: string | null;
  linkedCaseId?: string | null;
};

export type CoordinationCommitteeItem = {
  id: string;
  organizationId: string;
  triggers: readonly CoordinationTrigger[];
  cliente: string | null;
  pedido: string | null;
  productos: string | null;
  problema: string | null;
  areaResponsable: string | null;
  responsable: string | null;
  fechaConElCliente: string | null;
  fechaInterna: string | null;
  queCambio: string | null;
  clienteInformado: boolean | null;
  proximaAccion: string | null;
  linkedCaseId: string | null;
};

export type CoordinationCommittee = {
  organizationId: string | null;
  items: readonly CoordinationCommitteeItem[];
  meetingRequired: false;
  meetings: readonly [];
};

export type CoordinationDecisionRecord = {
  id: string;
  organizationId: string;
  kind: CoordinationDecisionKind;
  decision: string;
  ownerLabel: string | null;
  ownerMemberId: string | null;
  dueAt: string | null;
  actorLabel: string;
  actorMemberId: string | null;
  occurredAt: string;
  linkedCaseId: string | null;
  notes: string | null;
  resolvesDecisionId: string | null;
  recordedAt: string;
  grantsProductionAuthority: false;
  grantsFinanceAuthority: false;
  grantsWarehouseAuthority: false;
};

export type CoordinationLedger = {
  decisions: readonly CoordinationDecisionRecord[];
};

export type CoordinationAuthority = {
  grantsProductionAuthority: false;
  grantsFinanceAuthority: false;
  grantsWarehouseAuthority: false;
};

export type CoordinationAggregate = {
  organizationId: string;
  openDecisions: number;
  resolvedDecisions: number;
  recordedDecisions: number;
};

const IsoDateTime = z.string().datetime();

function fail<T>(reason: CoordinationFailure): CoordinationResult<T> {
  return { ok: false, reason };
}

function blankToNull(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function sessionOrganizationId(session: CoordinationSession | null | undefined): string | null {
  if (!session) return null;
  return blankToNull(session.organizationId);
}

/** Cargo and title never assign this capability. The arguments are ignored on purpose. */
export function coordinationCapabilityFromCargoOrTitle(
  _cargo: string | null | undefined,
  _title: string | null | undefined,
): readonly [] {
  return [];
}

export function hasCoordinationDecisionCapability(
  grantedCapabilities: readonly string[] | null | undefined,
): boolean {
  if (!grantedCapabilities) return false;
  return grantedCapabilities.some((scope) => scope.trim() === COORDINATION_DECISION_CAPABILITY);
}

export function recordingGrantsProductionAuthority(): false {
  return false;
}

export function recordingGrantsFinanceAuthority(): false {
  return false;
}

export function recordingGrantsWarehouseAuthority(): false {
  return false;
}

export function coordinationAuthority(): CoordinationAuthority {
  return {
    grantsProductionAuthority: false,
    grantsFinanceAuthority: false,
    grantsWarehouseAuthority: false,
  };
}

function forbiddenMutation(
  input: object,
): 'forbidden_production_mutation' | 'forbidden_payment_mutation' | 'forbidden_authority' | null {
  for (const key of FORBIDDEN_MUTATION_KEYS) {
    if (!(key in input) || (input as Record<string, unknown>)[key] == null) continue;
    if (key.startsWith('payment') || key === 'paidAt' || key === 'paid_at' || key === 'ledgerEntryId') {
      return 'forbidden_payment_mutation';
    }
    if (key.startsWith('grant')) return 'forbidden_authority';
    return 'forbidden_production_mutation';
  }
  return null;
}

function explicitTriggers(triggers: readonly string[] | null | undefined): CoordinationTrigger[] {
  if (!triggers) return [];
  const seen = new Set<string>();
  const out: CoordinationTrigger[] = [];
  for (const raw of triggers) {
    if (typeof raw !== 'string') continue;
    const value = raw.trim();
    if (!TRIGGER_SET.has(value) || seen.has(value)) continue;
    seen.add(value);
    out.push(value as CoordinationTrigger);
  }
  return out;
}

function productsLabel(value: CoordinationMatterInput['productos']): string | null {
  if (Array.isArray(value)) {
    const parts = value.map((item) => blankToNull(item)).filter((item): item is string => item != null);
    return parts.length > 0 ? parts.join(' · ') : null;
  }
  if (typeof value !== 'string') return null;
  return blankToNull(value);
}

function informedFlag(value: boolean | null | undefined): boolean | null {
  return value === true || value === false ? value : null;
}

export function emptyCoordinationCommittee(organizationId?: string | null): CoordinationCommittee {
  return {
    organizationId: blankToNull(organizationId),
    items: [],
    meetingRequired: false,
    meetings: [],
  };
}

export function emptyCoordinationLedger(): CoordinationLedger {
  return { decisions: [] };
}

function toItem(matter: CoordinationMatterInput, triggers: readonly CoordinationTrigger[]): CoordinationCommitteeItem {
  return {
    id: matter.id.trim(),
    organizationId: matter.organizationId.trim(),
    triggers,
    cliente: blankToNull(matter.cliente),
    pedido: blankToNull(matter.pedido),
    productos: productsLabel(matter.productos),
    problema: blankToNull(matter.problema),
    areaResponsable: blankToNull(matter.areaResponsable),
    responsable: blankToNull(matter.responsable),
    fechaConElCliente: blankToNull(matter.fechaConElCliente),
    fechaInterna: blankToNull(matter.fechaInterna),
    queCambio: blankToNull(matter.queCambio),
    clienteInformado: informedFlag(matter.clienteInformado),
    proximaAccion: blankToNull(matter.proximaAccion),
    linkedCaseId: blankToNull(matter.linkedCaseId),
  };
}

/**
 * Factual triggers only. Missing triggers do not become items.
 * Neighboring payment or production fields are ignored. A meeting is never required.
 */
export function deriveCoordinationCommittee(
  input?: {
    organizationId?: string | null;
    matters?: readonly CoordinationMatterInput[] | null;
  } | null,
): CoordinationCommittee {
  if (!input) return emptyCoordinationCommittee(null);
  const organizationId = blankToNull(input.organizationId);
  const items: CoordinationCommitteeItem[] = [];
  for (const matter of input.matters ?? []) {
    if (!matter || typeof matter.id !== 'string' || !matter.id.trim()) continue;
    if (typeof matter.organizationId !== 'string' || !matter.organizationId.trim()) continue;
    if (organizationId && matter.organizationId.trim() !== organizationId) continue;
    const triggers = explicitTriggers(matter.triggers);
    if (triggers.length === 0) continue;
    items.push(toItem(matter, triggers));
  }
  return {
    organizationId,
    items,
    meetingRequired: false,
    meetings: [],
  };
}

/**
 * Mutation target must equal the trusted session organization.
 * A missing session is not a fallback to the target organization.
 * An omitted target means the mutation target is the session organization.
 * This is not a read scope. Cargo, title, and operations.coordinator.record
 * do not grant coordination.decision.record.
 */
export function coordinationDecisionTargetMatchesSession(
  session: CoordinationSession | null | undefined,
  targetOrganizationId?: string | null,
): CoordinationResult<{ organizationId: string }> {
  const organizationId = sessionOrganizationId(session);
  if (!organizationId) return fail('missing_session_org');
  const target = blankToNull(targetOrganizationId);
  if (target && target !== organizationId) return fail('cross_tenant');
  return { ok: true, value: { organizationId } };
}

function authorize(
  session: CoordinationSession | null | undefined,
  resourceOrganizationId?: string | null,
): CoordinationResult<{ organizationId: string }> {
  const target = coordinationDecisionTargetMatchesSession(session, resourceOrganizationId);
  if (!target.ok) return target;
  const fromCargo = coordinationCapabilityFromCargoOrTitle(session?.cargo, session?.title);
  const granted = [...(session?.grantedCapabilities ?? []), ...fromCargo];
  if (!hasCoordinationDecisionCapability(granted)) return fail('unauthorized_role');
  return { ok: true, value: { organizationId: target.value.organizationId } };
}

export function coordinationCommitteeForSession(input: {
  session: CoordinationSession | null | undefined;
  matters?: readonly CoordinationMatterInput[] | null;
  decisions?: readonly CoordinationDecisionRecord[] | null;
}): CoordinationResult<CoordinationCommittee> {
  const organizationId = sessionOrganizationId(input.session);
  if (!organizationId) return fail('missing_session_org');
  void input.decisions;
  const matters = (input.matters ?? []).filter((matter) => matter.organizationId?.trim() === organizationId);
  return {
    ok: true,
    value: deriveCoordinationCommittee({ organizationId, matters }),
  };
}

function requiredDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const parsed = IsoDateTime.safeParse(trimmed);
  return parsed.success ? parsed.data : null;
}

function optionalDue(value: unknown): string | null | 'invalid' {
  if (value == null) return null;
  if (typeof value !== 'string') return 'invalid';
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = IsoDateTime.safeParse(trimmed);
  return parsed.success ? parsed.data : 'invalid';
}

function authorityFields(): Pick<
  CoordinationDecisionRecord,
  'grantsProductionAuthority' | 'grantsFinanceAuthority' | 'grantsWarehouseAuthority'
> {
  return coordinationAuthority();
}

export type RecordCoordinationDecisionInput = {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
  id: string;
  decision: string;
  ownerLabel?: string | null;
  ownerMemberId?: string | null;
  dueAt?: string | null;
  occurredAt: string;
  linkedCaseId?: string | null;
  notes?: string | null;
  recordedAt?: string;
  organizationId?: string | null;
  production?: unknown;
  payment?: unknown;
};

export type RecordedCoordinationDecision = CoordinationAuthority & {
  ledger: CoordinationLedger;
  decision: CoordinationDecisionRecord;
  production: unknown;
  payment: unknown;
  mutatedProduction: false;
  mutatedPayment: false;
};

function appendOnly(ledger: CoordinationLedger, row: CoordinationDecisionRecord): CoordinationLedger {
  return { decisions: [...ledger.decisions, row] };
}

export function recordCoordinationDecision(
  input: RecordCoordinationDecisionInput,
): CoordinationResult<RecordedCoordinationDecision> {
  const deniedMutation = forbiddenMutation(input);
  if (deniedMutation) return fail(deniedMutation);
  const access = authorize(input.session, input.organizationId);
  if (!access.ok) return access;
  const id = blankToNull(input.id);
  if (!id) return fail('id_required');
  const decision = blankToNull(input.decision);
  if (!decision) return fail('decision_required');
  const actorLabel = blankToNull(input.session?.actorLabel);
  if (!actorLabel) return fail('actor_required');
  const occurredAt = requiredDateTime(input.occurredAt);
  if (!occurredAt) return fail('invalid_time');
  const dueAt = optionalDue(input.dueAt);
  if (dueAt === 'invalid') return fail('invalid_time');
  const recordedAt = input.recordedAt == null ? occurredAt : requiredDateTime(input.recordedAt);
  if (!recordedAt) return fail('invalid_time');
  if (
    input.ledger.decisions.some(
      (row) => row.id === id && row.organizationId === access.value.organizationId,
    )
  ) {
    return fail('already_exists');
  }
  const proven = coordinationDecisionTargetMatchesSession(input.session, access.value.organizationId);
  if (!proven.ok) return proven;

  const row: CoordinationDecisionRecord = {
    id,
    organizationId: access.value.organizationId,
    kind: 'recorded',
    decision,
    ownerLabel: blankToNull(input.ownerLabel),
    ownerMemberId: blankToNull(input.ownerMemberId),
    dueAt,
    actorLabel,
    actorMemberId: blankToNull(input.session?.actorMemberId),
    occurredAt,
    linkedCaseId: blankToNull(input.linkedCaseId),
    notes: blankToNull(input.notes),
    resolvesDecisionId: null,
    recordedAt,
    ...authorityFields(),
  };

  return {
    ok: true,
    value: {
      ledger: appendOnly(input.ledger, row),
      decision: row,
      production: input.production,
      payment: input.payment,
      mutatedProduction: false,
      mutatedPayment: false,
      ...coordinationAuthority(),
    },
  };
}

export type ResolveCoordinationDecisionInput = {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
  id: string;
  resolvesDecisionId: string;
  decision: string;
  ownerLabel?: string | null;
  ownerMemberId?: string | null;
  dueAt?: string | null;
  occurredAt: string;
  linkedCaseId?: string | null;
  notes?: string | null;
  recordedAt?: string;
  organizationId?: string | null;
  production?: unknown;
  payment?: unknown;
};

export function resolveCoordinationDecision(
  input: ResolveCoordinationDecisionInput,
): CoordinationResult<RecordedCoordinationDecision> {
  const deniedMutation = forbiddenMutation(input);
  if (deniedMutation) return fail(deniedMutation);
  const target = coordinationDecisionTargetMatchesSession(input.session, input.organizationId);
  if (!target.ok) return target;
  const access = authorize(input.session, target.value.organizationId);
  if (!access.ok) return access;
  const prior = input.ledger.decisions.find(
    (row) => row.id === input.resolvesDecisionId && row.organizationId === access.value.organizationId,
  );
  if (!prior) return fail('not_found');
  const proven = coordinationDecisionTargetMatchesSession(input.session, prior.organizationId);
  if (!proven.ok || proven.value.organizationId !== prior.organizationId) return fail('not_found');
  if (prior.kind !== 'recorded') return fail('not_found');
  const already = input.ledger.decisions.some(
    (row) =>
      row.organizationId === access.value.organizationId &&
      row.kind === 'resolved' &&
      row.resolvesDecisionId === prior.id,
  );
  if (already) return fail('already_resolved');

  const recorded = recordCoordinationDecision({
    session: input.session,
    ledger: input.ledger,
    id: input.id,
    decision: input.decision,
    ownerLabel: input.ownerLabel,
    ownerMemberId: input.ownerMemberId,
    dueAt: input.dueAt,
    occurredAt: input.occurredAt,
    linkedCaseId: input.linkedCaseId ?? prior.linkedCaseId,
    notes: input.notes,
    recordedAt: input.recordedAt,
    organizationId: access.value.organizationId,
  });
  if (!recorded.ok) return recorded;
  const resolution: CoordinationDecisionRecord = {
    ...recorded.value.decision,
    kind: 'resolved',
    resolvesDecisionId: prior.id,
  };
  return {
    ok: true,
    value: {
      ...recorded.value,
      decision: resolution,
      ledger: {
        decisions: input.ledger.decisions.concat(resolution),
      },
      production: input.production,
      payment: input.payment,
    },
  };
}

export function readCoordinationDecision(input: {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
  decisionId: string;
}): CoordinationResult<CoordinationDecisionRecord> {
  const id = blankToNull(input.decisionId);
  if (!id) return fail('id_required');
  const sessionOrg = sessionOrganizationId(input.session);
  const own = sessionOrg
    ? input.ledger.decisions.find((item) => item.id === id && item.organizationId === sessionOrg)
    : undefined;
  const row = own ?? input.ledger.decisions.find((item) => item.id === id);
  const access = authorize(input.session, row?.organizationId);
  if (!access.ok) return access;
  if (!row || row.organizationId !== access.value.organizationId) return fail('not_found');
  return { ok: true, value: row };
}

function decisionTitleMatches(decision: string, query: string): boolean {
  return decision.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
}

export function searchCoordinationDecisions(input: {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
  query: string;
  organizationId?: string | null;
}): CoordinationResult<{ organizationId: string; items: readonly CoordinationDecisionRecord[] }> {
  const access = authorize(input.session, input.organizationId);
  if (!access.ok) return access;
  const query = blankToNull(input.query);
  if (!query) return { ok: true, value: { organizationId: access.value.organizationId, items: [] } };
  const items = input.ledger.decisions.filter(
    (row) =>
      row.organizationId === access.value.organizationId && decisionTitleMatches(row.decision, query),
  );
  return { ok: true, value: { organizationId: access.value.organizationId, items } };
}

function isOpen(ledger: CoordinationLedger, row: CoordinationDecisionRecord, organizationId: string): boolean {
  if (row.kind !== 'recorded' || row.organizationId !== organizationId) return false;
  return !ledger.decisions.some(
    (item) =>
      item.organizationId === organizationId &&
      item.kind === 'resolved' &&
      item.resolvesDecisionId === row.id,
  );
}

export function aggregateCoordinationDecisions(input: {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
  organizationId?: string | null;
}): CoordinationResult<CoordinationAggregate> {
  const access = authorize(input.session, input.organizationId);
  if (!access.ok) return access;
  const organizationId = access.value.organizationId;
  const own = input.ledger.decisions.filter((row) => row.organizationId === organizationId);
  return {
    ok: true,
    value: {
      organizationId,
      openDecisions: own.filter((row) => isOpen(input.ledger, row, organizationId)).length,
      resolvedDecisions: own.filter((row) => row.kind === 'resolved').length,
      recordedDecisions: own.filter((row) => row.kind === 'recorded').length,
    },
  };
}

export function openCoordinationDecisionsForSession(input: {
  session: CoordinationSession | null | undefined;
  ledger: CoordinationLedger;
}): CoordinationResult<readonly CoordinationDecisionRecord[]> {
  const access = authorize(input.session);
  if (!access.ok) return access;
  const organizationId = access.value.organizationId;
  return {
    ok: true,
    value: input.ledger.decisions.filter((row) => isOpen(input.ledger, row, organizationId)),
  };
}
