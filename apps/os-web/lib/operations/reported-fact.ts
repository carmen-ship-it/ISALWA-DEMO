import { formatCentavos } from '../commercial/money';

/**
 * Reported operational fact. Not a ledger, dispatch, or stock record.
 *
 * `source` is always `manual`. `confirmation` is always `pending`.
 * The table `os_reported_operational_facts` can store the row, but this
 * module does not write it: the API command is not wired here.
 * `recordReportedOperationalFact` always returns persisted: false.
 *
 * A report must not update party, quote, order, location, or payment rows.
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
  /** Prior report this one replaces. Not a canonical correction. */
  correctsFactId: string | null;
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
    correctsFactId: null,
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

export const REPORTED_FACT_NOT_PERSISTED_COPY =
  'No se guardó en el sistema. Sigue pendiente de confirmar y no modifica cobranza, despacho ni inventario.';

export const MANUAL_OPERATIONS_INTRO =
  'Anote lo que alguien informa. El dato no se confirma solo y no cambia el registro comercial.';

export const PAYMENT_BOUNDARY =
  'No confirma el pago. No crea un movimiento de cobranza. No cambia el pedido ni la cotización.';

export const DISPATCH_BOUNDARY =
  'No autoriza el despacho. No cambia la logística ni el pedido.';

export const STOCK_BOUNDARY =
  'No es un movimiento de inventario. No cambia existencias.';

export const PROVENANCE_LIMITS = [
  'No confirma el hecho.',
  'No modifica cobranza, despacho, inventario, cotización, pedido ni ubicación.',
  'Anular no reescribe el valor reportado.',
] as const;

export const MANUAL_PAYMENT_COPY = {
  title: 'Pago reportado',
  intro: 'Anote el monto que alguien informa. No confirma el pago y no entra a cobranza.',
  amount: 'Monto reportado (Bs.)',
  method: 'Medio reportado',
  note: 'Nota',
  submit: 'Anotar pago reportado',
  boundary: PAYMENT_BOUNDARY,
} as const;

export const MANUAL_DISPATCH_COPY = {
  title: 'Despacho reportado',
  intro: 'Anote el estado que alguien informa. No cambia la logística.',
  state: 'Estado reportado',
  placeholder: 'Según quien informa',
  note: 'Nota',
  submit: 'Anotar despacho reportado',
  boundary: DISPATCH_BOUNDARY,
} as const;

export const INVENTORY_SNAPSHOT_COPY = {
  title: 'Stock reportado',
  intro: 'Es una foto del momento que alguien informa. No mueve almacén.',
  item: 'Ítem',
  quantity: 'Cantidad reportada',
  unit: 'Unidad',
  note: 'Nota',
  submit: 'Anotar stock reportado',
  boundary: STOCK_BOUNDARY,
} as const;

export const CORRECTION_COPY = {
  title: 'Corrección y procedencia',
  reverse: 'Anular este registro',
  reason: 'Motivo de la anulación',
  hint: 'Anular no reescribe el valor y no confirma el hecho. Si la cifra estaba mal, anote un registro nuevo.',
  nextLinks: 'El próximo dato anotado señala el registro anulado. El valor anterior no se reescribe.',
} as const;

export type ReportedFactWriteResult = {
  persisted: false;
  reason: 'api_command_unwired';
  fact: ReportedOperationalFact;
  notice: typeof REPORTED_FACT_NOT_PERSISTED_COPY;
};

/** Draft only. Does not insert, even though the table exists. */
export function recordReportedOperationalFact(
  input: CreateReportedFactInput,
): ReportedFactWriteResult {
  return {
    persisted: false,
    reason: 'api_command_unwired',
    fact: createReportedOperationalFact(input),
    notice: REPORTED_FACT_NOT_PERSISTED_COPY,
  };
}

/**
 * Interprets a boliviano amount as centavos. Does not post a ledger.
 * "4.500,00" and "4500.50" are display amounts, not stored postings.
 */
