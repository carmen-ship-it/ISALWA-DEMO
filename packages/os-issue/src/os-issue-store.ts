import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type {
  IssueRecord,
  IssueReferenceRecord,
  IssueJournalEntryRecord,
  IssueWorkLinkRecord,
  IssueRelationRecord,
  MemberRecord,
  RoleAssignmentRecord,
  DelegationRecord,
  IdempotencyRecord,
} from './store-types';

export interface OsIssueStore {
  runInTransaction<T>(fn: (store: OsIssueStore) => Promise<T>): Promise<T>;

  // Member/auth lookups
  getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null>;
  listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]>;
  listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]>;

  // Issue CRUD
  insertIssue(issue: IssueRecord): Promise<void>;
  getIssueInOrg(organizationId: string, issueId: string): Promise<IssueRecord | null>;
  updateIssue(
    issueId: string,
    patch: Partial<
      Pick<
        IssueRecord,
        | 'status'
        | 'ownerMemberId'
        | 'confirmedCause'
        | 'resolution'
        | 'outcome'
        | 'triagedAt'
        | 'progressStartedAt'
        | 'resolvedAt'
        | 'closedAt'
        | 'reopenedAt'
        | 'version'
      >
    >,
    expectedVersion: number,
  ): Promise<void>;
  listIssuesForOwner(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]>;
  listOpenIssuesInOrg(organizationId: string): Promise<IssueRecord[]>;

  // References
  insertIssueReference(ref: IssueReferenceRecord): Promise<void>;
  listIssueReferences(organizationId: string, issueId: string): Promise<IssueReferenceRecord[]>;

  // Journal entries
  insertJournalEntry(entry: IssueJournalEntryRecord): Promise<void>;
  listJournalEntries(organizationId: string, issueId: string): Promise<IssueJournalEntryRecord[]>;

  // Work links
  insertWorkLink(link: IssueWorkLinkRecord): Promise<void>;
  listWorkLinks(organizationId: string, issueId: string): Promise<IssueWorkLinkRecord[]>;
  workItemExistsInOrg(organizationId: string, workItemId: string): Promise<boolean>;

  // Relations
  insertIssueRelation(relation: IssueRelationRecord): Promise<void>;
  listIssueRelations(organizationId: string, issueId: string): Promise<IssueRelationRecord[]>;

  // Events/audit
  appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void>;
  findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null>;
  saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void>;
}
