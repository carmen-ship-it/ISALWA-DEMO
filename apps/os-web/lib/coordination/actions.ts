'use server';

import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';
import type { CoordinationDecisionRecord } from '@isalwa/os-contracts';

export type CoordinationActionResult =
  | { ok: true; decision: CoordinationDecisionRecord; liveWrite: 'PROVEN' }
  | { ok: false; error: string };

function mapError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/PERMISSION_DENIED|unauthorized_role|403/i.test(message)) {
    return 'No tiene la capacidad asignada para registrar una decisión de coordinación.';
  }
  if (/NOT_FOUND|not_found|404/i.test(message)) {
    return 'No se encontró esa decisión.';
  }
  if (/CONFLICT|already_/i.test(message)) {
    return 'Esa decisión ya está registrada o resuelta.';
  }
  if (/AUTH|sesión|401/i.test(message)) {
    return 'Su sesión venció. Vuelva a iniciar sesión.';
  }
  return 'No se pudo registrar la decisión de coordinación.';
}

async function actorLabelForSession(): Promise<string> {
  const web = await getServerWebSession();
  return (
    web?.displayLabel?.trim() ||
    (web?.mode === 'supabase' ? web.email?.trim() || null : null) ||
    'Coordinación'
  );
}

export async function recordCoordinationDecisionAction(input: {
  decision: string;
  ownerLabel?: string | null;
  dueAt?: string | null;
  notes?: string | null;
  linkedCaseId?: string | null;
}): Promise<CoordinationActionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.recordCoordinationDecision({
      decision: input.decision,
      ownerLabel: input.ownerLabel ?? null,
      dueAt: input.dueAt ?? null,
      notes: input.notes ?? null,
      linkedCaseId: input.linkedCaseId ?? null,
      actorLabel: await actorLabelForSession(),
    });
    revalidatePath('/coordinacion');
    revalidatePath('/inicio');
    return { ok: true, decision: result.decision, liveWrite: 'PROVEN' };
  } catch (err) {
    return { ok: false, error: mapError(err) };
  }
}

export async function resolveCoordinationDecisionAction(input: {
  resolvesDecisionId: string;
  decision: string;
  ownerLabel?: string | null;
  dueAt?: string | null;
  notes?: string | null;
  linkedCaseId?: string | null;
}): Promise<CoordinationActionResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return { ok: false, error: previewGate.error };

  const auth = await getServerOsAuthContext();
  if (!auth) return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };

  const client = createOsApiClient(auth);
  try {
    const result = await client.resolveCoordinationDecision(input.resolvesDecisionId, {
      decision: input.decision,
      ownerLabel: input.ownerLabel ?? null,
      dueAt: input.dueAt ?? null,
      notes: input.notes ?? null,
      linkedCaseId: input.linkedCaseId ?? null,
      actorLabel: await actorLabelForSession(),
    });
    revalidatePath('/coordinacion');
    revalidatePath('/inicio');
    return { ok: true, decision: result.decision, liveWrite: 'PROVEN' };
  } catch (err) {
    return { ok: false, error: mapError(err) };
  }
}
