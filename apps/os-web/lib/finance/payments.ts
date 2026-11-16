/**
 * T07 reported payments — pure helpers for the /finanzas form and lists.
 * Parsing and wording only. Authority, sums and outcomes are enforced by the API and the database.
 */
import {
  PAYMENT_MAX_TENDERS,
  PaymentReportInputSchema,
  type PaymentReportInput,
  type PaymentTenderMethod,
} from '@isalwa/os-contracts';

export const PAYMENT_DESK_COPY = {
  formTitle: 'Registrar pago reportado',
  formIntro:
    'Registre el pago que el cliente reporta haber hecho. Contabilidad verifica cada medio de pago por separado; un comprobante o una captura no confirman nada.',
  customer: 'Cliente',
  order: 'Pedido previsto (opcional)',
  orderHint: 'Solo indica a qué pedido va dirigido. La asignación se hace aparte, de forma explícita.',
  total: 'Total reportado (Bs)',
  paidOn: 'Fecha del pago',
  note: 'Nota (opcional)',
  tendersTitle: 'Medios de pago',
  addTender: 'Agregar otro medio',
  removeTender: 'Quitar',
  method: 'Medio',
  amount: 'Monto (Bs)',
  reference: 'Referencia (opcional)',
  cashRecipient: 'Quién recibió el efectivo',
  cashRecipientUnknown: 'Receptor por confirmar',
  cashRecipientReason: 'Por qué aún no se sabe quién recibió',
  evidence: 'Comprobante (opcional)',
  evidenceHint: 'Imagen o PDF, hasta 5 MB. Es privado y solo lo ven quienes verifican y quien reportó.',
  submit: 'Registrar pago reportado',
  saving: 'Guardando…',
  sumOk: 'La suma de los medios coincide con el total.',
  queueTitle: 'Por verificar',
  queueEmpty: 'No hay pagos esperando verificación.',
  mineTitle: 'Pagos reportados',
  mineEmpty: 'Todavía no hay pagos reportados que pueda ver.',
  allTitle: 'Todos los reportes',
  registeredTotals: 'Pagos registrados en ISALWA',
  registeredNote: 'Suma de los pagos reportados en ISALWA. No es el saldo contable del cliente.',
  notVerifier: 'Solo Contabilidad con permiso de verificación confirma la recepción.',
  confirm: 'Confirmar recepción',
  reject: 'No confirmar',
  reverse: 'Revertir',
  reasonLabel: 'Motivo o cómo se verificó',
  reasonRequired: 'Escriba cómo se verificó o por qué no.',
  resolveRecipient: 'Indicar receptor',
  attach: 'Adjuntar comprobante',
  allocate: 'Asignar a un pedido',
  allocateIntro:
    'Asigne fondos confirmados a un pedido del mismo cliente. Lo que no asigne queda sin asignar; nada se asigna solo.',
  allocateAmount: 'Monto a asignar (Bs)',
  allocateOrder: 'Pedido',
  release: 'Liberar asignación',
  unassigned: 'Sin asignar',
  allocated: 'Asignado',
  confirmed: 'Confirmado',
  pending: 'Por verificar',
  possibleDuplicate: 'Posible duplicado: revisar antes de confirmar.',
  replacementTitle: 'Reemplazo (opcional)',
  replacementHint: 'Si el monto o el medio estaban mal, registre el reemplazo. El original queda en el historial.',
  instructionsTitle: 'Instrucciones de pago aprobadas',
  instructionsIntro:
    'Solo se comparten datos aprobados por dos personas autorizadas. Revise el texto antes de enviarlo.',
  copyShare: 'Copiar texto para el cliente',
  copied: 'Texto copiado. Envíelo usted y registre el pago cuando el cliente lo reporte.',
  draftTitle: 'Preparar instrucciones',
  publish: 'Aprobar y publicar',
  retire: 'Retirar',
} as const;

export const PAYMENT_ERROR_COPY: Record<string, string> = {
  VALIDATION_FAILED: 'Revise los datos del pago e intente de nuevo.',
  PERMISSION_DENIED: 'No tiene permiso para esta acción.',
  CUSTOMER_NOT_FOUND: 'No se encontró ese cliente entre los que usted puede atender.',
  ORDER_NOT_FOUND: 'Ese pedido no es de este cliente.',
  RECIPIENT_INVALID: 'La persona elegida como receptor no está activa en esta empresa.',
  RECIPIENT_UNRESOLVED: 'Antes de confirmar el efectivo indique quién lo recibió.',
  RECIPIENT_NOT_UNRESOLVED: 'Este efectivo ya tiene receptor.',
  TENDER_ALREADY_DECIDED: 'Otra persona ya registró un resultado para este medio. Actualice la página.',
  TENDER_NOT_CONFIRMED: 'Solo se revierte un medio ya confirmado.',
  OVER_ALLOCATION: 'No hay suficientes fondos confirmados sin asignar para ese monto.',
  RELEASE_ALLOCATIONS_FIRST: 'Libere primero las asignaciones de este pago antes de revertirlo.',
  IDEMPOTENCY_CONFLICT: 'Ese reintento no coincide con el registro anterior. Actualice la página.',
  FILE_TYPE_NOT_ALLOWED: 'Solo se aceptan imágenes (JPG, PNG, WebP) o PDF.',
  FILE_TOO_LARGE: 'El archivo supera 5 MB.',
  FILE_EMPTY: 'El archivo está vacío.',
  SAME_PERSON_CANNOT_PUBLISH: 'Otra persona autorizada debe aprobar estas instrucciones.',
  QR_FILE_REQUIRED: 'Cargue primero el archivo del QR aprobado.',
  INSTRUCTIONS_CHANGED: 'Las instrucciones de pago cambiaron. Revise la versión vigente.',
  STATE_CONFLICT: 'La página quedó desactualizada. Actualice e intente de nuevo.',
};

