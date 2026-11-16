'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient, type CommitmentSummary } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';
import { assertRolePreviewAllowsMutation } from '@/lib/role-preview/mutation-gate';

export type CommitmentPersistenceError =
  | 'session_expired'
  | 'api_error'
  | 'network_error'
  | 'view_as_blocked';

export type CommitmentSaveResult =
  | { ok: true; persisted: true; commitmentId: string }
  | { ok: false; persisted: false; reason: CommitmentPersistenceError; message?: string };

export type CommitmentListResult =
  | { ok: true; persisted: true; items: CommitmentSummary[] }
  | { ok: false; persisted: false; reason: CommitmentPersistenceError; message?: string };

export type CommitmentFulfillResult =
  | { ok: true }
  | { ok: false; reason: CommitmentPersistenceError; message?: string };

/**
 * Save a commitment via the OS API.
 * Supports CreateEmployeeCommitment and CreateCustomerReportedCommitment.
 */
export async function saveCommitmentAction(input: {
  text: string;
  ownerMemberId?: string;
  partyId?: string | null;
  dueAt?: string | null;
  relatedSubjectType?: string | null;
  relatedSubjectId?: string | null;
  origin: 'employee_entered' | 'customer_reported';
}): Promise<CommitmentSaveResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) {
    return { ok: false, persisted: false, reason: 'view_as_blocked', message: previewGate.error };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, persisted: false, reason: 'session_expired' };
  }

  const client = createOsApiClient(auth);
  const commandName = input.origin === 'customer_reported'
    ? 'CreateCustomerReportedCommitment'
    : 'CreateEmployeeCommitment';

  try {
    const result = await client.executeCommitmentCommand(
      commandName,
      {
        text: input.text,
        ownerMemberId: input.ownerMemberId,
        partyId: input.partyId,
        dueAt: input.dueAt,
        relatedSubjectType: input.relatedSubjectType,
        relatedSubjectId: input.relatedSubjectId,
      },
      createId(),
    );

    const commitmentId = result.data.commitmentId ?? '';

    // Revalidate relevant paths
    if (input.partyId) {
      revalidatePath(`/clientes/${input.partyId}`);
    }
    revalidatePath('/compromisos');

    return { ok: true, persisted: true, commitmentId };
  } catch (err) {
    return { ok: false, persisted: false, reason: 'api_error', message: mapCommandError(err) };
  }
}

/**
 * List commitments via the OS API.
 * Can filter by partyId or ownerMemberId or lifecycle.
 */
export async function listCommitmentsAction(query?: {
  partyId?: string;
  ownerMemberId?: string;
  lifecycle?: 'open' | 'fulfilled' | 'cancelled';
}): Promise<CommitmentListResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, persisted: false, reason: 'session_expired' };
  }

  const client = createOsApiClient(auth);

  try {
    const params: Record<string, string> = {};
    if (query?.partyId) params.partyId = query.partyId;
    if (query?.ownerMemberId) params.ownerMemberId = query.ownerMemberId;
    if (query?.lifecycle) params.lifecycle = query.lifecycle;
    const result = await client.listCommitments(params);

    return { ok: true, persisted: true, items: result.items };
  } catch (err) {
    return { ok: false, persisted: false, reason: 'api_error', message: mapCommandError(err) };
  }
}

type CommitmentChangeInput =
  | { command: 'FulfillCommitment'; commitmentId: string; note?: string }
  | { command: 'RescheduleCommitment'; commitmentId: string; dueAt: string; reason: string }
  | { command: 'ReassignCommitmentOwner'; commitmentId: string; newOwnerMemberId: string; reason: string }
  | { command: 'CancelCommitment'; commitmentId: string; reason: string };

/** One owned entry point for every change to an existing commitment; the server enforces who may. */
async function changeCommitment(input: CommitmentChangeInput): Promise<CommitmentFulfillResult> {
  const previewGate = await assertRolePreviewAllowsMutation();
  if (!previewGate.ok) {
    return { ok: false, reason: 'view_as_blocked', message: previewGate.error };
  }

  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, reason: 'session_expired' };
  }

  const client = createOsApiClient(auth);
  const { command, ...payload } = input;

  try {
    await client.executeCommitmentCommand(command, payload, createId());
    revalidatePath('/compromisos');
    revalidatePath(`/compromisos/${input.commitmentId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'api_error', message: mapCommandError(err) };
  }
}

/** Mark a commitment as done. The note is optional. */
export async function fulfillCommitmentAction(commitmentId: string, note?: string): Promise<CommitmentFulfillResult> {
  const trimmed = note?.trim();
  return changeCommitment({ command: 'FulfillCommitment', commitmentId, ...(trimmed ? { note: trimmed } : {}) });
}

/** Move the promised date. The previous date stays in the commitment's history. */
export async function rescheduleCommitmentAction(input: {
  commitmentId: string;
  dueAt: string;
  reason: string;
}): Promise<CommitmentFulfillResult> {
  return changeCommitment({ command: 'RescheduleCommitment', ...input, reason: input.reason.trim() });
}

/** Give the commitment to another active member. */
export async function reassignCommitmentAction(input: {
  commitmentId: string;
  newOwnerMemberId: string;
  reason: string;
}): Promise<CommitmentFulfillResult> {
  return changeCommitment({ command: 'ReassignCommitmentOwner', ...input, reason: input.reason.trim() });
}

/** Drop the commitment. The reason is kept. */
export async function cancelCommitmentAction(input: {
  commitmentId: string;
  reason: string;
}): Promise<CommitmentFulfillResult> {
  return changeCommitment({ command: 'CancelCommitment', ...input, reason: input.reason.trim() });
}
