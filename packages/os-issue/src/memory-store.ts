/**
 * In-memory store for testing IssueCommandService.
 */

import type { StoredAuditLog, StoredBusinessEvent, StoredOutboxMessage } from '@isalwa/os-events';
import type { OsIssueStore } from './os-issue-store';
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

export class MemoryIssueStore implements OsIssueStore {
  readonly issues = new Map<string, IssueRecord>();
  readonly references = new Map<string, IssueReferenceRecord>();
  readonly journalEntries = new Map<string, IssueJournalEntryRecord>();
  readonly workLinks = new Map<string, IssueWorkLinkRecord>();
  readonly relations = new Map<string, IssueRelationRecord>();
  readonly members = new Map<string, MemberRecord>();
  readonly roleAssignments = new Map<string, RoleAssignmentRecord[]>();
  readonly delegations = new Map<string, DelegationRecord[]>();
  readonly idempotency = new Map<string, IdempotencyRecord>();
  readonly events: StoredBusinessEvent[] = [];
  readonly outbox: StoredOutboxMessage[] = [];
  readonly audits: StoredAuditLog[] = [];
  readonly workItems = new Set<string>();

  async runInTransaction<T>(fn: (store: OsIssueStore) => Promise<T>): Promise<T> {
    return fn(this);
  }

  async getMemberInOrg(organizationId: string, memberId: string): Promise<MemberRecord | null> {
    const member = this.members.get(memberId);
    if (!member || member.organizationId !== organizationId) return null;
    return member;
  }

  async listRoleAssignmentsForMember(
    memberId: string,
    organizationId?: string,
  ): Promise<RoleAssignmentRecord[]> {
    const key = organizationId ? `${organizationId}:${memberId}` : memberId;
    return this.roleAssignments.get(key) ?? [];
  }

  async listDelegationsForDelegate(
    memberId: string,
    organizationId?: string,
  ): Promise<DelegationRecord[]> {
    const key = organizationId ? `${organizationId}:${memberId}` : memberId;
    return this.delegations.get(key) ?? [];
  }

  async insertIssue(issue: IssueRecord): Promise<void> {
    this.issues.set(issue.id, issue);
  }

  async getIssueInOrg(organizationId: string, issueId: string): Promise<IssueRecord | null> {
    const issue = this.issues.get(issueId);
    if (!issue || issue.organizationId !== organizationId) return null;
    return issue;
  }

  async updateIssue(
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
  ): Promise<void> {
    const issue = this.issues.get(issueId);
    if (!issue) throw new Error('NOT_FOUND');
    if (issue.version !== expectedVersion) throw new Error('CONFLICT');
    this.issues.set(issueId, { ...issue, ...patch });
  }

  async listIssuesForOwner(organizationId: string, ownerMemberId: string): Promise<IssueRecord[]> {
    return Array.from(this.issues.values()).filter(
      (i) => i.organizationId === organizationId && i.ownerMemberId === ownerMemberId,
    );
  }

  async listOpenIssuesInOrg(organizationId: string): Promise<IssueRecord[]> {
    return Array.from(this.issues.values()).filter(
      (i) =>
        i.organizationId === organizationId &&
        i.status !== 'closed' &&
        i.status !== 'resolved',
    );
  }

  async insertIssueReference(ref: IssueReferenceRecord): Promise<void> {
    this.references.set(ref.id, ref);
  }

  async listIssueReferences(
    organizationId: string,
    issueId: string,
  ): Promise<IssueReferenceRecord[]> {
    return Array.from(this.references.values()).filter(
      (r) => r.organizationId === organizationId && r.issueId === issueId,
    );
  }

  async insertJournalEntry(entry: IssueJournalEntryRecord): Promise<void> {
    this.journalEntries.set(entry.id, entry);
  }

  async listJournalEntries(
    organizationId: string,
    issueId: string,
  ): Promise<IssueJournalEntryRecord[]> {
    return Array.from(this.journalEntries.values()).filter(
      (e) => e.organizationId === organizationId && e.issueId === issueId,
    );
  }

  async insertWorkLink(link: IssueWorkLinkRecord): Promise<void> {
    this.workLinks.set(link.id, link);
  }

  async listWorkLinks(organizationId: string, issueId: string): Promise<IssueWorkLinkRecord[]> {
    return Array.from(this.workLinks.values()).filter(
      (l) => l.organizationId === organizationId && l.issueId === issueId,
    );
  }

  async workItemExistsInOrg(organizationId: string, workItemId: string): Promise<boolean> {
    return this.workItems.has(`${organizationId}:${workItemId}`);
  }

  async insertIssueRelation(relation: IssueRelationRecord): Promise<void> {
    this.relations.set(relation.id, relation);
  }

  async listIssueRelations(
    organizationId: string,
    issueId: string,
  ): Promise<IssueRelationRecord[]> {
    return Array.from(this.relations.values()).filter(
      (r) => r.organizationId === organizationId && r.issueId === issueId,
    );
  }

  async appendEventAndAudit(
    event: StoredBusinessEvent,
    outbox: StoredOutboxMessage,
    audit: StoredAuditLog,
  ): Promise<void> {
    this.events.push(event);
    this.outbox.push(outbox);
    this.audits.push(audit);
  }

  async findIdempotency(organizationId: string, key: string): Promise<IdempotencyRecord | null> {
    const record = this.idempotency.get(`${organizationId}:${key}`);
    if (!record) return null;
    if (record.expiresAt < new Date()) return null;
    return record;
  }

  async saveIdempotency(record: IdempotencyRecord & { id?: string }): Promise<void> {
    this.idempotency.set(`${record.organizationId}:${record.key}`, record);
  }

  // Test helpers
  addMember(member: MemberRecord): void {
    this.members.set(member.id, member);
  }

  addRoleAssignment(memberId: string, organizationId: string, assignment: RoleAssignmentRecord): void {
    const key = `${organizationId}:${memberId}`;
    const existing = this.roleAssignments.get(key) ?? [];
    this.roleAssignments.set(key, [...existing, assignment]);
  }

  addDelegation(memberId: string, organizationId: string, delegation: DelegationRecord): void {
    const key = `${organizationId}:${memberId}`;
    const existing = this.delegations.get(key) ?? [];
    this.delegations.set(key, [...existing, delegation]);
  }

  addWorkItem(organizationId: string, workItemId: string): void {
    this.workItems.add(`${organizationId}:${workItemId}`);
  }
}