export function parseReportedAmountToCentavos(input: string): string {
  const trimmed = input.trim().replace(/\s/g, '').replace(/^bs\.?/i, '');
  if (!trimmed || /[^\d.,]/.test(trimmed)) {
    throw new Error('amount must be a reported amount, not a ledger posting');
  }

  const lastComma = trimmed.lastIndexOf(',');
  const lastDot = trimmed.lastIndexOf('.');
  let normalized = trimmed;

  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot
        ? trimmed.replace(/\./g, '').replace(',', '.')
        : trimmed.replace(/,/g, '');
  } else if (lastComma >= 0) {
    const decimals = trimmed.length - lastComma - 1;
    const groups = trimmed.split(',');
    normalized =
      decimals === 3 && groups.length === 2
        ? trimmed.replace(/,/g, '')
        : trimmed.replace(',', '.');
  } else if (lastDot >= 0) {
    const decimals = trimmed.length - lastDot - 1;
    const groups = trimmed.split('.');
    if (decimals === 3 && groups.length === 2) {
      normalized = trimmed.replace(/\./g, '');
    }
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('amount must be a reported amount with at most two decimals. This is not a ledger posting.');
  }

  const [whole, frac = ''] = normalized.split('.');
  const centavos = `${whole}${frac.padEnd(2, '0')}`.replace(/^0+(?=\d)/, '');
  if (!/^[1-9]\d*$/.test(centavos)) {
    throw new Error('amountCentavos must be a positive integer. This is not a ledger posting.');
  }
  return centavos;
}

export function reportedFactMayMutateCanonical(): false {
  return false;
}

/** Operator-facing failure. Does not mention a ledger posting as if one were attempted. */
export function reportedFactErrorCopy(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  if (/confirmed or official truth/i.test(message)) {
    return 'No escriba el dato como si ya estuviera confirmado.';
  }
  if (/already reversed|not overwritten/i.test(message)) {
    return 'Ese registro ya está anulado. El valor no se reescribe.';
  }
  if (/amount|centavos|ledger/i.test(message)) {
    return 'El monto reportado tiene que ser mayor que cero.';
  }
  if (/quantity|snapshot/i.test(message)) {
    return 'La cantidad tiene que ser un número entero. No es un movimiento de inventario.';
  }
  if (/same subject/i.test(message)) {
    return 'La corrección se queda en el mismo registro. No mueve el dato comercial.';
  }
  return 'No se pudo anotar el dato manual.';
}

export type ReportedFactProvenanceView = {
  lines: string[];
  limits: readonly string[];
};

export function reportedFactProvenance(fact: ReportedOperationalFact): ReportedFactProvenanceView {
  const copy = reportedFactCopy(fact);
  const lines = [
    copy.title,
    copy.value,
    copy.confirmation,
    copy.source,
    copy.recordedBy,
    copy.provenanceLine,
  ];
  if (fact.kind === 'stock') lines.push(fact.itemLabel);
  if (copy.method) lines.push(copy.method);
  if (copy.when) lines.push(copy.when);
  if (fact.correctsFactId) lines.push('Corrige un registro anterior. El valor anterior no se reescribe.');
  if (fact.sourceReference) lines.push(`Referencia: ${fact.sourceReference}`);
  if (copy.note) lines.push(copy.note);
  if (copy.reversal) lines.push(copy.reversal);
  return { lines, limits: PROVENANCE_LIMITS };
}

/** Points a new report at a prior one. Does not rewrite the prior value and does not confirm either. */
export function linkCorrection(
  fact: ReportedOperationalFact,
  priorFactId: string,
): ReportedOperationalFact {
  lock(fact);
  return lock({ ...fact, correctsFactId: requireText(priorFactId, 'priorFactId') });
}

/**
 * Reverses the prior report and builds a replacement that points at it.
 * Neither row is stored. Neither updates the subject.
 */
export function correctReportedFact(
  original: ReportedOperationalFact,
  replacement: CreateReportedFactInput,
  reason: string,
): { reversed: ReportedOperationalFact; replacement: ReportedOperationalFact; persisted: false } {
  const reversed = reverseReportedFact(original, reason);
  const next = createReportedOperationalFact(replacement);
  if (next.subjectId !== original.subjectId || next.organizationId !== original.organizationId) {
    throw new Error('A correction stays on the same subject. It does not move a canonical record.');
  }
  return {
    reversed,
    replacement: lock({ ...next, correctsFactId: original.id }),
    persisted: false,
  };
}
