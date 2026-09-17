'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import {
  buildOrderPrepReviewWork,
  findOpenOrderPrepReviews,
  orderPrepPartyHref,
  type OrderPrepDepartment,
} from '@/components/commercial/order-prep-work';
import { partyHref } from '@/lib/party/navigation';
import { workItemHref } from '@/lib/work/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type RequestOrderPrepReviewResult =
  | {
      ok: true;
      workItemId: string;
      alreadyOpen: boolean;
      department: OrderPrepDepartment;
    }
  | { ok: false; error: string };

/**
 * Creates governed Pedido preparation review Work.
 * Idempotent: if an equivalent open review exists, returns that workItemId.
 * Does not mutate Pedido / inventory / approvals / messaging.
 */
export async function requestOrderPrepReviewAction(input: {
  department: OrderPrepDepartment;
  orderId: string;
  partyId: string;
  actorMemberId: string;
  assigneeMemberId?: string | null;
  orderLabel?: string | null;
}): Promise<RequestOrderPrepReviewResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error };

  const built = buildOrderPrepReviewWork({
    department: input.department,
    orderId: input.orderId,
    partyId: input.partyId,
    actorMemberId: input.actorMemberId,
    assigneeMemberId: input.assigneeMemberId,
    orderLabel: input.orderLabel,
  });
  if (!built.ok) {
    if (built.reason === 'missing_assignee') {
      return { ok: false, error: 'Aún no hay un responsable de producción asignado.' };
    }
    return { ok: false, error: 'No se pudo preparar la solicitud de revisión.' };
  }

  const client = createOsApiClient(auth);
  try {
    const listed = await client.listWorkItems({ status: 'open', limit: 100 });
    const open = findOpenOrderPrepReviews(
      listed.items ?? [],
      input.orderId,
      input.partyId,
    );
    const existing = open[input.department];
    if (existing) {
      return {
        ok: true,
        workItemId: existing.workItemId,
        alreadyOpen: true,
        department: input.department,
      };
    }

    const result = await client.executeWorkCommand(
      built.command,
      built.payload,
      createId(),
    );
    const workItemId = String(result.data.workItemId ?? '').trim();
    if (!workItemId) {
      return { ok: false, error: 'La revisión se creó pero no se pudo confirmar el trabajo.' };
    }

    revalidatePath(orderPrepPartyHref(input.partyId, input.orderId));
    revalidatePath(partyHref(input.partyId));
    revalidatePath('/trabajo');
    revalidatePath('/inicio');
    revalidatePath(workItemHref(workItemId));

    return {
      ok: true,
      workItemId,
      alreadyOpen: false,
      department: input.department,
    };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
