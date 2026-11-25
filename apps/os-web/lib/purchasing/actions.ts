'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { canRecordPurchasing } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type ComprasTransitionActionResult =
  | { ok: true; liveWrite: 'PROVEN' }
  | { ok: false; error: string };

function mapTransitionError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|unauthorized_role|403/i.test(message)) {
    return 'No tiene permiso para avanzar o detener pedidos de compra.';
  }
  if (/NOT_FOUND|not_found|404|cross_tenant/i.test(message)) {
    return 'No se encontró ese pedido de compra.';
  }
  if (/invalid_transition|terminal|INVALID_TRANSITION|TERMINAL/i.test(message)) {
    return 'Ese pedido ya no admite ese cambio de estado.';
  }
  if (/invalid_status|VALIDATION|INVALID_STATUS/i.test(message)) {
    return 'El estado indicado no es válido.';
  }
  if (/AUTH|sesión|401/i.test(message)) {
    return 'Su sesión venció. Vuelva a iniciar sesión.';
  }
  return 'No se pudo actualizar el pedido de compra.';
}

async function actorLabelForSession(): Promise<string> {
  const web = await getServerWebSession();
  return (
    web?.displayLabel?.trim() ||
    (web?.mode === 'supabase' ? web.email?.trim() || null : null) ||
    'Compras'
  );
}

async function mutatePurchaseRequestStatus(input: {
  requestId: string;
  status: string;
  note?: string | null;
}): Promise<ComprasTransitionActionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error };

  const requestId = input.requestId.trim();
  const status = input.status.trim();
  if (!requestId || !status) {
    return { ok: false, error: 'Falta el pedido o el estado.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const capabilities = await loadMemberCapabilities();
  if (!capabilities) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  if (!canRecordPurchasing(capabilities.grantedScopes)) {
    return { ok: false, error: 'No tiene permiso para avanzar o detener pedidos de compra.' };
  }

  const client = createOsApiClient(auth);
  const actorLabel = await actorLabelForSession();
  try {
    await client.transitionPurchaseRequest(requestId, {
      status,
      note: input.note ?? null,
      actorLabel,
      buyerLabel: actorLabel,
      statusEntryId: createId(),
    });
    revalidatePath('/compras');
    revalidatePath('/inicio');
    return { ok: true, liveWrite: 'PROVEN' };
  } catch (err) {
    return { ok: false, error: mapTransitionError(err) };
  }
}

/** Advance along the happy path (solicitado → cotizandose → pedido_preparandose → entregado). */
export async function advancePurchaseRequestAction(
  requestId: string,
  status: string,
): Promise<ComprasTransitionActionResult> {
  return mutatePurchaseRequestStatus({ requestId, status });
}

/** Stop a mistaken request (cancelled). Not a happy-path step. */
export async function stopPurchaseRequestAction(
  requestId: string,
): Promise<ComprasTransitionActionResult> {
  return mutatePurchaseRequestStatus({
    requestId,
    status: 'cancelled',
    note: 'Detenido desde la cola de compras',
  });
}
