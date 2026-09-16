import {
  PURCHASE_REQUEST_BOUNDARY,
  PURCHASE_REQUEST_HAPPY_PATH,
  PURCHASE_REQUEST_STATUS_LABELS,
  countPurchaseRequests,
  isPurchaseRequestStatus,
  purchaseRequestNextActionLabel,
  readPurchaseRequestQueue,
  searchPurchaseRequests,
  suggestPurchaseBuyers,
  type PurchaseBuyerCandidate,
  type PurchaseRequest,
  type PurchaseRequestAccessFailure,
  type PurchaseRequestSession,
  type PurchaseRequestStatus,
} from '@isalwa/os-contracts';
import { elapsedAge } from '../time/elapsed';

export const COMPRAS_COPY = {
  kicker: 'Compras',
  title: 'Cola de compras',
  description:
    'El área responsable pide. La encargada de compras compra. Esta cola no es inventario.',
  boundary: PURCHASE_REQUEST_BOUNDARY,
  emptyTitle: 'Cola de compras · estructura propuesta',
  emptyDescription:
    'Esta Versión 1 muestra la estructura propuesta para Compras. Antes de formalizar el registro y sus estados, queremos validar con ustedes cómo funciona realmente el proceso. Un vacío aquí no significa que falte un permiso ni que el inventario esté en cero.',
  loading: 'Cargando la cola de compras',
  errorTitle: 'No se pudo cargar la cola de compras',
  errorDescription: 'La cola no se mostró. No hay un resultado de otra empresa.',
  permissionTitle: 'Sin permiso para la cola de compras',
  permissionDescription:
    'Hace falta el rol de compras asignado. El cargo no abre esta cola. Otra empresa no se ve aquí.',
  age: 'Antigüedad',
  area: 'Área',
  requester: 'Quién pide',
  item: 'Qué se necesita',
  quantity: 'Cantidad',
  status: 'Estado',
  buyer: 'Compradora',
  buyerMissing: 'Todavía no asignada',
  nextAction: 'Siguiente',
  notes: 'Notas',
  evidence: 'Evidencia',
  linked: 'Vínculo guardado',
  stop: 'Cancelado',
  countLabel: 'En la cola',
  recent: 'recién pedido',
} as const;

export type ComprasQueueState = 'ready' | 'loading' | 'error' | 'permission';

export type ComprasQueueItem = {
  id: string;
  ageLabel: string;
  requestingArea: string;
  requestedByLabel: string;
  description: string;
  quantityLabel: string | null;
  linkedContext: string | null;
  status: PurchaseRequestStatus;
  statusLabel: string;
  buyerLabel: string | null;
  nextAction: string | null;
  nextStatus: PurchaseRequestStatus | null;
  canStop: boolean;
  notes: Array<{ id: string; body: string; actorLabel: string; evidenceReference: string | null }>;
};

export type ComprasQueueModel =
  | {
      state: 'ready';
      organizationId: string;
      count: number;
      items: ComprasQueueItem[];
      buyerSuggestions: string[];
    }
  | {
      state: 'permission' | 'error' | 'loading';
      reason?: PurchaseRequestAccessFailure | 'load_failed';
    };

function knownQuantity(request: PurchaseRequest): string | null {
  if (request.quantity && request.unit) return `${request.quantity} ${request.unit}`;
  if (request.quantity) return request.quantity;
  if (request.unit) return request.unit;
  return null;
}

function linkedContext(request: PurchaseRequest): string | null {
  const parts = [request.orderId, request.productionContextId].filter(
    (value): value is string => Boolean(value),
  );
  return parts.length > 0 ? parts.join(' · ') : null;
}

function ageLabel(requestedAt: string, asOf: Date): string {
  const elapsed = elapsedAge(requestedAt, asOf);
  if (elapsed) return elapsed.phrase;
  const at = new Date(requestedAt);
  if (Number.isNaN(at.getTime())) return requestedAt;
  return COMPRAS_COPY.recent;
}

export function toComprasQueueItem(request: PurchaseRequest, asOf = new Date()): ComprasQueueItem {
  const forward = PURCHASE_REQUEST_HAPPY_PATH.includes(
    request.status as (typeof PURCHASE_REQUEST_HAPPY_PATH)[number],
  )
    ? request.status
    : request.status;
  const nextStatus =
    forward === 'solicitado'
      ? 'cotizandose'
      : forward === 'cotizandose'
        ? 'pedido_preparandose'
        : forward === 'pedido_preparandose'
          ? 'entregado'
          : null;
  return {
    id: request.id,
    ageLabel: ageLabel(request.requestedAt, asOf),
    requestingArea: request.requestingArea,
    requestedByLabel: request.requestedByLabel,
    description: request.description,
    quantityLabel: knownQuantity(request),
    linkedContext: linkedContext(request),
    status: request.status,
    statusLabel: PURCHASE_REQUEST_STATUS_LABELS[request.status],
    buyerLabel: request.buyerLabel,
    nextAction: purchaseRequestNextActionLabel(request.status),
    nextStatus,
    canStop: request.status !== 'entregado' && request.status !== 'cancelled',
    notes: request.notes.map((note) => ({
      id: note.id,
      body: note.body,
      actorLabel: note.actorLabel,
      evidenceReference: note.evidenceReference,
    })),
  };
}

/**
 * Builds the Compras queue for one session. Count and suggestions stay in that tenant.
 * Denial returns no count and no names.
 */
export function buildComprasQueue(input: {
  session: PurchaseRequestSession | null | undefined;
  requests: readonly PurchaseRequest[];
  candidates: readonly PurchaseBuyerCandidate[];
  query?: string | null;
  buyerQuery?: string | null;
  statusFilter?: string | null;
  targetOrganizationId?: string | null;
  asOf?: Date;
  failed?: boolean;
}): ComprasQueueModel {
  if (input.failed) return { state: 'error', reason: 'load_failed' };
  const access = readPurchaseRequestQueue(input.session, input.requests, input.targetOrganizationId);
  if (!access.ok) return { state: 'permission', reason: access.reason };

  const query = input.query?.trim() ?? '';
  const listed = query
    ? searchPurchaseRequests(input.session, input.requests, query, input.targetOrganizationId)
    : { ok: true as const, requests: access.requests };
  if (!listed.ok) return { state: 'permission', reason: listed.reason };

  const counted = countPurchaseRequests(input.session, input.requests, input.targetOrganizationId);
  if (!counted.ok) return { state: 'permission', reason: counted.reason };

  const suggestions = suggestPurchaseBuyers(
    input.session,
    input.candidates,
    input.buyerQuery ?? '',
    input.targetOrganizationId,
  );
  if (!suggestions.ok) return { state: 'permission', reason: suggestions.reason };

  const status = input.statusFilter?.trim() ?? '';
  const filtered = status && isPurchaseRequestStatus(status)
    ? listed.requests.filter((request) => request.status === status)
    : listed.requests;

  return {
    state: 'ready',
    organizationId: access.organizationId,
    count: counted.count,
    items: filtered.map((request) => toComprasQueueItem(request, input.asOf)),
    buyerSuggestions: suggestions.labels,
  };
}
