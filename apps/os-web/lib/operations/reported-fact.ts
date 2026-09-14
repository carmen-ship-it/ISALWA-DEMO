import { formatCentavos } from '../commercial/money';

/**
 * In-memory reported fact. Not stored. Not a ledger, dispatch, or stock record.
 *
 * `source` is always `manual`. `confirmation` is always `pending`.
 * There is no confirm and no persist. Storing this needs a schema change
 * from the schema owner (Agent 0) — do not add a migration from this lane.
 *
 * Do not attach instances to the seven imported customers.
 */

export const REPORTED_FACT_SOURCE = 'manual' as const;
export const REPORTED_FACT_CONFIRMATION = 'pending' as const;

export const MANUAL_DATA_HEADING = 'Datos manuales';
export const PENDING_CONFIRMATION_LABEL = 'Pendiente de confirmar';
export const MANUAL_SOURCE_LABEL = 'Fuente: registro manual';
export const MANUAL_PILL_LABEL = 'Dato manual';

export type ReportedFactKind = 'payment' | 'dispatch' | 'stock';
export type ReportedFactSubjectType = 'party' | 'quote' | 'order' | 'item';
export type ReportedFactActivity = 'active' | 'reversed';

const SUBJECT_TYPES: readonly ReportedFactSubjectType[] = ['party', 'quote', 'order', 'item'];

type ReportedFactBase = {
  id: string;
  organizationId: string;
  subjectType: ReportedFactSubjectType;
  subjectId: string;
  reportedAt: string;
  reportedByLabel: string;
  /** Locked. A connected or ledger source is not representable. */
  source: typeof REPORTED_FACT_SOURCE;
  /** Locked. This type cannot complete confirmation. */
  confirmation: typeof REPORTED_FACT_CONFIRMATION;
  sourceReference: string | null;
  note: string | null;
  activity: ReportedFactActivity;
  reversalReason: string | null;
};

export type PaymentReportedFact = ReportedFactBase & {
  kind: 'payment';
  amountCentavos: string;
  currency: string;
  method: string | null;
};

/** Free-text state as entered. Not a logistics workflow. */
export type DispatchReportedFact = ReportedFactBase & {
  kind: 'dispatch';
  reportedState: string;
};

/** A named snapshot. Not warehouse availability. */
export type StockReportedFact = ReportedFactBase & {
  kind: 'stock';
  itemLabel: string;
  quantity: string;
  unit: string;
};

export type ReportedOperationalFact =
  | PaymentReportedFact
  | DispatchReportedFact
  | StockReportedFact;

type CreateBase = {
  id: string;
  organizationId: string;
  subjectType: ReportedFactSubjectType;
  subjectId: string;
  reportedAt: string;
  reportedByLabel: string;
  sourceReference?: string | null;
  note?: string | null;
};

export type CreateReportedFactInput =
  | (CreateBase & {
      kind: 'payment';
      amountCentavos: string;
      currency?: string;
      method?: string | null;
    })
  | (CreateBase & {
      kind: 'dispatch';
      reportedState: string;
    })
  | (CreateBase & {
      kind: 'stock';
      itemLabel: string;
      quantity: string;
      unit?: string;
    });

export type ReportedFactCopy = {
  heading: typeof MANUAL_DATA_HEADING;
  title: string;
  value: string;
  confirmation: typeof PENDING_CONFIRMATION_LABEL;
  source: typeof MANUAL_SOURCE_LABEL;
  recordedBy: string;
  manualLabel: typeof MANUAL_PILL_LABEL;
  automation: string;
  provenanceLine: string;
  when: string | null;
  method: string | null;
  note: string | null;
  reversal: string | null;
};

const FORBIDDEN_COPY = [
  /\bcobrado\b/i,
  /\bpagado\b/i,
  /\bingreso\b/i,
  /pago confirmado/i,
  /pagado confirmado/i,
  /disponibilidad/i,
  /stock real/i,
  /despacho oficial/i,
];

