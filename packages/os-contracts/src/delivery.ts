import { z } from 'zod';

/**
 * Delivery boundary. Warehouse exit and customer delivery are different facts.
 *
 * Nota de salida de almacén: goods left the warehouse. No number and no format
 * are allocated. It does not create a nota de entrega.
 *
 * Nota de entrega: born only when goods are delivered to the final customer.
 * It cannot predate that delivery. Generated numbering policy is unknown.
 * An externally printed document number may be preserved as source evidence.
 * It is not an invoice and it does not claim tax.
 *
 * Evidence roles stay separate. They are not one actor.
 * Payment is not required. An authorized exception is not a confirmed ledger payment.
 * The product has no signature method. A confirmation may store a recipient and
 * an opaque signature reference only.
 *
 * CROSS_LANE: export this file from packages/os-contracts/src/index.ts.
 * CROSS_LANE: register commands in command-registry.ts and scopes.ts.
 * Do not treat them as invoice, tax, ledger payment, or order-status authority.
 * CROSS_LANE: merge prisma/fragments/delivery.prisma into schema.prisma.
 * Order lines, when they exist, are copied. This module does not invent them.
 */

export const DELIVERY_NUMBERING_POLICY = 'unknown' as const;
/** Generated OS note number. Not assigned. Distinct from a source-preserved external print. */
export const DELIVERY_NOTE_NUMBER: null = null;
/**
 * Source-preserved printed document number (for example Nota de Entrega 007189).
 * Preserving it does not invent a generation algorithm.
 */
export const EXTERNAL_DOCUMENT_NUMBER_FIELD = 'externalDocumentNumber' as const;
export const DOCUMENT_NUMBERING_DECISION = 'BUSINESS_DECISION_REQUIRED — DOCUMENT_NUMBERING' as const;
export const WAREHOUSE_OUTBOUND_KIND = 'nota_de_salida' as const;
export const CUSTOMER_DELIVERY_NOTE_KIND = 'nota_de_entrega' as const;
/** Factory paper form. Distinct until business maps its role. Not a delivery note. */
export const FACTORY_DELIVERY_NOTE_KIND = 'nota_de_entrega_de_fabrica' as const;
/** Document exists in source evidence. Exact workflow role is unmapped. */
export const FACTORY_DELIVERY_NOTE_ROLE_STATUS = 'BUSINESS_ROLE_REQUIRES_MAPPING' as const;
export const FACTORY_DELIVERY_NOTE_ROLE_DECISION =
  'BUSINESS_DECISION_REQUIRED — FACTORY_DELIVERY_NOTE_ROLE' as const;
export const DELIVERY_SOURCE = 'employee_recorded' as const;
export const DELIVERY_CLAIMS_INVOICE = false as const;
export const DELIVERY_CLAIMS_TAX = false as const;
export const DELIVERY_SIGNATURE_METHOD: null = null;
export const CONFIRMED_LEDGER_PAYMENT = false as const;
export const LEDGER_POSTING = 'none' as const;
export const PAYMENT_REQUIRED_BEFORE_DELIVERY = false as const;

/**
 * Explicit assignment only. Cargo, title, and a sibling scope never grant these.
 * delivery.record is the existing delivery scope. warehouse.outbound.record is
 * the registered warehouse-exit mutation authority (OPERATIONS_ACCESS_SCOPE_KEYS).
 * It is not finished-goods receive, allocate, or customer delivery.
 * Receive, allocate, delivery.record, commercial.team.read, and people.admin
 * do not imply it.
 */
export const WAREHOUSE_EXIT_RECORD_SCOPE = 'warehouse.outbound.record' as const;
export const CUSTOMER_DELIVERY_RECORD_SCOPE = 'delivery.record' as const;
export const DELIVERY_NOTE_RECORD_SCOPE = 'delivery.record' as const;

export const DELIVERY_RESOURCE_SCOPES = {
  warehouse_exit: WAREHOUSE_EXIT_RECORD_SCOPE,
  delivery: CUSTOMER_DELIVERY_RECORD_SCOPE,
  delivery_note: DELIVERY_NOTE_RECORD_SCOPE,
} as const;

export type DeliveryResource = keyof typeof DELIVERY_RESOURCE_SCOPES;

/** Partial quantity is stored. Fulfillment is unspecified. Do not invent a status. */
export const DELIVERY_FULFILLMENT_STATUS: null = null;

export const DELIVERY_COMMAND_NAMES = [
  'RecordWarehouseExit',
  'RecordCustomerDelivery',
  'RecordDeliveryEvidence',
] as const;

