/**
 * ESTADO CONOCIDO — factual Pedido status intelligence.
 * Lists only recorded / missing / pending-human facts. No invented factory state.
 */

export const PEDIDO_KNOWN_STATE_COPY = {
  heading: 'Estado conocido',
  confirmado: 'CONFIRMADO',
  pendiente: 'PENDIENTE DE CONFIRMAR',
  noRegistrado: 'NO REGISTRADO',
  recomendacion: 'RECOMENDACIÓN',
  aQuienPreguntar: 'A QUIÉN PREGUNTAR',
  emptyConfirmado: 'Sin hechos confirmados aún en este pedido.',
  emptyPendiente: 'Nada pendiente de confirmar en lo cargado.',
  emptyMissing: 'Sin huecos críticos detectados en lo cargado.',
} as const;

export type PedidoKnownStateInput = {
  orderNumber: string;
  customerName: string;
  ownerLabel: string | null;
  statusLabel: string;
  sourceQuoteNumber: string | null;
  totalLabel: string | null;
  createdAtLabel: string | null;
  hasOpenPrepReviews: boolean;
  finishedGoodsEvidence: boolean;
  hasDeliveryNote: boolean;
  hasSalida: boolean;
  hasEntrega: boolean;
  nextSafeAction: string | null;
  whoToAsk: string | null;
};

export type PedidoKnownStateView = {
  confirmado: string[];
  pendienteDeConfirmar: string[];
  noRegistrado: string[];
  recomendacion: string | null;
  aQuienPreguntar: string | null;
};

export function buildPedidoKnownState(input: PedidoKnownStateInput): PedidoKnownStateView {
  const confirmado: string[] = [];
  const pendienteDeConfirmar: string[] = [];
  const noRegistrado: string[] = [];

  confirmado.push(`Pedido ${input.orderNumber} · ${input.statusLabel}`);
  if (input.customerName.trim()) confirmado.push(`Cliente: ${input.customerName.trim()}`);
  if (input.sourceQuoteNumber) {
    confirmado.push(`Cotización de origen: ${input.sourceQuoteNumber}`);
  }
  if (input.totalLabel) confirmado.push(`Total: ${input.totalLabel}`);
  if (input.createdAtLabel) confirmado.push(`Creado: ${input.createdAtLabel}`);
  if (input.ownerLabel?.trim()) confirmado.push(`Responsable: ${input.ownerLabel.trim()}`);

  if (input.finishedGoodsEvidence) {
    confirmado.push('Ingreso de producto terminado registrado (hecho reportado; no es stock disponible).');
  }
  if (input.hasDeliveryNote) confirmado.push('Nota de entrega registrada.');
  if (input.hasSalida) confirmado.push('Salida de almacén registrada.');
  if (input.hasEntrega) confirmado.push('Entrega al cliente registrada.');

  if (input.hasOpenPrepReviews) {
    pendienteDeConfirmar.push('Revisión operativa solicitada — espera respuesta del área.');
  }

  if (!input.sourceQuoteNumber) {
    noRegistrado.push('Cotización de origen no vinculada en este registro.');
  }
  if (!input.finishedGoodsEvidence) {
    noRegistrado.push('Ingreso de producto terminado.');
  }
  if (!input.hasDeliveryNote) {
    noRegistrado.push('Nota de entrega.');
  }
  if (!input.hasSalida) {
    noRegistrado.push('Salida de almacén.');
  }
  if (!input.hasEntrega) {
    noRegistrado.push('Entrega al cliente.');
  }

  return {
    confirmado,
    pendienteDeConfirmar,
    noRegistrado,
    recomendacion: input.nextSafeAction?.trim() || null,
    aQuienPreguntar: input.whoToAsk?.trim() || null,
  };
}
