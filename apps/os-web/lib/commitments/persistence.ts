import { COMMITMENT_PERSISTENCE_BLOCKER, type CommitmentRecord } from '@isalwa/os-contracts';

export type CommitmentNotPersisted = {
  ok: false;
  persisted: false;
  reason: typeof COMMITMENT_PERSISTENCE_BLOCKER;
};

/**
 * Honest port. There is no table, so this does not write and does not return an empty company list.
 */
export function commitmentPersistence(): {
  persistence: 'not_persisted';
  save(record: CommitmentRecord): Promise<CommitmentNotPersisted>;
  list(query: { organizationId: string }): Promise<CommitmentNotPersisted>;
} {
  return {
    persistence: 'not_persisted',
    async save(_record) {
      return { ok: false, persisted: false, reason: COMMITMENT_PERSISTENCE_BLOCKER };
    },
    async list(_query) {
      return { ok: false, persisted: false, reason: COMMITMENT_PERSISTENCE_BLOCKER };
    },
  };
}