export type DeliveryCommandName = (typeof DELIVERY_COMMAND_NAMES)[number];

export const DELIVERY_EVIDENCE_ROLES = [
  'commercial_coordination',
  'accounting_payment',
  'warehouse_outbound',
  'delivery_confirmation',
] as const;

export type DeliveryEvidenceRole = (typeof DELIVERY_EVIDENCE_ROLES)[number];

export const DELIVERY_SUBJECT_TYPES = ['warehouse_exit', 'delivery'] as const;
export type DeliverySubjectType = (typeof DELIVERY_SUBJECT_TYPES)[number];

export const ENTREGA_PANEL_COPY = {
  kicker: 'Entrega',
  title: 'Nota de entrega',
  warehouseTitle: 'Nota de salida de almacén',
  beforeDelivery: 'La nota de entrega se crea solo cuando la mercadería llega al cliente final.',
  orderDoesNotEmit: 'Un pedido no la emite. Una salida de almacén tampoco.',
  warehouseDistinct: 'La nota de salida registra que la mercadería salió del almacén. No es la nota de entrega.',
  noDeliveryYet: 'Todavía no hay una entrega registrada.',
  numberingUnknown: 'No se asigna un número generado. La política de numeración no está definida.',
  externalNumberPreserved:
    'Un número impreso externo puede conservarse como referencia de origen. No se genera aquí.',
  factoryNoteDistinct:
    'La nota de entrega de fábrica es un documento distinto hasta que se defina su rol. No es automáticamente nota de salida, nota de entrega al cliente, ni producto terminado.',
  notInvoice: 'No es una factura y no calcula impuesto.',
  noLines: 'Sin líneas. El pedido no tiene cantidades conocidas para copiar.',
  noSignatureMethod: 'No hay un método de firma. Solo se puede anotar una referencia de evidencia.',
  paymentNotRequired: 'El pago no es requisito para registrar la entrega.',
  exceptionNotPayment: 'Una excepción autorizada no es un pago confirmado en el libro.',
  evidenceSeparate:
    'La coordinación, el pago, la salida de almacén y la confirmación de entrega son evidencias distintas. No se mezclan en un solo actor.',
  delivered: 'Entrega registrada. La nota existe porque la mercadería llegó al cliente final.',
  noteDoesNotPredate: 'La nota de entrega no puede ser anterior a la entrega.',
  internalRecord: 'Este es un registro interno de entrega. No reclama un número oficial.',
  partialDeliveries:
    'Un pedido puede entregarse en partes, en más de una entrega. La cantidad guardada no declara el pedido como cumplido.',
  chronology: 'Cronología',
  chronologyEmpty: 'Sin movimientos en la cronología.',
  loading: 'Cargando el registro de entrega.',
  loadError: 'No se pudo cargar el registro de entrega.',
  permissionDenied: 'No tiene permiso para ver este registro de entrega.',
} as const;

const NUMBER_KEYS = new Set([
  'notenumber',
  'documentnumber',
  'numbering',
  'numberformat',
  'sequence',
  'correlativo',
  'format',
]);
/** Allowed: source-preserved printed number only. Not a generated note number. */
const ALLOWED_EXTERNAL_NUMBER_KEYS = new Set(['externaldocumentnumber']);
const INVOICE_KEYS = new Set(['invoice', 'invoicenumber', 'factura', 'nit', 'fiscal', 'sin']);
const TAX_KEYS = new Set(['tax', 'taxrate', 'iva']);
const SIGNATURE_METHOD_KEYS = new Set(['signaturemethod', 'signedby', 'signatureprovider', 'firma']);
const PAYMENT_CONFIRMATION_KEYS = new Set([
  'confirmedledgerpayment',
  'paymentconfirmed',
  'paidat',
  'ledgerentryid',
]);
const FULFILLMENT_KEYS = new Set([
  'fulfillmentstatus',
  'fullyfulfilled',
  'partiallyfulfilled',
  'fulfilled',
  'fulfillment',
]);

const optionalText = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const KnownOrderLineSchema = z
  .object({
    orderLineId: z.string().trim().min(1),
    productRef: z.string().trim().min(1).nullable(),
    description: z.string().trim().min(1),
    quantity: z.number().int().min(1),
    unitLabel: z.string().trim().min(1).nullable(),
  })
  .strict();

export type KnownOrderLine = z.output<typeof KnownOrderLineSchema>;

export type CopiedDeliveryLine = {
  orderLineId: string;
  productRef: string | null;
  description: string;
  quantity: number;
  unitLabel: string | null;
};

