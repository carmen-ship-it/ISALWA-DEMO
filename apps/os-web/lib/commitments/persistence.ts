import type { CommitmentRecord, CommitmentState } from '@isalwa/os-contracts';

export type CommitmentPersistenceError =
  | 'schema_not_available'
  | 'api_error'
  | 'network_error';

export type CommitmentSaveResult =
  | { ok: true; persisted: true; commitment: CommitmentRecord }
  | { ok: false; persisted: false; reason: CommitmentPersistenceError };

export type CommitmentListResult =
  | { ok: true; persisted: true; items: CommitmentApiItem[] }
  | { ok: false; persisted: false; reason: CommitmentPersistenceError };

export type CommitmentApiItem = {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: string | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  state: CommitmentState;
  createdByMemberId: string;
  createdAt: string;
  fulfilledAt: string | null;
  cancelledAt: string | null;
};

/**
 * Commitment persistence via OS API.
 * If OS_API_URL is not configured, returns honest errors.
 */
export function commitmentPersistence(): {
  persistence: 'api' | 'not_configured';
  save(record: CommitmentRecord): Promise<CommitmentSaveResult>;
  list(query: { organizationId: string; partyId?: string }): Promise<CommitmentListResult>;
} {
  const apiUrl = typeof process !== 'undefined'
    ? process.env.OS_API_URL ?? process.env.NEXT_PUBLIC_OS_API_URL
    : null;

  if (!apiUrl) {
    return {
      persistence: 'not_configured',
      async save(_record) {
        return { ok: false, persisted: false, reason: 'schema_not_available' };
      },
      async list(_query) {
        return { ok: false, persisted: false, reason: 'schema_not_available' };
      },
    };
  }

  return {
    persistence: 'api',
    async save(record) {
      try {
        const response = await fetch(`${apiUrl}/commands/CreateEmployeeCommitment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            text: record.text,
            ownerMemberId: record.ownerMemberId,
            partyId: record.partyId,
            dueAt: record.dueAt,
            relatedSubjectType: record.relatedSubjectType,
            relatedSubjectId: record.relatedSubjectId,
          }),
        });
        if (!response.ok) {
          return { ok: false, persisted: false, reason: 'api_error' };
        }
        return { ok: true, persisted: true, commitment: record };
      } catch {
        return { ok: false, persisted: false, reason: 'network_error' };
      }
    },
    async list(query) {
      try {
        const params = new URLSearchParams();
        if (query.partyId) {
          params.set('partyId', query.partyId);
        }
        const url = `${apiUrl}/v1/commitments${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        if (!response.ok) {
          return { ok: false, persisted: false, reason: 'api_error' };
        }
        const data = await response.json() as { items: CommitmentApiItem[] };
        return { ok: true, persisted: true, items: data.items };
      } catch {
        return { ok: false, persisted: false, reason: 'network_error' };
      }
    },
  };
}
