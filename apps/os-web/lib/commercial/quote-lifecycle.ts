/**
 * T04 quote lifecycle copy and pure helpers.
 * draft → approval of the exact terms → Emitir (SubmitQuote) → optional manual send →
 * Registrar aceptación → Crear pedido. Issuance is not a send; a read receipt is not acceptance.
 * Authority lives in the commands. Nothing here grants anything.
 */

import type { QuoteAcceptanceChannel } from '@isalwa/os-contracts';
import { QUOTE_PDF_COPY } from '@/lib/commercial/quote-pdf-ready';

export const QUOTE_LIFECYCLE_LABELS = {
  prepare: 'Preparar cotización',
  saveDraft: 'Guardar borrador',
  requestApproval: 'Solicitar aprobación',
  issue: 'Emitir cotización',
  issuePending: 'Emitiendo…',
  downloadPdf: QUOTE_PDF_COPY.download,
  recordAcceptance: 'Registrar aceptación',
  recordAcceptancePending: 'Registrando aceptación…',
  createOrder: 'Crear pedido',
} as const;

export const QUOTE_LIFECYCLE_COPY = {
  issueHelper:
    'Emitir no envía la cotización. Primero necesita la aprobación de estos términos exactos; si cambia líneas, descuento o vigencia, la aprobación anterior deja de valer.',
  issued: 'Cotización emitida.',
  issuedNotSent: 'Descargue la cotización y envíela por su canal habitual. Emitir no la envía.',
  approvedNextStep:
    'Aprobación registrada. El siguiente paso es Emitir cotización. Si cambia las líneas, el descuento o la vigencia, solicite la aprobación de nuevo.',
  approvalDraftOnly: 'La aprobación se solicita sobre el borrador, antes de emitir.',
  noApprovers:
    'Ninguna persona activa de esta empresa tiene la capacidad de aprobar precios. Falta configuración: no se elige un aprobador por defecto.',
  approversUnavailable: 'No se pudo cargar la lista de aprobadores. Actualice la página.',
  approversTruncated: 'La lista de aprobadores está recortada. Si falta alguien, pida al administrador que lo revise.',
  acceptanceIntro:
    'Registre cuándo y cómo aceptó el cliente esta cotización emitida. Una entrega o lectura del mensaje no es aceptación. ISALWA no contacta al cliente.',
  issuanceSyncing: 'La emisión se está reflejando. Actualice la página en unos segundos.',
  acceptanceNotIssued:
    'Esta cotización no tiene una emisión registrada, así que no se puede registrar la aceptación del cliente.',
  acceptanceDone: 'Aceptación registrada. Ya puede crear el pedido.',
  acceptedNextStep: 'El cliente aceptó. El siguiente paso es Crear pedido.',
  channel: 'Canal',
  acceptedOn: 'Fecha de aceptación',
  evidence: 'Evidencia',
  evidenceHint: 'Qué dijo o confirmó el cliente (10 a 500 caracteres).',
  evidenceTooShort: 'Describa la evidencia con al menos 10 caracteres.',
  dateRequired: 'Indique la fecha de aceptación.',
  channelRequired: 'Seleccione el canal.',
  quoteInvalid: 'Cotización no válida.',
  revisionInvalid: 'Actualice la página: no se pudo confirmar la revisión de la cotización.',
  documentIssuedPrefix: 'Documento emitido · hash',
  documentHashDisclosure:
    'El hash identifica los términos aprobados en la emisión. Al descargar, el servidor vuelve a calcular ese hash desde los términos canónicos y no entrega el PDF si no coincide. El nombre de contacto mostrado puede actualizarse; los importes, unidades, descuentos y vigencia no.',
} as const;

export const QUOTE_ACCEPTANCE_CHANNEL_LABELS: Record<QuoteAcceptanceChannel, string> = {
  whatsapp: 'WhatsApp',
  llamada: 'Llamada',
  visita: 'Visita',
  presencial: 'Presencial',
  otro: 'Otro',
};

/** Mirrors QUOTE_ACCEPTANCE_CHANNELS in os-contracts (type-checked below; no runtime contracts import in the client). */
export const QUOTE_ACCEPTANCE_CHANNEL_VALUES = [
  'whatsapp',
  'llamada',
  'visita',
  'presencial',
  'otro',
] as const satisfies readonly QuoteAcceptanceChannel[];

export const QUOTE_ACCEPTANCE_CHANNEL_OPTIONS = QUOTE_ACCEPTANCE_CHANNEL_VALUES.map((value) => ({
  value,
  label: QUOTE_ACCEPTANCE_CHANNEL_LABELS[value],
}));

export function isQuoteAcceptanceChannel(value: string): value is QuoteAcceptanceChannel {
  return (QUOTE_ACCEPTANCE_CHANNEL_VALUES as readonly string[]).includes(value);
}

type QuoteIssuanceFields = {
  status: string;
  issuedAt?: string | null;
  issuedDocumentHash?: string | null;
  revisionNumber?: number;
};

/** Issued = status submitted with a recorded issuance. A legacy submitted quote has no issuedAt. */
export function isQuoteIssued(quote: QuoteIssuanceFields): boolean {
  return quote.status === 'submitted' && Boolean(quote.issuedAt);
}

/** Acceptance can be recorded only for an issued quote that is not yet accepted. */
export function canRecordQuoteAcceptance(quote: QuoteIssuanceFields): boolean {
  return isQuoteIssued(quote);
}

/** Short, display-only form of the issued document hash (full value stays in the title). */
export function shortIssuedHash(hash: string | null | undefined): string | null {
  const value = hash?.trim();
  if (!value) return null;
  return value.length > 16 ? `${value.slice(0, 12)}…${value.slice(-4)}` : value;
}

/** Calendar date (YYYY-MM-DD) in the browser's local time, for the acceptance date default. */
export function localIsoDate(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Approvers the UI may offer: never the requester. The server enforces the same rule. */
export function selectableApprovers<T extends { memberId: string }>(
  options: readonly T[],
  currentMemberId: string | null | undefined,
): T[] {
  return options.filter((option) => option.memberId !== currentMemberId);
}
