'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { memberHref, equipoHref } from '@/lib/workforce/navigation';
import { workItemHref } from '@/lib/work/navigation';
import { ADMIN_REASSIGN_WORK_COMMAND } from '@/lib/work/command-types';

export type ReassignWorkActionResult =
  | { ok: true; reassignedCount: number }
  | { ok: false; error: string };

/**
 * people.admin surface only. Reuses existing ReassignWork command — no second command.
 * Accepts one or many `workItemId` fields (batch for member continuity).
 */
export async function reassignWorkAction(formData: FormData): Promise<ReassignWorkActionResult> {
  const workItemIds = formData
    .getAll('workItemId')
    .map((value) => String(value).trim())
    .filter(Boolean);
  const newOwnerMemberId = String(formData.get('newOwnerMemberId') ?? '').trim();
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  const fromMemberId = String(formData.get('fromMemberId') ?? '').trim();
  const confirmed = String(formData.get('confirmed') ?? '') === 'yes';

  if (workItemIds.length === 0) {
    return { ok: false, error: 'Seleccione al menos un trabajo abierto.' };
  }
  if (!newOwnerMemberId) {
    return { ok: false, error: 'Seleccione la persona que recibirá el trabajo.' };
  }
  if (fromMemberId && newOwnerMemberId === fromMemberId) {
    return { ok: false, error: 'Elija una persona distinta a la responsable actual.' };
  }
  if (!confirmed) {
    return { ok: false, error: 'Confirme la reasignación antes de continuar.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  const uniqueIds = [...new Set(workItemIds)];
  const reason = reasonRaw || undefined;

  try {
    for (const workItemId of uniqueIds) {
      await client.executeWorkCommand(
        ADMIN_REASSIGN_WORK_COMMAND,
        {
          workItemId,
          newOwnerMemberId,
          ...(reason ? { reason } : {}),
        },
        createId(),
      );
    }
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }

  revalidatePath('/trabajo');
  revalidatePath('/inicio');
  if (fromMemberId) {
    revalidatePath(memberHref(fromMemberId));
    revalidatePath(equipoHref());
  }
  if (newOwnerMemberId) {
    revalidatePath(memberHref(newOwnerMemberId));
  }
  for (const workItemId of uniqueIds) {
    revalidatePath(workItemHref(workItemId));
  }

  return { ok: true, reassignedCount: uniqueIds.length };
}
