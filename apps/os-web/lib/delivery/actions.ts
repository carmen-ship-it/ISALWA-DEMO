'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { orderHref } from '@/lib/commercial/navigation';

type ActionResult = { ok: true } | { ok: false; error: string };

async function resolveActorMemberId(): Promise<string | null> {
  const capabilities = await loadMemberCapabilities();
  const memberId = capabilities?.memberId?.trim() ?? '';
  return memberId || null;
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
): Promise<ActionResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const client = createOsApiClient(auth);
  try {
    await client.post(`/commands/${commandName}`, payload, createId());
    revalidatePath(orderHref(partyId, orderId));
    return { ok: true };
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
  );
}

export async function recordSalidaAction(input: {
  partyId: string;
  orderId: string;
  deliveryNoteId: string | null;
  quantities: Array<{ orderLineId: string; quantity: number }>;
  notes: string | null;
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
  );
}

export async function recordEntregaAction(input: {
  partyId: string;
  orderId: string;
  receivedBy: string;
  deliveryNoteId: string | null;
  quantities: Array<{ orderLineId: string; quantity: number }>;
  notes: string | null;
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
  );
}