export const RequestedQuantitySchema = z
  .object({
    orderLineId: z.string().trim().min(1),
    quantity: z.number().int().min(1),
  })
  .strict();

export type RequestedQuantity = z.output<typeof RequestedQuantitySchema>;

const optionalQuantities = z.array(RequestedQuantitySchema).optional();

export const RecordWarehouseExitSchema = z
  .object({
    orderId: z.string().trim().min(1),
    exitedAt: z.string().datetime(),
    recordedBy: z.string().trim().min(1),
    notes: optionalText,
    source: z.literal(DELIVERY_SOURCE),
    quantities: optionalQuantities,
    /** Source-preserved printed number only. Does not generate numbering. */
    externalDocumentNumber: optionalText,
  })
  .strict();

export type RecordWarehouseExitPayload = z.output<typeof RecordWarehouseExitSchema>;

export const RecordCustomerDeliverySchema = z
  .object({
    orderId: z.string().trim().min(1),
    deliveredAt: z.string().datetime(),
    deliveredTo: optionalText,
    recordedBy: z.string().trim().min(1),
    notes: optionalText,
    source: z.literal(DELIVERY_SOURCE),
    quantities: optionalQuantities,
    /** Source-preserved printed number only. Example: Nota de Entrega 007189. */
    externalDocumentNumber: optionalText,
  })
  .strict();

export type RecordCustomerDeliveryPayload = z.output<typeof RecordCustomerDeliverySchema>;

const evidenceBase = {
  subjectType: z.enum(DELIVERY_SUBJECT_TYPES),
  subjectId: z.string().trim().min(1),
  recordedBy: z.string().trim().min(1),
  reference: optionalText,
  note: optionalText,
};

export const RecordDeliveryEvidenceSchema = z.discriminatedUnion('role', [
  z.object({
    ...evidenceBase,
    role: z.literal('commercial_coordination'),
  }).strict(),
  z.object({
    ...evidenceBase,
    role: z.literal('warehouse_outbound'),
  }).strict(),
  z.object({
    ...evidenceBase,
    role: z.literal('accounting_payment'),
    paymentState: z.enum(['reference', 'authorized_exception']),
    exceptionReason: optionalText,
    authorizedBy: optionalText,
  }).strict(),
  z.object({
    ...evidenceBase,
    role: z.literal('delivery_confirmation'),
    recipient: optionalText,
    signatureReference: optionalText,
  }).strict(),
]);

export type RecordDeliveryEvidencePayload = z.output<typeof RecordDeliveryEvidenceSchema>;

export type StoredDeliveryEvidence = {
  role: DeliveryEvidenceRole;
  subjectType: DeliverySubjectType;
  subjectId: string;
  recordedBy: string;
  reference: string | null;
  note: string | null;
  paymentState: 'reference' | 'authorized_exception' | null;
  exceptionReason: string | null;
  authorizedBy: string | null;
  recipient: string | null;
  signatureReference: string | null;
  confirmedLedgerPayment: false;
  ledgerPosting: 'none';
  signatureMethod: null;
};

function normalizeKey(key: string): string {
  return key.replace(/[^a-z]/gi, '').toLowerCase();
}

function walkKeys(value: unknown, found: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walkKeys(item, found);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    found.push(key);
    walkKeys(child, found);
  }
}

export function assertNoDeliveryClaims(payload: unknown): void {
  if (Array.isArray(payload)) throw new Error('EVIDENCE_ROLE_COLLAPSE');
  const keys: string[] = [];
  walkKeys(payload, keys);
  const roleHits = keys.filter((key) =>
    (DELIVERY_EVIDENCE_ROLES as readonly string[]).includes(key),
  );
  if (roleHits.length > 1) throw new Error('EVIDENCE_ROLE_COLLAPSE');
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    if ('roles' in record || 'actors' in record) throw new Error('EVIDENCE_ROLE_COLLAPSE');
    if (Array.isArray(record.evidence)) throw new Error('EVIDENCE_ROLE_COLLAPSE');
  }
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (ALLOWED_EXTERNAL_NUMBER_KEYS.has(normalized)) continue;
    if (NUMBER_KEYS.has(normalized)) throw new Error('NUMBERING_POLICY_UNKNOWN');
    if (INVOICE_KEYS.has(normalized)) throw new Error('INVOICE_CLAIM_REFUSED');
    if (TAX_KEYS.has(normalized)) throw new Error('TAX_CLAIM_REFUSED');
    if (SIGNATURE_METHOD_KEYS.has(normalized)) throw new Error('SIGNATURE_NOT_IN_PRODUCT');
    if (PAYMENT_CONFIRMATION_KEYS.has(normalized)) throw new Error('PAYMENT_CONFIRMATION_REFUSED');
    if (FULFILLMENT_KEYS.has(normalized)) throw new Error('VALIDATION_FAILED');
    if (normalized === 'lines') throw new Error('VALIDATION_FAILED');
  }
}

