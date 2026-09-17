/**
 * "Solicitar actualización" — creates governed Work for production status.
 * Recipient is the canonical production responsible when known; otherwise unassigned
 * coordination Work owned by the actor (does not invent a plant owner).
 */

import { CreateWorkItemPayloadSchema } from '@isalwa/os-contracts';

export const PRODUCTION_UPDATE_REQUEST_COPY = {
  action: 'Solicitar actualización',
  requested: 'Actualización solicitada',
  noAssignee: 'Sin responsable de producción canónico — queda a su nombre para coordinar.',
  title: 'Actualización de producción',
  body: 'Se solicita el estado actual de producción para responder al cliente o al área comercial.',
} as const;

/** Stable marker for idempotent open-update detection. Do not localize. */
export function productionUpdateMarker(orderId: string): string {
  return `[[production-update:${orderId.trim()}]]`;
}

export function parseProductionUpdateMarker(
  text: string | null | undefined,
): { orderId: string } | null {
  if (!text) return null;
  const match = text.match(/\[\[production-update:([^\]]+)\]\]/);
  if (!match) return null;
  return { orderId: match[1].trim() };
}

export type ProductionUpdateOpenRequest = {
  workItemId: string;
  title: string;
};

export function findOpenProductionUpdateRequest(
  workItems: readonly {
    workItemId: string;
    title: string;
    description: string | null;
    status: string;
  }[],
  orderId: string,
): ProductionUpdateOpenRequest | null {
  const wanted = orderId.trim();
  for (const row of workItems) {
    if (row.status !== 'open') continue;
    const parsed =
      parseProductionUpdateMarker(row.description) ?? parseProductionUpdateMarker(row.title);
    if (!parsed || parsed.orderId !== wanted) continue;
    return { workItemId: row.workItemId, title: row.title };
  }
  return null;
}

export type ProductionUpdateWorkResult =
  | {
      ok: true;
      command: 'CreateWorkItem';
      payload: Record<string, unknown>;
      needsCanonicalAssignee: boolean;
    }
  | {
      ok: false;
      reason: 'missing_order' | 'missing_actor' | 'missing_party' | 'invalid_payload';
    };

export function buildProductionUpdateRequestWork(input: {
  orderId: string;
  partyId: string;
  actorMemberId: string;
  /** Canonical production responsible when known. */
  productionOwnerMemberId?: string | null;
  orderLabel?: string | null;
}): ProductionUpdateWorkResult {
  const orderId = input.orderId.trim();
  const partyId = input.partyId.trim();
  const actorMemberId = input.actorMemberId.trim();
  if (!orderId) return { ok: false, reason: 'missing_order' };
  if (!partyId) return { ok: false, reason: 'missing_party' };
  if (!actorMemberId) return { ok: false, reason: 'missing_actor' };

  const canonical = input.productionOwnerMemberId?.trim() ?? '';
  const ownerMemberId = canonical || actorMemberId;
  const label = input.orderLabel?.trim();
  const title = label
    ? `${PRODUCTION_UPDATE_REQUEST_COPY.title} · ${label}`
    : PRODUCTION_UPDATE_REQUEST_COPY.title;
  const marker = productionUpdateMarker(orderId);
  const orderRef = label ? `${label} (${orderId})` : orderId;

  const payload = {
    title,
    description: `${PRODUCTION_UPDATE_REQUEST_COPY.body}\n\nContexto: Pedido ${orderRef}\n${marker}`,
    ownerMemberId,
    subjectType: 'party' as const,
    subjectId: partyId,
    priority: 'normal' as const,
  };

  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, reason: 'invalid_payload' };

  return {
    ok: true,
    command: 'CreateWorkItem',
    payload: parsed.data as Record<string, unknown>,
    needsCanonicalAssignee: !canonical,
  };
}
