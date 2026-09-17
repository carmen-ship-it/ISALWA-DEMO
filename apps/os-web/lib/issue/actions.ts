'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { ISSUE_MANAGE_SCOPE, hasAssignedOperationsScope } from '@isalwa/os-contracts';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadMemberCapabilities } from '@/lib/auth/member-capabilities';
import { loadActorRoleKeys } from '@/lib/party/master-data-access';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { ISSUE_COPY } from './labels';
import { issueHref, issueListHref } from './navigation';
import type { IssueReferenceType } from './types';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type ReportIssueActionResult =
  | { ok: true; issueId: string }
  | { ok: false; error: string };

export type AssignIssueOwnerActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type ResolveIssueActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function reportIssueAction(formData: FormData): Promise<ReportIssueActionResult> {
  const description = String(formData.get('description') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim() || undefined;
  const referenceType = String(formData.get('referenceType') ?? '').trim() || undefined;
  const referenceId = String(formData.get('referenceId') ?? '').trim() || undefined;
  const partyId = String(formData.get('partyId') ?? '').trim() || undefined;

  if (!description) {
    return { ok: false, error: ISSUE_COPY.descriptionRequired };
  }

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: ISSUE_COPY.sessionExpired };
  }

  const client = createOsApiClient(auth);

  const references =
    referenceType && referenceId
      ? [{ referenceType: referenceType as IssueReferenceType, referenceId }]
      : undefined;

  try {
    const result = await client.executeIssueCommand(
      'ReportIssue',
      { description, title, references },
      createId(),
    );

    const issueId = String(result.data.issueId ?? '');

    revalidatePath(issueListHref());
    revalidatePath(issueListHref('open'));
    revalidatePath(issueListHref('reported'));
    if (issueId) {
      revalidatePath(issueHref(issueId));
    }

    if (referenceType === 'party' && referenceId) {
      revalidatePath(`/clientes/${referenceId}`);
    }
    if (referenceType === 'order' && referenceId) {
      revalidatePath(`/inicio`);
      revalidatePath(`/incidencias`);
      if (partyId) {
        revalidatePath(`/clientes/${partyId}`);
        revalidatePath(`/clientes/${partyId}/pedidos/${referenceId}`);
      }
    }

    return { ok: true, issueId };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

export async function assignIssueOwnerAction(
  formData: FormData,
): Promise<AssignIssueOwnerActionResult> {
  const issueId = String(formData.get('issueId') ?? '').trim();
  const ownerMemberId = String(formData.get('ownerMemberId') ?? '').trim();
  const expectedVersionRaw = String(formData.get('expectedVersion') ?? '').trim();
  const expectedVersion = Number.parseInt(expectedVersionRaw, 10);

  if (!issueId) {
    return { ok: false, error: ISSUE_COPY.assignFailed };
  }
  if (!ownerMemberId) {
    return { ok: false, error: ISSUE_COPY.ownerRequired };
  }
  if (!Number.isFinite(expectedVersion) || expectedVersion < 0) {
    return { ok: false, error: ISSUE_COPY.assignFailed };
  }

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: ISSUE_COPY.sessionExpired };
  }

  const capabilities = await loadMemberCapabilities();
  const scopes = capabilities?.grantedScopes ?? [];
  if (!hasAssignedOperationsScope(scopes, ISSUE_MANAGE_SCOPE)) {
    return { ok: false, error: ISSUE_COPY.unauthorizedAssign };
  }

  const client = createOsApiClient(auth);

  try {
    await client.executeIssueCommand(
      'AssignIssueOwner',
      { issueId, ownerMemberId, expectedVersion },
      createId(),
    );
    revalidatePath(issueHref(issueId));
    revalidatePath(issueListHref());
    revalidatePath(issueListHref('assigned'));
    revalidatePath('/inicio');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}

function revalidateIssueReferencePaths(
  references: Array<{ referenceType: string; referenceId: string }>,
): void {
  for (const ref of references) {
    if (ref.referenceType === 'party' && ref.referenceId) {
      revalidatePath(`/clientes/${ref.referenceId}`);
    }
    if (ref.referenceType === 'order' && ref.referenceId) {
      revalidatePath('/inicio');
      revalidatePath('/incidencias');
      const partyRef = references.find((r) => r.referenceType === 'party');
      if (partyRef?.referenceId) {
        revalidatePath(`/clientes/${partyRef.referenceId}`);
        revalidatePath(`/clientes/${partyRef.referenceId}/pedidos/${ref.referenceId}`);
      }
    }
  }
}

export async function resolveIssueAction(formData: FormData): Promise<ResolveIssueActionResult> {
  const issueId = String(formData.get('issueId') ?? '').trim();
  const resolution = String(formData.get('resolution') ?? '').trim();
  const expectedVersionRaw = String(formData.get('expectedVersion') ?? '').trim();
  const expectedVersion = Number.parseInt(expectedVersionRaw, 10);

  if (!issueId) {
    return { ok: false, error: ISSUE_COPY.resolveFailed };
  }
  if (!resolution) {
    return { ok: false, error: ISSUE_COPY.resolutionRequired };
  }
  if (!Number.isFinite(expectedVersion) || expectedVersion < 0) {
    return { ok: false, error: ISSUE_COPY.resolveFailed };
  }

  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) return previewGate;

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, error: ISSUE_COPY.sessionExpired };
  }

  const client = createOsApiClient(auth);
  const capabilities = await loadMemberCapabilities();
  let scopes = capabilities?.grantedScopes ?? [];
  if (scopes.length === 0) {
    scopes = await loadActorRoleKeys(client);
  }
  const canManage = hasAssignedOperationsScope(scopes, ISSUE_MANAGE_SCOPE);

  let references: Array<{ referenceType: string; referenceId: string }> = [];
  try {
    const { issue } = await client.getIssue(issueId);
    references = issue.references.map((ref) => ({
      referenceType: ref.referenceType,
      referenceId: ref.referenceId,
    }));
    const memberId = capabilities?.memberId ?? null;
    const isOwner = Boolean(issue.ownerMemberId && memberId && issue.ownerMemberId === memberId);
    if (!canManage && !isOwner) {
      return { ok: false, error: ISSUE_COPY.unauthorizedResolve };
    }
  } catch {
    if (!canManage) {
      return { ok: false, error: ISSUE_COPY.unauthorizedResolve };
    }
  }

  try {
    await client.executeIssueCommand(
      'ResolveIssue',
      { issueId, resolution, expectedVersion },
      createId(),
    );
    revalidatePath(issueHref(issueId));
    revalidatePath(issueListHref());
    revalidatePath(issueListHref('resolved'));
    revalidatePath('/inicio');
    revalidatePath('/incidencias');
    revalidateIssueReferencePaths(references);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapCommandError(err) };
  }
}
