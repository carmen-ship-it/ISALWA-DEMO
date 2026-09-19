'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { orderHref } from '@/lib/commercial/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

type ActionResult = { ok: true; documentId?: string } | { ok: false; error: string };

async function resolveActorMemberId(): Promise<string | null> {
  const capabilities = await loadMemberCapabilities();
  const memberId = capabilities?.memberId?.trim() ?? '';
  return memberId || null;
}

function documentIdFromCommand(data: Record<string, unknown> | undefined): string | undefined {
  const id = data?.deliveryNoteId ?? data?.warehouseExitId ?? data?.deliveryId;
  return typeof id === 'string' && id.trim() ? id : undefined;
}

async function runDeliveryCommand(
  commandName:
    | 'CreateNotaDeEntrega'
    | 'RecordSalida'
    | 'RecordEntrega'
    | 'CorrectDeliveryDocument',
  payload: Record<string, unknown>,
  partyId: string,
  orderId: string,
  idempotencyKey: string,
): Promise<ActionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;
  const key = idempotencyKey.trim();
  if (!key) {
    return { ok: false, error: 'No se pudo reutilizar el mismo intento. Actualice la página.' };
  }
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const client = createOsApiClient(auth);
  try {
    const response = await client.post<{ data?: Record<string, unknown> }>(
      `/commands/${commandName}`,
      payload,
      key,
    );
    revalidatePath(orderHref(partyId, orderId));
    revalidatePath('/entregas');
    return { ok: true, documentId: documentIdFromCommand(response?.data) };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function createNotaDeEntregaAction(input: {
  partyId: string;
  orderId: string;
  recipient: string;
  deliveredBy: string;
  observations: string | null;
  quantities: Array<{ orderLineId: string; quantity: number }>;
  idempotencyKey: string;
}): Promise<ActionResult> {
  const actorMemberId = await resolveActorMemberId();
  if (!actorMemberId) return { ok: false, error: 'No se pudo identificar al miembro de la sesión.' };
  if (!input.recipient.trim() || !input.deliveredBy.trim()) {
    return { ok: false, error: 'Complete destinatario y entregado por.' };
  }
  return runDeliveryCommand(
    'CreateNotaDeEntrega',
    {
      orderId: input.orderId,
      recipient: input.recipient.trim(),
      deliveredBy: input.deliveredBy.trim(),
      observations: input.observations,
      quantities: input.quantities,
      recordedBy: actorMemberId,
      source: 'employee_recorded',
    },
    input.partyId,
    input.orderId,
    input.idempotencyKey,
  );
}

export async function recordSalidaAction(input: {
  partyId: string;
  orderId: string;
  deliveryNoteId: string | null;
  quantities: Array<{ orderLineId: string; quantity: number }>;
  notes: string | null;
  idempotencyKey: string;
}): Promise<ActionResult> {
  const actorMemberId = await resolveActorMemberId();
  if (!actorMemberId) return { ok: false, error: 'No se pudo identificar al miembro de la sesión.' };
  return runDeliveryCommand(
    'RecordSalida',
    {
      orderId: input.orderId,
      exitedAt: new Date().toISOString(),
      recordedBy: actorMemberId,
      notes: input.notes,
      quantities: input.quantities,
      deliveryNoteId: input.deliveryNoteId,
      source: 'employee_recorded',
    },
    input.partyId,
    input.orderId,
    input.idempotencyKey,
  );
}

export async function recordEntregaAction(input: {
  partyId: string;
  orderId: string;
  receivedBy: string;
  deliveryNoteId: string | null;
  quantities: Array<{ orderLineId: string; quantity: number }>;
  notes: string | null;
  idempotencyKey: string;
}): Promise<ActionResult> {
  const actorMemberId = await resolveActorMemberId();
  if (!actorMemberId) return { ok: false, error: 'No se pudo identificar al miembro de la sesión.' };
  if (!input.receivedBy.trim()) return { ok: false, error: 'Indique quién recibió la mercadería.' };
  return runDeliveryCommand(
    'RecordEntrega',
    {
      orderId: input.orderId,
      deliveredAt: new Date().toISOString(),
      receivedBy: input.receivedBy.trim(),
      recordedBy: actorMemberId,
      notes: input.notes,
      quantities: input.quantities,
      deliveryNoteId: input.deliveryNoteId,
      source: 'employee_recorded',
    },
    input.partyId,
    input.orderId,
    input.idempotencyKey,
  );
}

export async function correctDeliveryDocumentAction(input: {
  partyId: string;
  orderId: string;
  deliveryNoteId: string;
  reason: string;
}): Promise<ActionResult> {
  const actorMemberId = await resolveActorMemberId();
  if (!actorMemberId) return { ok: false, error: 'No se pudo identificar al miembro de la sesión.' };
  return runDeliveryCommand(
    'CorrectDeliveryDocument',
    {
      deliveryNoteId: input.deliveryNoteId,
      reason: input.reason,
      recordedBy: actorMemberId,
      source: 'employee_recorded',
    },
    input.partyId,
    input.orderId,
    createId(),
  );
}
