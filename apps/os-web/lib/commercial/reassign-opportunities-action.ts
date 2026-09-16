'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { opportunityHref } from '@/lib/commercial/navigation';
import { memberHref, equipoHref } from '@/lib/workforce/navigation';

export type ReassignOpportunitiesActionResult =
  | { ok: true; reassignedCount: number }
  | { ok: false; error: string };

/**
 * people.admin member-detail continuity. Reuses AssignOpportunityOwner — no second command.
 */
export async function reassignOpportunitiesAction(
  formData: FormData,
): Promise<ReassignOpportunitiesActionResult> {
  const opportunityIdsRaw = formData.getAll('opportunityId').map((value) => String(value).trim());
  const partyIdsRaw = formData.getAll('partyId').map((value) => String(value).trim());
  const pairs = opportunityIdsRaw
    .map((opportunityId, index) => ({
      opportunityId,
      partyId: partyIdsRaw[index]?.trim() ?? '',
    }))
    .filter((row) => row.opportunityId.length > 0);
  const ownerMemberId = String(formData.get('ownerMemberId') ?? '').trim();
  const fromMemberId = String(formData.get('fromMemberId') ?? '').trim();
  const confirmed = String(formData.get('confirmed') ?? '') === 'yes';

  if (pairs.length === 0) {
    return { ok: false, error: 'Seleccione al menos una oportunidad abierta.' };
  }
  if (!ownerMemberId) {
    return { ok: false, error: 'Seleccione la persona que recibirá las oportunidades.' };
  }
  if (fromMemberId && ownerMemberId === fromMemberId) {
    return { ok: false, error: 'Elija una persona distinta a la responsable actual.' };
  }
  if (!confirmed) {
    return { ok: false, error: 'Confirme la reasignación antes de continuar.' };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  const seen = new Set<string>();
  const uniquePairs = pairs.filter((row) => {
    if (seen.has(row.opportunityId)) return false;
    seen.add(row.opportunityId);
    return true;
  });

  try {
    for (const { opportunityId, partyId } of uniquePairs) {
      await client.executeCommand(
        'AssignOpportunityOwner',
        { opportunityId, ownerMemberId },
        createId(),
      );
      if (partyId) {
        revalidatePath(opportunityHref(partyId, opportunityId));
      }
    }
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }

  revalidatePath('/oportunidades');
  revalidatePath('/inicio');
  if (fromMemberId) {
    revalidatePath(memberHref(fromMemberId));
    revalidatePath(equipoHref());
  }
  if (ownerMemberId) {
    revalidatePath(memberHref(ownerMemberId));
  }

  return { ok: true, reassignedCount: uniquePairs.length };
}
