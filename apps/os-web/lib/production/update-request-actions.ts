'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { partyHref } from '@/lib/party/navigation';
import {
  buildProductionUpdateRequestWork,
  findOpenProductionUpdateRequest,
} from '@/lib/production/update-request-work';
import { workItemHref } from '@/lib/work/navigation';
import { orderHref } from '@/lib/commercial/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type RequestProductionUpdateResult =
  | { ok: true; workItemId: string; alreadyOpen: boolean; needsCanonicalAssignee: boolean }
  | { ok: false; error: string };

/**
 * Solicitar actualización — CreateWorkItem to canonical production responsible if known.
 * No fake due date. Idempotent on open marker.
 */
export async function requestProductionUpdateAction(input: {
  orderId: string;
  partyId: string;
  actorMemberId: string;
  productionOwnerMemberId?: string | null;
  orderLabel?: string | null;
}): Promise<RequestProductionUpdateResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error };

  const built = buildProductionUpdateRequestWork({
    orderId: input.orderId,
    partyId: input.partyId,
    actorMemberId: input.actorMemberId,
    productionOwnerMemberId: input.productionOwnerMemberId,
    orderLabel: input.orderLabel,
  });
  if (!built.ok) {
    return { ok: false, error: 'No se pudo preparar la solicitud de actualización.' };
  }

  const client = createOsApiClient(auth);
  try {
    const listed = await client.listWorkItems({ status: 'open', limit: 100 });
    const existing = findOpenProductionUpdateRequest(listed.items ?? [], input.orderId);
    if (existing) {
      return {
        ok: true,
        workItemId: existing.workItemId,
        alreadyOpen: true,
        needsCanonicalAssignee: built.needsCanonicalAssignee,
      };
    }

    const result = await client.executeWorkCommand(built.command, built.payload, createId());
    const workItemId = String(result.data.workItemId ?? '').trim();
    if (!workItemId) {
      return { ok: false, error: 'La solicitud se creó pero no se pudo confirmar el trabajo.' };
    }

    revalidatePath('/produccion');
    revalidatePath('/trabajo');
    revalidatePath('/inicio');
    revalidatePath(partyHref(input.partyId));
    revalidatePath(orderHref(input.partyId, input.orderId));
    revalidatePath(workItemHref(workItemId));

    return {
      ok: true,
      workItemId,
      alreadyOpen: false,
      needsCanonicalAssignee: built.needsCanonicalAssignee,
    };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
