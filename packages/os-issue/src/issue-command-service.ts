import type {
  IssueCommandName,
  RequestContext,
  IssueReference,
  IssueStatus,
} from '@isalwa/os-contracts';
import {
  COMMAND_REQUIRED_SCOPES,
  ISSUE_MANAGE_SCOPE,
  canTransitionIssue,
} from '@isalwa/os-contracts';
import {
  ReportIssuePayloadSchema,
  TriageIssuePayloadSchema,
  AssignIssueOwnerPayloadSchema,
  StartIssueProgressPayloadSchema,
  AddIssueJournalEntryPayloadSchema,
  ConfirmIssueCausePayloadSchema,
  LinkIssueWorkPayloadSchema,
  ResolveIssuePayloadSchema,
  RecordIssueOutcomePayloadSchema,
  CloseIssuePayloadSchema,
  ReopenIssuePayloadSchema,
  RelateIssuesPayloadSchema,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasGrantedScope,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  buildAuditEntry,
  buildBusinessEvent,
  buildOutboxForEvent,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import type { OsIssueStore } from './os-issue-store';
import type { IssueRecord } from './store-types';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class IssueCommandService {
  private activeIdempotencyKey?: string;

  constructor(private readonly store: OsIssueStore) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.store.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    command: IssueCommandName,
    targetOrgId: string,
  ): Promise<MemberAccessSnapshot> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    const required = COMMAND_REQUIRED_SCOPES[command];
    if (required && required !== 'member_active' && !memberHasGrantedScope(snap, required)) {
      throw new Error('PERMISSION_DENIED');
    }
    return snap;
  }

  private hasIssueManageScope(snap: MemberAccessSnapshot): boolean {
    return memberHasGrantedScope(snap, ISSUE_MANAGE_SCOPE);
  }

  async execute(
    command: IssueCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    const actor = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor || actor.organizationId !== ctx.organizationId) {
      throw new Error('TENANT_FORBIDDEN');
    }

    if (idempotencyKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) {
        return existing.resultJson as unknown as CommandResult;
      }
    }

    return this.store.runInTransaction(async (store) => {
      this.activeIdempotencyKey = idempotencyKey;
      let result: CommandResult;
      switch (command) {
        case 'ReportIssue':
          result = await this.reportIssue(ctx, payload, store);
          break;
        case 'TriageIssue':
          result = await this.triageIssue(ctx, payload, store);
          break;
        case 'AssignIssueOwner':
          result = await this.assignIssueOwner(ctx, payload, store);
          break;
        case 'StartIssueProgress':
          result = await this.startIssueProgress(ctx, payload, store);
          break;
        case 'AddIssueJournalEntry':
          result = await this.addJournalEntry(ctx, payload, store);
          break;
        case 'ConfirmIssueCause':
          result = await this.confirmIssueCause(ctx, payload, store);
          break;
        case 'LinkIssueWork':
          result = await this.linkIssueWork(ctx, payload, store);
          break;
        case 'ResolveIssue':
          result = await this.resolveIssue(ctx, payload, store);
          break;
        case 'RecordIssueOutcome':
          result = await this.recordIssueOutcome(ctx, payload, store);
          break;
        case 'CloseIssue':
          result = await this.closeIssue(ctx, payload, store);
          break;
        case 'ReopenIssue':
          result = await this.reopenIssue(ctx, payload, store);
          break;
        case 'RelateIssues':
          result = await this.relateIssues(ctx, payload, store);
          break;
        default:
          throw new Error('VALIDATION_FAILED');
      }

      if (idempotencyKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: idempotencyKey,
          commandName: command,
          resultJson: result as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    });
  }

  private async emit(
    ctx: RequestContext,
    store: OsIssueStore,
    eventType: string,
    primaryType: string,
    primaryId: string,
    payload?: Record<string, unknown>,
    auditAction?: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): Promise<CommandResult> {
    const event = buildBusinessEvent({
      organizationId: ctx.organizationId,
      eventType,
      occurredAt: ctx.effectiveAt,
      actorMemberId: ctx.actorMemberId,
      authorizationContext: { memberId: ctx.actorMemberId },
      primaryEntityType: primaryType,
      primaryEntityId: primaryId,
      payload,
      correlationId: ctx.correlationId,
      idempotencyKey: this.activeIdempotencyKey,
      capabilityKey: 'issue',
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      ctx.organizationId,
      ctx.actorMemberId,
      auditAction ?? eventType,
      primaryType,
      primaryId,
      ctx.correlationId,
      before,
      after,
    );
    await store.appendEventAndAudit(event, outbox, audit);
    return {
      commandId: event.id,
      correlationId: ctx.correlationId,
      data: { eventId: event.id, ...(payload ?? {}) },
    };
  }

  private async requireIssue(
    store: OsIssueStore,
    orgId: string,
    issueId: string,
  ): Promise<IssueRecord> {
    const issue = await store.getIssueInOrg(orgId, issueId);
    if (!issue) throw new Error('NOT_FOUND');
    return issue;
  }

  private assertVersion(expected: number, actual: number): void {
    if (expected !== actual) throw new Error('CONFLICT');
  }

  private assertTransition(from: IssueStatus, to: IssueStatus): void {
    if (!canTransitionIssue(from, to)) {
      throw new Error('VALIDATION_FAILED');
    }
  }

  private async reportIssue(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ReportIssue', ctx.organizationId);
    const parsed = ReportIssuePayloadSchema.parse(payload);

    const issueId = createId();
    const issue: IssueRecord = {
      id: issueId,
      organizationId: ctx.organizationId,
      title: parsed.title ?? null,
      description: parsed.description,
      status: 'reported',
      reportedByMemberId: ctx.actorMemberId,
      ownerMemberId: null,
      confirmedCause: null,
      resolution: null,
      outcome: null,
      reportedAt: ctx.effectiveAt,
      triagedAt: null,
      progressStartedAt: null,
      resolvedAt: null,
      closedAt: null,
      reopenedAt: null,
      version: 0,
    };
    await store.insertIssue(issue);

    // Insert references if provided
    if (parsed.references) {
      for (const ref of parsed.references) {
        await store.insertIssueReference({
          id: createId(),
          organizationId: ctx.organizationId,
          issueId,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          createdAt: ctx.effectiveAt,
        });
      }
    }

    return this.emit(ctx, store, 'issue.reported', 'issue', issueId, {
      issueId,
      title: issue.title,
      description: issue.description,
      references: parsed.references ?? [],
    });
  }

  private async triageIssue(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'TriageIssue', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = TriageIssuePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);
    this.assertTransition(issue.status, 'triaged');

    const before = { status: issue.status };
    await store.updateIssue(
      parsed.issueId,
      { status: 'triaged', triagedAt: ctx.effectiveAt, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.triaged',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId },
      'issue.triaged',
      before,
      { status: 'triaged' },
    );
  }

  private async assignIssueOwner(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'AssignIssueOwner', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = AssignIssueOwnerPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    const newOwner = await store.getMemberInOrg(ctx.organizationId, parsed.ownerMemberId);
    if (!newOwner || newOwner.accessStatus !== 'active') {
      throw new Error('VALIDATION_FAILED');
    }

    const before = { ownerMemberId: issue.ownerMemberId };
    await store.updateIssue(
      parsed.issueId,
      { ownerMemberId: parsed.ownerMemberId, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.owner_changed',
      'issue',
      parsed.issueId,
      {
        issueId: parsed.issueId,
        previousOwnerMemberId: issue.ownerMemberId,
        newOwnerMemberId: parsed.ownerMemberId,
      },
      'issue.owner_changed',
      before,
      { ownerMemberId: parsed.ownerMemberId },
    );
  }

  private async startIssueProgress(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'StartIssueProgress', ctx.organizationId);

    const parsed = StartIssueProgressPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    // Owner or issue.manage can start progress
    const isOwner = issue.ownerMemberId === ctx.actorMemberId;
    if (!isOwner && !this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    // Can start from triaged or reopened
    if (issue.status !== 'triaged' && issue.status !== 'reopened') {
      throw new Error('VALIDATION_FAILED');
    }
    this.assertTransition(issue.status, 'in_progress');

    const before = { status: issue.status };
    await store.updateIssue(
      parsed.issueId,
      { status: 'in_progress', progressStartedAt: ctx.effectiveAt, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.progress_started',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId },
      'issue.progress_started',
      before,
      { status: 'in_progress' },
    );
  }

  private async addJournalEntry(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'AddIssueJournalEntry', ctx.organizationId);

    const parsed = AddIssueJournalEntryPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    const entryId = createId();
    await store.insertJournalEntry({
      id: entryId,
      organizationId: ctx.organizationId,
      issueId: parsed.issueId,
      entryType: parsed.entryType,
      content: parsed.content,
      createdByMemberId: ctx.actorMemberId,
      createdAt: ctx.effectiveAt,
    });

    // Bump version for concurrency
    await store.updateIssue(parsed.issueId, { version: issue.version + 1 }, issue.version);

    return this.emit(ctx, store, 'issue.journal_added', 'issue', parsed.issueId, {
      issueId: parsed.issueId,
      entryId,
      entryType: parsed.entryType,
    });
  }

  private async confirmIssueCause(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'ConfirmIssueCause', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = ConfirmIssueCausePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    const before = { confirmedCause: issue.confirmedCause };
    await store.updateIssue(
      parsed.issueId,
      { confirmedCause: parsed.confirmedCause, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.cause_confirmed',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId, confirmedCause: parsed.confirmedCause },
      'issue.cause_confirmed',
      before,
      { confirmedCause: parsed.confirmedCause },
    );
  }

  private async linkIssueWork(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'LinkIssueWork', ctx.organizationId);

    const parsed = LinkIssueWorkPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    // Verify work item exists
    const workExists = await store.workItemExistsInOrg(ctx.organizationId, parsed.workItemId);
    if (!workExists) {
      throw new Error('NOT_FOUND');
    }

    const linkId = createId();
    await store.insertWorkLink({
      id: linkId,
      organizationId: ctx.organizationId,
      issueId: parsed.issueId,
      workItemId: parsed.workItemId,
      linkedByMemberId: ctx.actorMemberId,
      linkedAt: ctx.effectiveAt,
    });

    // Bump version for concurrency
    await store.updateIssue(parsed.issueId, { version: issue.version + 1 }, issue.version);

    return this.emit(ctx, store, 'issue.work_linked', 'issue', parsed.issueId, {
      issueId: parsed.issueId,
      workItemId: parsed.workItemId,
      linkId,
    });
  }

  private async resolveIssue(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'ResolveIssue', ctx.organizationId);

    const parsed = ResolveIssuePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    // Owner or issue.manage can resolve
    const isOwner = issue.ownerMemberId === ctx.actorMemberId;
    if (!isOwner && !this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    // V1 one-shot resolve: any non-terminal status may go directly to resolved.
    if (issue.status === 'resolved' || issue.status === 'closed') {
      throw new Error('VALIDATION_FAILED');
    }

    const before = { status: issue.status, resolution: issue.resolution };
    await store.updateIssue(
      parsed.issueId,
      {
        status: 'resolved',
        resolution: parsed.resolution,
        resolvedAt: ctx.effectiveAt,
        version: issue.version + 1,
      },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.resolved',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId, resolution: parsed.resolution },
      'issue.resolved',
      before,
      { status: 'resolved', resolution: parsed.resolution },
    );
  }

  private async recordIssueOutcome(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RecordIssueOutcome', ctx.organizationId);

    const parsed = RecordIssueOutcomePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    const before = { outcome: issue.outcome };
    await store.updateIssue(
      parsed.issueId,
      { outcome: parsed.outcome, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.outcome_recorded',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId, outcome: parsed.outcome },
      'issue.outcome_recorded',
      before,
      { outcome: parsed.outcome },
    );
  }

  private async closeIssue(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CloseIssue', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = CloseIssuePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);
    this.assertTransition(issue.status, 'closed');

    const before = { status: issue.status };
    await store.updateIssue(
      parsed.issueId,
      { status: 'closed', closedAt: ctx.effectiveAt, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.closed',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId },
      'issue.closed',
      before,
      { status: 'closed' },
    );
  }

  private async reopenIssue(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'ReopenIssue', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = ReopenIssuePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);
    this.assertTransition(issue.status, 'reopened');

    const before = { status: issue.status };
    await store.updateIssue(
      parsed.issueId,
      { status: 'reopened', reopenedAt: ctx.effectiveAt, version: issue.version + 1 },
      issue.version,
    );

    return this.emit(
      ctx,
      store,
      'issue.reopened',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId },
      'issue.reopened',
      before,
      { status: 'reopened' },
    );
  }

  private async relateIssues(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'RelateIssues', ctx.organizationId);
    if (!this.hasIssueManageScope(snap)) {
      throw new Error('PERMISSION_DENIED');
    }

    const parsed = RelateIssuesPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    this.assertVersion(parsed.expectedVersion, issue.version);

    // Verify related issue exists
    const relatedIssue = await store.getIssueInOrg(ctx.organizationId, parsed.relatedIssueId);
    if (!relatedIssue) {
      throw new Error('NOT_FOUND');
    }

    const relationId = createId();
    await store.insertIssueRelation({
      id: relationId,
      organizationId: ctx.organizationId,
      issueId: parsed.issueId,
      relatedIssueId: parsed.relatedIssueId,
      relationType: parsed.relationType,
      createdByMemberId: ctx.actorMemberId,
      createdAt: ctx.effectiveAt,
    });

    // Bump version for concurrency
    await store.updateIssue(parsed.issueId, { version: issue.version + 1 }, issue.version);

    return this.emit(ctx, store, 'issue.related', 'issue', parsed.issueId, {
      issueId: parsed.issueId,
      relatedIssueId: parsed.relatedIssueId,
      relationType: parsed.relationType,
      relationId,
    });
  }
}
