'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { orderHref } from '@/lib/commercial/navigation';
import { followUpOwnerFromAuthenticatedSession } from '@/lib/auth/session-identity';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import { buildCompleteWorkPayload } from '@/lib/work/follow-up';

export const PURCHASING_CONCLUSIONS = [
  'No requiere acción de Compras',
  'Requiere gestión de compra externa',
  'Falta información',
] as const;

export type PurchasingConclusion = (typeof PURCHASING_CONCLUSIONS)[number];

export function purchasingResultCopy(conclusion: string): string {
  if (conclusion === 'Requiere gestión de compra externa') {
    return 'Requiere gestión de compra fuera de ISALWA.';
  }
  return conclusion;
}

export function comprasResultMarker(orderId: string): string {
  return `[[compras-result:${orderId.trim()}]]`;
}

export async function resolvePurchasingReviewAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertRolePreviewAllowsMutation();
  if (!gate.ok) return gate;

  const workItemId = String(formData.get('workItemId') ?? '').trim();
  const requesterMemberId = String(formData.get('requesterMemberId') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '').trim();
  const orderId = String(formData.get('orderId') ?? '').trim();
  const orderNumber = String(formData.get('orderNumber') ?? '').trim();
  const conclusion = String(formData.get('conclusion') ?? '').trim();
  const comment = String(formData.get('comment') ?? '').trim();

  if (!workItemId || !partyId || !orderId) {
    return { ok: false, error: 'La revisión no está completa.' };
  }
  if (!PURCHASING_CONCLUSIONS.includes(conclusion as PurchasingConclusion)) {
    return { ok: false, error: 'Seleccione una conclusión.' };
  }
  if (!comment) {
    return { ok: false, error: 'Escriba el comentario o la conclusión.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  let ownerMemberId = requesterMemberId;
  if (!ownerMemberId) {
    const session = await client.getAuthenticatedSession();
    ownerMemberId = followUpOwnerFromAuthenticatedSession(session) ?? '';
  }
  if (!ownerMemberId) return { ok: false, error: 'No hay un responsable para devolver el resultado.' };
  const visible = purchasingResultCopy(conclusion);
  const title = `Compras · ${orderNumber || 'Pedido'} · ${visible}`;
  const description = `${visible}\nComentario: ${comment}\n${comprasResultMarker(orderId)}`;
  const complete = buildCompleteWorkPayload(workItemId);
  if (!complete.ok) return complete;

  try {
    await client.executeWorkCommand(
      'CreateWorkItem',
      {
        title,
        description,
        ownerMemberId,
        subjectType: 'party',
        subjectId: partyId,
      },
      createId(),
    );
    await client.executeWorkCommand(complete.command, complete.payload, createId());
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }

  revalidatePath('/compras');
  revalidatePath('/trabajo');
  revalidatePath(orderHref(partyId, orderId));
  return { ok: true };
}
