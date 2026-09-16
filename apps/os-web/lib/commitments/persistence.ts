'use server';

import { createId } from '@isalwa/ts-utils';
import { revalidatePath } from 'next/cache';
import { createOsApiClient, type CommitmentSummary } from '@/lib/api/os-api-client';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { mapCommandError } from '@/lib/commercial/command-errors';

export type CommitmentPersistenceError =
  | 'session_expired'
  | 'api_error'
  | 'network_error';

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
    const result = await client.listCommitments({
      partyId: query?.partyId,
      ownerMemberId: query?.ownerMemberId,
      lifecycle: query?.lifecycle,
    });

    return { ok: true, persisted: true, items: result.items };
  } catch (err) {
    return { ok: false, persisted: false, reason: 'api_error', message: mapCommandError(err) };
  }
}

/**
 * Fulfill a commitment via the OS API.
 */
export async function fulfillCommitmentAction(commitmentId: string): Promise<CommitmentFulfillResult> {
  const auth = await getServerOsAuthContext();
  if (!auth) {
    return { ok: false, reason: 'session_expired' };
  }

  const client = createOsApiClient(auth);

  try {
    await client.executeCommitmentCommand(
      'FulfillCommitment',
      { commitmentId },
      createId(),
    );

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'api_error', message: mapCommandError(err) };
  }
}
