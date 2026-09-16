import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  CommitmentDatabaseRecord,
  IdempotencyRecord,
  MemberRecord,
  RoleAssignmentRecord,
  DelegationRecord,
} from './store-types';

/**
 * Store interface for commitment operations.
 * Implementations: PrismaOsCommitmentStore in os-database.
 */
export interface OsCommitmentStore {
  runInTransaction<T>(fn: (store: OsCommitmentStore) => Promise<T>): Promise<T>;

  // Member lookups for authorization
  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]>;

  // Party lookups for validation
  partyExistsInOrg(organizationId: string, partyId: string): Promise<boolean>;

  // Commitment CRUD
  insertCommitment(record: CommitmentDatabaseRecord): Promise<void>;
  getCommitmentInOrg(organizationId: string, commitmentId: string): Promise<CommitmentDatabaseRecord | null>;
  updateCommitment(
    commitmentId: string,
    patch: Partial<
      Pick<
        CommitmentDatabaseRecord,
        'ownerMemberId' | 'lifecycle' | 'fulfilledAt' | 'fulfilledByMemberId' | 'cancelledAt'
      >
    >,
  ): Promise<void>;
  listCommitmentsForParty(
    organizationId: string,
    partyId: string,
  ): Promise<CommitmentDatabaseRecord[]>;
  listCommitmentsForOwner(
    organizationId: string,
    ownerMemberId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]>;
  listCommitmentsInOrg(
    organizationId: string,
    lifecycle?: 'open' | 'fulfilled' | 'cancelled',
  ): Promise<CommitmentDatabaseRecord[]>;

  // Event infrastructure
  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
}
