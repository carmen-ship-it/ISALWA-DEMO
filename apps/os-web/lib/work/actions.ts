'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { quoteHref } from '@/lib/commercial/navigation';
import { partyHref } from '@/lib/party/navigation';
import { followUpOwnerFromAuthenticatedSession } from '@/lib/auth/session-identity';
import {
  buildCompleteWorkPayload,
  buildCancelWorkPayload,
  buildCreateFollowUpPayload,
  FOLLOW_UP_COPY,
  presentClientFollowUp,
  resolveFollowUpSubject,
} from '@/lib/work/follow-up';
import { workItemHref } from '@/lib/work/navigation';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type FollowUpActionResult =
  | {
      ok: true;
      pending: { title: string; statusLabel: string; dueLabel: string; workItemId: string };
    }
  | { ok: false; error: string };

function revalidateFollowUpSurfaces(partyId?: string, workItemId?: string, quoteId?: string) {
  if (partyId) {
    revalidatePath(partyHref(partyId));
    revalidatePath(`/clientes/${partyId}`, 'page');
  }
  revalidatePath('/trabajo');
  if (workItemId) revalidatePath(workItemHref(workItemId));
  if (partyId && quoteId) {
    revalidatePath(quoteHref(partyId, quoteId));
    revalidatePath('/cotizaciones');
  }
  // Cache refresh only. Does not edit Inicio. Derived queues stay derived.
  revalidatePath('/inicio');
}

function descriptionWithQuoteContext(
  description: string,
  quoteId: string,
  quoteNumber: string,
): string {
  const base = description.trim();
  if (!quoteId && !quoteNumber) return base;
  const ref = quoteNumber
    ? `Cotización ${quoteNumber}`
    : `Cotización ${quoteId}`;
  const context = `Contexto: ${ref}`;
  return base ? `${base}\n\n${context}` : context;
}

export async function createFollowUpAction(formData: FormData): Promise<FollowUpActionResult> {
  const partyId = String(formData.get('partyId') ?? '').trim();
  const quoteId = String(formData.get('quoteId') ?? '').trim();
  const quoteNumber = String(formData.get('quoteNumber') ?? '').trim();
  const title = String(formData.get('title') ?? '');
  const description = descriptionWithQuoteContext(
    String(formData.get('description') ?? ''),
    quoteId,
    quoteNumber,
  );
  const dueAt = String(formData.get('dueAt') ?? '');

  if (!partyId) return { ok: false, error: FOLLOW_UP_COPY.customerMissing };

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  let ownerMemberId: string;
  try {
    const session = await client.getAuthenticatedSession();
    const owner = followUpOwnerFromAuthenticatedSession(session, {
      ownerMemberId: formData.get('ownerMemberId'),
      organizationId: formData.get('organizationId'),
    });
    if (!owner) return { ok: false, error: FOLLOW_UP_COPY.identityMissing };
    ownerMemberId = owner;
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }

  let commercialAccountId: string | null = null;
  try {
    const detail = await client.getParty(partyId);
    commercialAccountId = detail.commercialAccount?.id ?? null;
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }

  const subject = resolveFollowUpSubject({ partyId, commercialAccountId });
  if (!subject) return { ok: false, error: FOLLOW_UP_COPY.customerMissing };

  const built = buildCreateFollowUpPayload({
    title,
    description,
    dueAt,
    ownerMemberId,
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
  });
  if (!built.ok) return built;

  try {
    const result = await client.executeWorkCommand(built.command, built.payload, createId());
    revalidateFollowUpSurfaces(partyId, String(result.data.workItemId ?? ''), quoteId || undefined);
    const presented = presentClientFollowUp({
      title: String(built.payload.title ?? title.trim()),
      status: 'open',
      dueAt: typeof built.payload.dueAt === 'string' ? built.payload.dueAt : null,
    });
    return {
      ok: true,
      pending: {
        title: presented.title,
        statusLabel: presented.statusLabel,
        dueLabel: presented.dueLabel,
        workItemId: String(result.data.workItemId ?? ''),
      },
    };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function completeFollowUpAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const workItemId = String(formData.get('workItemId') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '').trim();
  const built = buildCompleteWorkPayload(workItemId);
  if (!built.ok) return built;

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    await client.executeWorkCommand(built.command, built.payload, createId());
    revalidateFollowUpSurfaces(partyId || undefined, workItemId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function cancelFollowUpAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const workItemId = String(formData.get('workItemId') ?? '').trim();
  const partyId = String(formData.get('partyId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '');
  const built = buildCancelWorkPayload(workItemId, reason);
  if (!built.ok) return built;

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    await client.executeWorkCommand(built.command, built.payload, createId());
    revalidateFollowUpSurfaces(partyId || undefined, workItemId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