export function paymentErrorCopy(code: string | undefined, fallback: string): string {
  return (code && PAYMENT_ERROR_COPY[code]) || fallback;
}

/** "1270", "1.270,50", "1270.5" → centavos string; null when it is not a positive amount of at most 2 decimals. */
export function parseBsToCentavos(value: string): string | null {
  const text = value.trim().replace(/\s+/g, '');
  if (!text) return null;
  let normalized = text;
  if (text.includes(',') && text.includes('.')) {
    normalized = text.lastIndexOf(',') > text.lastIndexOf('.') ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  } else if (text.includes(',')) {
    normalized = text.replace(',', '.');
  }
  const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const centavos = BigInt(match[1]!) * BigInt(100) + BigInt((match[2] ?? '').padEnd(2, '0') || '0');
  return centavos > BigInt(0) ? centavos.toString() : null;
}

export function formatBs(centavos: string | bigint): string {
  const value = BigInt(centavos);
  const whole = value / BigInt(100);
  const cents = String(value % BigInt(100)).padStart(2, '0');
  return `Bs ${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}

export type TenderDraft = {
  key: string;
  method: PaymentTenderMethod;
  amount: string;
  reference: string;
  /** Cash only. Empty means "Receptor por confirmar". */
  cashRecipientMemberId: string;
  cashRecipientUnresolvedReason: string;
};

export type PaymentFormDraft = {
  customerId: string;
  orderId: string;
  total: string;
  paidOn: string;
  note: string;
  tenders: readonly TenderDraft[];
};

export type PaymentFormProblem =
  | 'customer_required'
  | 'total_invalid'
  | 'amount_invalid'
  | 'sum_mismatch'
  | 'cash_recipient_required'
  | 'too_many_tenders'
  | 'invalid';

export const PAYMENT_FORM_PROBLEM_COPY: Record<PaymentFormProblem, string> = {
  customer_required: 'Elija el cliente de la lista.',
  total_invalid: 'Escriba el total en bolivianos, mayor que cero.',
  amount_invalid: 'Cada medio de pago necesita un monto mayor que cero.',
  sum_mismatch: 'Los montos de los medios deben sumar exactamente el total.',
  cash_recipient_required: 'Para el efectivo indique quién recibió, o por qué aún no se sabe.',
  too_many_tenders: `Use hasta ${PAYMENT_MAX_TENDERS} medios de pago.`,
  invalid: 'Revise los datos del pago.',
};

/** Live helper under the tender list: difference between total and sum, in centavos (null if unreadable). */
export function tenderSumDifference(draft: Pick<PaymentFormDraft, 'total' | 'tenders'>): bigint | null {
  const total = parseBsToCentavos(draft.total);
  if (!total) return null;
  let sum = BigInt(0);
  for (const tender of draft.tenders) {
    const amount = parseBsToCentavos(tender.amount);
    if (!amount) return null;
    sum += BigInt(amount);
  }
  return BigInt(total) - sum;
}

export function buildPaymentReportRequest(
  draft: PaymentFormDraft,
): { ok: true; body: PaymentReportInput } | { ok: false; problem: PaymentFormProblem } {
  if (!draft.customerId.trim()) return { ok: false, problem: 'customer_required' };
  if (draft.tenders.length > PAYMENT_MAX_TENDERS) return { ok: false, problem: 'too_many_tenders' };
  const total = parseBsToCentavos(draft.total);
  if (!total) return { ok: false, problem: 'total_invalid' };
  const tenders = [];
  for (const tender of draft.tenders) {
    const amount = parseBsToCentavos(tender.amount);
    if (!amount) return { ok: false, problem: 'amount_invalid' };
    const isCash = tender.method === 'cash';
    const recipient = isCash ? tender.cashRecipientMemberId.trim() : '';
    const reason = isCash && !recipient ? tender.cashRecipientUnresolvedReason.trim() : '';
    if (isCash && !recipient && !reason) return { ok: false, problem: 'cash_recipient_required' };
    tenders.push({
      method: tender.method,
      amountCentavos: amount,
      reference: tender.reference.trim() || null,
      cashRecipientMemberId: recipient || null,
      cashRecipientUnresolvedReason: reason || null,
    });
  }
  const body: PaymentReportInput = {
    customerId: draft.customerId.trim(),
    orderId: draft.orderId.trim() || null,
    totalCentavos: total,
    paidOn: draft.paidOn,
    note: draft.note.trim() || null,
    tenders,
  };
  const parsed = PaymentReportInputSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message);
    if (messages.includes('tenders_must_sum_to_total')) return { ok: false, problem: 'sum_mismatch' };
    if (messages.includes('cash_recipient_required')) return { ok: false, problem: 'cash_recipient_required' };
    return { ok: false, problem: 'invalid' };
  }
  return { ok: true, body };
}
