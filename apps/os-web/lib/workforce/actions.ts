'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapWorkforceCommandError } from '@/lib/workforce/command-errors';
import type { CommandActionResult } from '@/lib/workforce/command-types';
import { buildInviteMemberPayload } from '@/lib/workforce/invite';
import { equipoHref, inviteMemberHref, memberHref } from '@/lib/workforce/navigation';

async function runWorkforceCommand(
  command: Parameters<typeof mapWorkforceCommandError>[0],
  fn: (client: ReturnType<typeof createOsApiClient>) => Promise<Record<string, unknown> | undefined>,
): Promise<CommandActionResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: 'Su sesión venció. Vuelva a iniciar sesión.' };
  }
  const client = createOsApiClient(auth);
  try {
    const data = await fn(client);
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: mapWorkforceCommandError(command, err) };
  }
}

function revalidateMember(memberId: string) {
  revalidatePath(equipoHref());
  revalidatePath(memberHref(memberId));
}

export async function inviteMemberAction(formData: FormData): Promise<CommandActionResult> {
  const built = buildInviteMemberPayload({
    email: String(formData.get('email') ?? ''),
    givenName: String(formData.get('givenName') ?? ''),
    familyName: String(formData.get('familyName') ?? ''),
    roleKey: String(formData.get('roleKey') ?? ''),
    departmentId: String(formData.get('departmentId') ?? ''),
  });
  if (!built.ok) return built;

  const result = await runWorkforceCommand('InviteMember', (client) =>
    client.executeWorkforceCommand('InviteMember', built.payload, createId()).then((r) => r.data),
  );
  if (!result.ok) return result;

  revalidatePath(equipoHref());
  revalidatePath(inviteMemberHref());
  const memberId = typeof result.data?.memberId === 'string' ? result.data.memberId : '';
  if (memberId) {
    revalidatePath(memberHref(memberId));
    return { ...result, redirectTo: memberHref(memberId) };
  }
  return result;
}

export async function changeDepartmentAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const departmentId = String(formData.get('departmentId') ?? '').trim();
  if (!memberId || !departmentId) {
    return { ok: false, error: 'Seleccione un departamento.' };
  }
  const result = await runWorkforceCommand('ChangeDepartment', (client) =>
    client.executeWorkforceCommand('ChangeDepartment', { memberId, departmentId }, createId()).then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function changeRoleAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const roleKey = String(formData.get('roleKey') ?? '').trim();
  if (!memberId || !roleKey) {
    return { ok: false, error: 'Seleccione un rol.' };
  }
  const result = await runWorkforceCommand('ChangeRole', (client) =>
    client.executeWorkforceCommand('ChangeRole', { memberId, roleKey }, createId()).then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function changeManagerAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const managerMemberId = String(formData.get('managerMemberId') ?? '').trim();
  if (!memberId || !managerMemberId) {
    return { ok: false, error: 'Seleccione un responsable.' };
  }
  const result = await runWorkforceCommand('ChangeManager', (client) =>
    client
      .executeWorkforceCommand('ChangeManager', { memberId, managerMemberId }, createId())
      .then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function suspendMemberAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  if (!memberId) return { ok: false, error: 'Empleado no identificado.' };
  const payload: Record<string, unknown> = { memberId };
  if (reason) payload.reason = reason;
  const result = await runWorkforceCommand('SuspendMember', (client) =>
    client.executeWorkforceCommand('SuspendMember', payload, createId()).then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function activateMemberAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const providerSubject = String(formData.get('providerSubject') ?? '').trim();
  if (!memberId || !providerSubject) {
    return { ok: false, error: 'No se pudo preparar la reactivación.' };
  }
  const result = await runWorkforceCommand('ActivateMember', (client) =>
    client
      .executeWorkforceCommand('ActivateMember', { memberId, providerSubject }, createId())
      .then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function terminateMemberAction(formData: FormData): Promise<CommandActionResult> {
  const memberId = String(formData.get('memberId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim();
  const confirmed = formData.get('confirmTerminate') === 'true';
  if (!confirmed) {
    return { ok: false, error: 'Confirme que desea finalizar la relación laboral.' };
  }
  if (!memberId) return { ok: false, error: 'Empleado no identificado.' };
  const payload: Record<string, unknown> = { memberId };
  if (reason) payload.reason = reason;
  const result = await runWorkforceCommand('TerminateMember', (client) =>
    client.executeWorkforceCommand('TerminateMember', payload, createId()).then((r) => r.data),
  );
  if (result.ok) revalidateMember(memberId);
  return result;
}

export async function grantDelegationAction(formData: FormData): Promise<CommandActionResult> {
  const delegateMemberId = String(formData.get('delegateMemberId') ?? '').trim();
  const scope = String(formData.get('scope') ?? '').trim();
  const expiresAt = String(formData.get('expiresAt') ?? '').trim();
  if (!delegateMemberId || !scope || !expiresAt) {
    return { ok: false, error: 'Complete delegado, alcance y fecha de vencimiento.' };
  }
  const expiresIso = new Date(expiresAt).toISOString();
  const result = await runWorkforceCommand('GrantDelegation', (client) =>
    client
      .executeWorkforceCommand(
        'GrantDelegation',
        { delegateMemberId, scopes: [scope], expiresAt: expiresIso },
        createId(),
      )
      .then((r) => r.data),
  );
  if (result.ok) revalidatePath(equipoHref());
  return result;
}

export async function revokeDelegationAction(formData: FormData): Promise<CommandActionResult> {
  const delegationId = String(formData.get('delegationId') ?? '').trim();
  if (!delegationId) {
    return { ok: false, error: 'Ingrese el identificador de la delegación.' };
  }
  const result = await runWorkforceCommand('RevokeDelegation', (client) =>
    client.executeWorkforceCommand('RevokeDelegation', { delegationId }, createId()).then((r) => r.data),
  );
  if (result.ok) revalidatePath(equipoHref());
  return result;
}

export async function requestMemberEmailChangeAction(formData: FormData): Promise<CommandActionResult> {
  const newEmail = String(formData.get('newEmail') ?? '').trim();
  if (!newEmail) {
    return { ok: false, error: 'Ingrese el nuevo correo.' };
  }
  const result = await runWorkforceCommand('RequestMemberEmailChange', (client) =>
    client.executeWorkforceCommand('RequestMemberEmailChange', { newEmail }, createId()).then((r) => r.data),
  );
  const auth = await getServerOsAuthContext();
  if (result.ok && auth?.mode === 'dev') {
    revalidateMember(auth.session.memberId);
  }
  return result;
}

export async function getActorMemberId(): Promise<string | null> {
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  if (auth.mode === 'dev') return auth.session.memberId;
  return null;
}