function requireText(value: string, name: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${name} is required`);
  }
  return trimmed;
}

function optionalText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireInstant(value: string): string {
  const trimmed = requireText(value, 'reportedAt');
  if (Number.isNaN(new Date(trimmed).getTime())) {
    throw new Error('reportedAt must be a valid timestamp');
  }
  return trimmed;
}

function requireSubjectType(value: string): ReportedFactSubjectType {
  if ((SUBJECT_TYPES as readonly string[]).includes(value)) {
    return value as ReportedFactSubjectType;
  }
  throw new Error('subjectType is not a reported-fact subject');
}

function requirePositiveCentavos(value: string): string {
  const trimmed = requireText(value, 'amountCentavos');
  if (!/^[1-9]\d*$/.test(trimmed)) {
    throw new Error('amountCentavos must be a positive integer. This is not a ledger posting.');
  }
  return trimmed;
}

function requireQuantity(value: string): string {
  const trimmed = requireText(value, 'quantity');
  if (!/^(0|[1-9]\d*)$/.test(trimmed)) {
    throw new Error('quantity must be a non-negative integer snapshot, not a stock movement');
  }
  return trimmed;
}

function assertSafeCopy(text: string): void {
  for (const pattern of FORBIDDEN_COPY) {
    if (pattern.test(text)) {
      throw new Error('Reported-fact copy must not sound like confirmed or official truth');
    }
  }
}

function formatWhen(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function lock<T extends ReportedFactBase>(fact: T): T {
  if (fact.source !== REPORTED_FACT_SOURCE || fact.confirmation !== REPORTED_FACT_CONFIRMATION) {
    throw new Error('A reported fact stays source=manual and confirmation pending');
  }
  return fact;
}

function baseFrom(input: CreateBase): ReportedFactBase {
  return {
    id: requireText(input.id, 'id'),
    organizationId: requireText(input.organizationId, 'organizationId'),
    subjectType: requireSubjectType(input.subjectType),
    subjectId: requireText(input.subjectId, 'subjectId'),
    reportedAt: requireInstant(input.reportedAt),
    reportedByLabel: requireText(input.reportedByLabel, 'reportedByLabel'),
    source: REPORTED_FACT_SOURCE,
    confirmation: REPORTED_FACT_CONFIRMATION,
    sourceReference: optionalText(input.sourceReference),
    note: optionalText(input.note),
    activity: 'active',
    reversalReason: null,
  };
}

/**
 * Builds a reported fact. Source and confirmation are not inputs:
 * they are always manual and pending, even if a caller tries to pass them.
 */
export function createReportedOperationalFact(
  input: CreateReportedFactInput,
): ReportedOperationalFact {
  const base = baseFrom(input);

  if (input.kind === 'payment') {
    return lock({
      ...base,
      kind: 'payment',
      amountCentavos: requirePositiveCentavos(input.amountCentavos),
      currency: optionalText(input.currency) ?? 'BOB',
      method: optionalText(input.method),
    });
  }

  if (input.kind === 'dispatch') {
    return lock({
      ...base,
      kind: 'dispatch',
      reportedState: requireText(input.reportedState, 'reportedState'),
    });
  }

  return lock({
    ...base,
    kind: 'stock',
    itemLabel: requireText(input.itemLabel, 'itemLabel'),
    quantity: requireQuantity(input.quantity),
    unit: optionalText(input.unit) ?? 'unidades',
  });
}

/** Always pending. This module cannot return another confirmation. */
export function reportedFactConfirmation(
  fact: ReportedOperationalFact,
): typeof REPORTED_FACT_CONFIRMATION {
  lock(fact);
  return REPORTED_FACT_CONFIRMATION;
}

/**
 * Marks the report reversed without rewriting the reported value.
 * Still manual. Still pending. A second reversal is refused.
 */
export function reverseReportedFact(
  fact: ReportedOperationalFact,
  reason: string,
): ReportedOperationalFact {
  lock(fact);
  const reversalReason = requireText(reason, 'reason');
  if (fact.activity === 'reversed') {
    throw new Error('The report is already reversed. The reported value is not overwritten.');
  }
  return lock({ ...fact, activity: 'reversed', reversalReason });
}

function paymentValue(fact: PaymentReportedFact): string {
  return formatCentavos(fact.amountCentavos, fact.currency);
}

export function reportedFactCopy(fact: ReportedOperationalFact): ReportedFactCopy {
  lock(fact);

  const shared = {
    heading: MANUAL_DATA_HEADING,
    confirmation: PENDING_CONFIRMATION_LABEL,
    source: MANUAL_SOURCE_LABEL,
    recordedBy: `Registrado por ${fact.reportedByLabel}`,
    manualLabel: MANUAL_PILL_LABEL,
    when: formatWhen(fact.reportedAt),
    note: fact.note,
    reversal:
      fact.activity === 'reversed'
        ? 'Registro anulado. No confirma el hecho.'
        : null,
  } as const;

  const copy: ReportedFactCopy =
    fact.kind === 'payment'
      ? {
          ...shared,
          title: 'Pago reportado',
          value: paymentValue(fact),
          automation: 'Se automatizará cuando conectemos cobranza.',
          provenanceLine: MANUAL_SOURCE_LABEL,
          method: fact.method ? `Medio reportado: ${fact.method}` : null,
        }
      : fact.kind === 'dispatch'
        ? {
            ...shared,
            title: 'Despacho reportado',
            value: fact.reportedState,
            automation: 'Se actualizará automáticamente cuando conectemos despacho/logística.',
            provenanceLine: MANUAL_PILL_LABEL,
            method: null,
          }
        : {
            ...shared,
            title: 'Stock reportado',
            value: `${fact.quantity} ${fact.unit}`,
            automation: 'Se automatizará cuando conectemos almacén/inventario.',
            provenanceLine: 'Stock reportado manualmente',
            method: null,
          };

  assertSafeCopy(
    [
      copy.title,
      copy.value,
      copy.confirmation,
      copy.source,
      copy.recordedBy,
      copy.manualLabel,
      copy.automation,
      copy.provenanceLine,
      copy.method ?? '',
      copy.note ?? '',
      copy.reversal ?? '',
    ].join('\n'),
  );

  return copy;
}

/** Count only. Does not invent reports and does not look up customers. */
export function manualFactsSummary(facts: readonly ReportedOperationalFact[]): string {
  for (const fact of facts) lock(fact);
  if (facts.length === 0) return 'No hay datos manuales reportados.';
  const noun = facts.length === 1 ? 'dato manual' : 'datos manuales';
  return `${facts.length} ${noun}. Pendiente de confirmar.`;
}