export function noteBeforeDelivery(): null {
  return null;
}

export function createDeliveryNoteWithoutDelivery(): never {
  throw new Error('DELIVERY_REQUIRED');
}

export function assignDeliveryNoteNumber(_requested: unknown): never {
  throw new Error('NUMBERING_POLICY_UNKNOWN');
}

export function assignWarehouseOutboundNumber(_requested: unknown): never {
  throw new Error('NUMBERING_POLICY_UNKNOWN');
}

export function signatureMethodInProduct(): false {
  return false;
}

export function warehouseExitIsCustomerDelivery(): false {
  return false;
}

export function outboundNoteIsDeliveryNote(): false {
  return false;
}

export function paymentRequiredBeforeDelivery(): false {
  return false;
}

export function paymentExceptionIsConfirmedLedgerPayment(): false {
  return false;
}

export function assertNoteDoesNotPredateDelivery(bornAt: string, deliveredAt: string): void {
  const born = Date.parse(bornAt);
  const delivered = Date.parse(deliveredAt);
  if (Number.isNaN(born) || Number.isNaN(delivered) || born < delivered) {
    throw new Error('NOTE_PREDATES_DELIVERY');
  }
}

export function assertEventHasOccurred(eventAt: string, recordedAt: Date): void {
  const eventMs = Date.parse(eventAt);
  if (Number.isNaN(eventMs) || eventMs > recordedAt.getTime()) {
    throw new Error('NOTE_PREDATES_DELIVERY');
  }
}

/**
 * Copies quantities already on the order. null or empty invents nothing.
 * Prices and tax are dropped even if the source line carries them.
 */
export function copyKnownOrderQuantities(
  lines: readonly unknown[] | null | undefined,
): CopiedDeliveryLine[] {
  if (!lines || lines.length === 0) return [];
  return lines.map((line) => {
    if (!line || typeof line !== 'object') throw new Error('VALIDATION_FAILED');
    const row = line as Record<string, unknown>;
    const orderLineId = typeof row.orderLineId === 'string' ? row.orderLineId.trim() : '';
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const quantity = row.quantity;
    if (!orderLineId || !description) throw new Error('VALIDATION_FAILED');
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) {
      throw new Error('VALIDATION_FAILED');
    }
    const productRef = typeof row.productRef === 'string' && row.productRef.trim() ? row.productRef.trim() : null;
    const unitLabel = typeof row.unitLabel === 'string' && row.unitLabel.trim() ? row.unitLabel.trim() : null;
    return { orderLineId, productRef, description, quantity, unitLabel };
  });
}

/**
 * Stores the quantity this delivery or exit recorded.
 * A smaller quantity is allowed. A second call is not a fulfillment decision.
 * Unknown order lines are not invented. Missing quantities copy known lines only.
 */
export function storeDeliveredQuantities(
  lines: readonly unknown[] | null | undefined,
  requested: readonly RequestedQuantity[] | null | undefined,
): CopiedDeliveryLine[] {
  const known = copyKnownOrderQuantities(lines);
  if (!requested || requested.length === 0) return known;
  const knownById = new Map(known.map((line) => [line.orderLineId, line]));
  const seen = new Set<string>();
  return requested.map((item) => {
    if (seen.has(item.orderLineId)) throw new Error('VALIDATION_FAILED');
    seen.add(item.orderLineId);
    const line = knownById.get(item.orderLineId);
    if (!line) throw new Error('VALIDATION_FAILED');
    return { ...line, quantity: item.quantity };
  });
}

export function requireSessionOrganization(organizationId: string | null | undefined): string {
  const org = typeof organizationId === 'string' ? organizationId.trim() : '';
  if (!org) throw new Error('TENANT_FORBIDDEN');
  return org;
}

/** Cargo, title, people.admin, and a sibling scope do not satisfy the required scope. */
export function assertDeliveryResourceRole(
  resource: DeliveryResource,
  grantedScopes: readonly string[] | null | undefined,
): void {
  const required = DELIVERY_RESOURCE_SCOPES[resource];
  const held = new Set((grantedScopes ?? []).map((scope) => scope.trim()).filter(Boolean));
  if (!held.has(required)) throw new Error('PERMISSION_DENIED');
}

