'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { partyHref } from '@/lib/party/navigation';
import {
  CreateWorkItemPayloadSchema,
  ReceiveFinishedGoodsPayloadSchema,
} from '@isalwa/os-contracts';

export type PostSaleExpectedWorkResult = { ok: true } | { ok: false; error: string };
export type PostSaleReceiveResult = { ok: true } | { ok: false; error: string };

/**
 * Persist optional production expected date as Work with dueAt.
 * Uses existing CreateWorkItem — Attention overdue_work derives from dueAt.
 */
export async function createPostSaleExpectedWorkAction(
  payload: Record<string, unknown>,
): Promise<PostSaleExpectedWorkResult> {
  const parsed = CreateWorkItemPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, error: 'La fecha esperada no es válida.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    await client.executeWorkCommand('CreateWorkItem', parsed.data as Record<string, unknown>, createId());
    const partyId =
      parsed.data.subjectType === 'party' && typeof parsed.data.subjectId === 'string'
        ? parsed.data.subjectId
        : null;
    revalidatePath('/trabajo');
    revalidatePath('/inicio');
    revalidatePath('/produccion');
    if (partyId) {
      revalidatePath(partyHref(partyId));
      revalidatePath(`/clientes/${partyId}`, 'page');
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

/**
 * Physical finished-goods receive with optional Pedido context.
 * Not allocation / reservation / FIFO / valuation / stock posting.
 */
export async function receiveFinishedGoodsAction(input: {
  productId: string;
  quantity: string;
  contextOrderId: string;
  contextOrderLineId: string;
  note?: string;
}): Promise<PostSaleReceiveResult> {
  const parsed = ReceiveFinishedGoodsPayloadSchema.safeParse({
    productId: input.productId,
    quantity: input.quantity,
    contextOrderId: input.contextOrderId,
    contextOrderLineId: input.contextOrderLineId,
    note: input.note?.trim() || null,
  });
  if (!parsed.success) {
    return { ok: false, error: 'Revise producto, cantidad y el pedido seleccionado.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    await client.post('/commands/ReceiveFinishedGoods', parsed.data, createId());
    revalidatePath('/almacen');
    revalidatePath('/inicio');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
