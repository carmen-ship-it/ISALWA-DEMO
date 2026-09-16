'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import type { CommandActionResult } from '@/lib/commercial/command-types';

async function memberIdFromAuth(
  auth: NonNullable<Awaited<ReturnType<typeof getServerOsAuthContext>>>,
): Promise<string | null> {
  if (auth.mode === 'dev') return auth.session.memberId?.trim() || null;
  const session = await createOsApiClient(auth).getAuthenticatedSession();
  return session.memberId?.trim() || null;
}

export async function createNotaDeEntregaAction(formData: FormData): Promise<CommandActionResult> {
  const orderId = String(formData.get('orderId') ?? '').trim();
  const deliveredAtRaw = String(formData.get('deliveredAt') ?? '').trim();
  const deliveredTo = String(formData.get('deliveredTo') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();
  const externalDocumentNumber = String(formData.get('externalDocumentNumber') ?? '').trim();

  if (!orderId) return { ok: false, error: 'Seleccione un pedido.' };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const recordedBy = await memberIdFromAuth(auth);
  if (!recordedBy) return { ok: false, error: 'No se pudo identificar al miembro activo.' };

  const deliveredAt = deliveredAtRaw
    ? new Date(deliveredAtRaw).toISOString()
    : new Date().toISOString();

  const payload: Record<string, unknown> = {
    orderId,
    deliveredAt,
    recordedBy,
    source: 'employee_recorded',
  };
  if (deliveredTo) payload.deliveredTo = deliveredTo;
  if (notes) payload.notes = notes;
  if (externalDocumentNumber) payload.externalDocumentNumber = externalDocumentNumber;

  try {
    const client = createOsApiClient(auth);
    const result = await client.executeDeliveryCommand('CreateNotaDeEntrega', payload, createId());
    revalidatePath('/entregas');
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function recordSalidaAction(formData: FormData): Promise<CommandActionResult> {
  const orderId = String(formData.get('orderId') ?? '').trim();
  const exitedAtRaw = String(formData.get('exitedAt') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!orderId) return { ok: false, error: 'Seleccione un pedido.' };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const recordedBy = await memberIdFromAuth(auth);
  if (!recordedBy) return { ok: false, error: 'No se pudo identificar al miembro activo.' };

  const exitedAt = exitedAtRaw ? new Date(exitedAtRaw).toISOString() : new Date().toISOString();
  const payload: Record<string, unknown> = {
    orderId,
    exitedAt,
    recordedBy,
    source: 'employee_recorded',
  };
  if (notes) payload.notes = notes;

  try {
    const client = createOsApiClient(auth);
    const result = await client.executeDeliveryCommand('RecordSalida', payload, createId());
    revalidatePath('/entregas');
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function recordEntregaAction(formData: FormData): Promise<CommandActionResult> {
  const orderId = String(formData.get('orderId') ?? '').trim();
  const deliveredAtRaw = String(formData.get('deliveredAt') ?? '').trim();
  const deliveredTo = String(formData.get('deliveredTo') ?? '').trim();
  const notes = String(formData.get('notes') ?? '').trim();

  if (!orderId) return { ok: false, error: 'Seleccione un pedido.' };
  if (!deliveredTo) return { ok: false, error: 'Indique quién recibió la mercadería.' };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const recordedBy = await memberIdFromAuth(auth);
  if (!recordedBy) return { ok: false, error: 'No se pudo identificar al miembro activo.' };

  const deliveredAt = deliveredAtRaw
    ? new Date(deliveredAtRaw).toISOString()
    : new Date().toISOString();

  const payload: Record<string, unknown> = {
    orderId,
    deliveredAt,
    deliveredTo,
    recordedBy,
    source: 'employee_recorded',
  };
  if (notes) payload.notes = notes;

  try {
    const client = createOsApiClient(auth);
    const result = await client.executeDeliveryCommand('RecordEntrega', payload, createId());
    revalidatePath('/entregas');
    return { ok: true, data: result.data };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