export function denyForeignRows<T extends { organizationId: string }>(
  sessionOrgId: string,
  rows: readonly T[],
): T[] {
  return rows.filter((row) => row.organizationId === sessionOrgId);
}

/** Wrong organization is not found. The foreign row is not returned. */
export function visibleInSession<T extends { organizationId: string }>(
  sessionOrgId: string,
  row: T | null | undefined,
): T | null {
  if (!row || row.organizationId !== sessionOrgId) return null;
  return row;
}

export function suggestRecipientsInTenant(
  sessionOrgId: string,
  candidates: readonly { organizationId: string; recipient: string | null }[],
  query: string,
): string[] {
  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of candidates) {
    if (row.organizationId !== sessionOrgId) continue;
    const recipient = row.recipient?.trim() ?? '';
    if (!recipient) continue;
    if (needle && !recipient.toLowerCase().includes(needle)) continue;
    if (seen.has(recipient)) continue;
    seen.add(recipient);
    out.push(recipient);
  }
  return out;
}

export function evidenceRoleFitsSubject(subjectType: DeliverySubjectType, role: DeliveryEvidenceRole): boolean {
  if (subjectType === 'warehouse_exit') return role === 'warehouse_outbound';
  return true;
}

export function parseRecordWarehouseExit(payload: unknown): RecordWarehouseExitPayload {
  assertNoDeliveryClaims(payload);
  return RecordWarehouseExitSchema.parse(payload);
}

export function parseRecordCustomerDelivery(payload: unknown): RecordCustomerDeliveryPayload {
  assertNoDeliveryClaims(payload);
  return RecordCustomerDeliverySchema.parse(payload);
}

export function parseRecordDeliveryEvidence(payload: unknown): StoredDeliveryEvidence {
  assertNoDeliveryClaims(payload);
  const parsed = RecordDeliveryEvidenceSchema.parse(payload);
  if (!evidenceRoleFitsSubject(parsed.subjectType, parsed.role)) {
    throw new Error('WAREHOUSE_EXIT_IS_NOT_DELIVERY');
  }
  if (parsed.role === 'accounting_payment') {
    if (parsed.paymentState === 'reference' && !parsed.reference) {
      throw new Error('VALIDATION_FAILED');
    }
    if (parsed.paymentState === 'authorized_exception' && (!parsed.exceptionReason || !parsed.authorizedBy)) {
      throw new Error('VALIDATION_FAILED');
    }
    return {
      role: parsed.role,
      subjectType: parsed.subjectType,
      subjectId: parsed.subjectId,
      recordedBy: parsed.recordedBy,
      reference: parsed.paymentState === 'reference' ? parsed.reference : parsed.reference ?? null,
      note: parsed.note,
      paymentState: parsed.paymentState,
      exceptionReason: parsed.paymentState === 'authorized_exception' ? parsed.exceptionReason : null,
      authorizedBy: parsed.paymentState === 'authorized_exception' ? parsed.authorizedBy : null,
      recipient: null,
      signatureReference: null,
      confirmedLedgerPayment: CONFIRMED_LEDGER_PAYMENT,
      ledgerPosting: LEDGER_POSTING,
      signatureMethod: DELIVERY_SIGNATURE_METHOD,
    };
  }
  if (parsed.role === 'delivery_confirmation') {
    return {
      role: parsed.role,
      subjectType: parsed.subjectType,
      subjectId: parsed.subjectId,
      recordedBy: parsed.recordedBy,
      reference: parsed.reference,
      note: parsed.note,
      paymentState: null,
      exceptionReason: null,
      authorizedBy: null,
      recipient: parsed.recipient,
      signatureReference: parsed.signatureReference,
      confirmedLedgerPayment: CONFIRMED_LEDGER_PAYMENT,
      ledgerPosting: LEDGER_POSTING,
      signatureMethod: DELIVERY_SIGNATURE_METHOD,
    };
  }
  return {
    role: parsed.role,
    subjectType: parsed.subjectType,
    subjectId: parsed.subjectId,
    recordedBy: parsed.recordedBy,
    reference: parsed.reference,
    note: parsed.note,
    paymentState: null,
    exceptionReason: null,
    authorizedBy: null,
    recipient: null,
    signatureReference: null,
    confirmedLedgerPayment: CONFIRMED_LEDGER_PAYMENT,
    ledgerPosting: LEDGER_POSTING,
    signatureMethod: DELIVERY_SIGNATURE_METHOD,
  };
}
