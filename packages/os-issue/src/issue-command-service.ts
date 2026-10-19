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
  correctionAppliedValue,
  correctionEventMatches,
  correctionEventVersion,
  correctionValueMatches,
  type CorrectionField,
  type CorrectionTarget,
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
  currentIdempotencyKey,
  isIdempotencyConflict,
  openReplay,
  replayBinding,
  sealReplay,
  withIdempotencyKey,
} from '@isalwa/os-events';
import { createId } from '@isalwa/ts-utils';
import type { OsIssueStore } from './os-issue-store';
import { canReadIssue } from './issue-read-policy';
import type { IssueCorrectionRequestRecord, IssueRecord } from './store-types';
import {
  correctionAccess,
  type CorrectionAccess,
  type CorrectionCustomerPort,
} from './correction-authority';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class IssueCommandService {
  /** Without the customer port, correction requests are refused (fail closed). */
  constructor(
    private readonly store: OsIssueStore,
    private readonly correctionCustomers?: CorrectionCustomerPort,
  ) {}

  private requireCorrectionPort(): CorrectionCustomerPort {
    if (!this.correctionCustomers) throw new Error('PERMISSION_DENIED');
    return this.correctionCustomers;
  }

  /** L4: customer knowledge and apply authority of `snap`'s member for this correction. */
  private async correctionAccessFor(
    ctx: RequestContext,
    snap: MemberAccessSnapshot,
    partyId: string,
    field: CorrectionField,
  ): Promise<CorrectionAccess> {
    const facts = await this.requireCorrectionPort().customerFacts({
      organizationId: ctx.organizationId,
      partyId,
      memberId: snap.memberId,
      asOf: ctx.effectiveAt,
    });
    return correctionAccess({
      snap,
      organizationId: ctx.organizationId,
      partyId,
      field,
      asOf: ctx.effectiveAt,
      facts,
    });
  }

  /**
   * L4: on a correction request, standing is current, not historical. issue.manage keeps process
   * management; otherwise the owner must still be able to apply the change (PERMISSION_DENIED) and
   * the reporter must still know the customer (NOT_FOUND).
   */
  private async assertCorrectionStanding(
    ctx: RequestContext,
    snap: MemberAccessSnapshot,
    store: OsIssueStore,
    issue: IssueRecord,
  ): Promise<void> {
    if (this.hasIssueManageScope(snap)) return;
    const correction = await store.getCorrectionRequest(ctx.organizationId, issue.id);
    if (!correction) return;
    const access = await this.correctionAccessFor(ctx, snap, correction.partyId, correction.field);
    if (issue.ownerMemberId === ctx.actorMemberId) {
      if (!access.canApply) throw new Error('PERMISSION_DENIED');
      return;
    }
    if (!access.known) throw new Error('NOT_FOUND');
  }

  /**
   * L4: an applied decision must cite a committed change to the requested field on the same
   * customer target, after the request and newer than the target's version at that time, made by
   * someone who could apply it then. Returns whether the value it set equals the proposal.
   */
  private async validateAppliedEvidence(
    ctx: RequestContext,
    store: OsIssueStore,
    issue: IssueRecord,
    correction: IssueCorrectionRequestRecord,
    appliedEventId: string,
  ): Promise<boolean> {
    const target: CorrectionTarget = {
      partyId: correction.partyId,
      contactId: correction.contactId,
      locationId: correction.locationId,
      field: correction.field,
      reportedAt: issue.reportedAt,
    };
    const event = await store.getBusinessEventInOrg(ctx.organizationId, appliedEventId);
    if (!event || !correctionEventMatches(target, event)) throw new Error('CORRECTION_EVIDENCE_INVALID');
    const eventVersion = correctionEventVersion(event);
    if (
      correction.targetVersionAtRequest !== null &&
      (eventVersion === null || eventVersion <= correction.targetVersionAtRequest)
    ) {
      throw new Error('CORRECTION_EVIDENCE_INVALID');
    }
    // The author's roles and delegations as of the change; the command checked membership status then.
    const authorId = event.actorMemberId;
    const authorSnap = authorId ? await this.snapshotInOrg(ctx.organizationId, authorId, event.occurredAt) : null;
    if (!authorSnap) throw new Error('CORRECTION_EVIDENCE_INVALID');
    const authorFacts = await this.requireCorrectionPort().customerFacts({
      organizationId: ctx.organizationId,
      partyId: correction.partyId,
      memberId: authorSnap.memberId,
      asOf: event.occurredAt,
    });
    const authorAccess = correctionAccess({
      snap: { ...authorSnap, accessStatus: 'active' },
      organizationId: ctx.organizationId,
      partyId: correction.partyId,
      field: correction.field,
      asOf: event.occurredAt,
      facts: authorFacts,
    });
    if (!authorAccess.canApply) throw new Error('CORRECTION_EVIDENCE_INVALID');

    let actual = correctionAppliedValue(correction.field, event);
    if (actual === undefined && correction.contactId && (correction.field === 'contact_phone' || correction.field === 'contact_whatsapp')) {
      // Endpoint events are masked: compare the current number only when this is the latest such change.
      const [latest] = await store.listCorrectionChangeEvents(ctx.organizationId, target, { cursor: null, limit: 1 });
      actual =
        latest?.id === appliedEventId
          ? await this.requireCorrectionPort().currentContactNumber({
              organizationId: ctx.organizationId,
              contactId: correction.contactId,
              channel: correction.field === 'contact_phone' ? 'phone' : 'whatsapp',
            })
          : null;
    }
    return correctionValueMatches(correction.field, correction.proposedValue, actual ?? null);
  }

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
          organizationId: d.organizationId,
          delegator: d.delegator,
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

  /**
   * Company membership alone never authorises a write on an existing issue.
   * Contributor commands (journal, outcome, work link) require the actor to be a
   * party to the issue: reporter, current owner, or holder of issue.manage. This is
   * the same rule as the read policy so a member can never write what they cannot see.
   */
  private assertIssueParticipant(
    snap: MemberAccessSnapshot,
    ctx: RequestContext,
    issue: IssueRecord,
  ): void {
    const allowed = canReadIssue(
      {
        memberId: ctx.actorMemberId,
        organizationId: ctx.organizationId,
        grantedScopes: [],
      },
      issue,
      this.hasIssueManageScope(snap),
    );
    if (!allowed) throw new Error('PERMISSION_DENIED');
  }

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run. The actor must still be a
   * participant in the issue the command acted on, as a fresh command requires.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: IssueCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, command, ctx.organizationId);
    const result = openReplay<CommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
    const issueId = [payload.issueId, result.data?.issueId].find(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
    if (!issueId) throw new Error('NOT_FOUND');
    const issue = await this.requireIssue(this.store, ctx.organizationId, issueId);
    this.assertIssueParticipant(snap, ctx, issue);
    await this.assertCorrectionStanding(ctx, snap, this.store, issue);
    return result;
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: IssueCommandName,
    payload: Record<string, unknown>,
    err: unknown,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    if (idempotencyKey && isIdempotencyConflict(err)) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) return this.acceptedReplay(ctx, command, payload, existing.resultJson);
    }
    throw err;
  }

  async execute(
    command: IssueCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
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
        return this.acceptedReplay(ctx, command, payload, existing.resultJson);
      }
    }

    return this.store.runInTransaction(async (store) => {
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
          resultJson: sealReplay(result, replayBinding(ctx.actorMemberId, command, payload)),
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    }).catch((err: unknown) => this.replayAfterConflict(ctx, command, payload, err, idempotencyKey));
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
      idempotencyKey: currentIdempotencyKey(),
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
    const snap = await this.authorize(ctx, 'ReportIssue', ctx.organizationId);
    const parsed = ReportIssuePayloadSchema.parse(payload);
    const correction = parsed.correction;
    let references = parsed.references ?? [];
    if (correction) {
      // L4: the reporter must be able to know the customer; contact/location must be its own.
      const access = await this.correctionAccessFor(ctx, snap, correction.partyId, correction.field);
      if (!access.known) throw new Error('NOT_FOUND');
      const belongs = await this.requireCorrectionPort().targetBelongsToParty({
        organizationId: ctx.organizationId,
        partyId: correction.partyId,
        contactId: correction.contactId ?? null,
        locationId: correction.locationId ?? null,
      });
      if (!belongs) throw new Error('NOT_FOUND');
      if (!references.some((r) => r.referenceType === 'party' && r.referenceId === correction.partyId)) {
        references = [...references, { referenceType: 'party', referenceId: correction.partyId }];
      }
    }

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
    if (references.length > 0) {
      for (const ref of references) {
        await store.insertIssueReference({
          id: createId(),
          organizationId: ctx.organizationId,
          issueId,
          referenceType: ref.referenceType,
          referenceId: ref.referenceId,
          createdAt: ctx.effectiveAt,
          createdByMemberId: ctx.actorMemberId,
        });
      }
    }

    if (correction) {
      const targetVersionAtRequest = await this.requireCorrectionPort().targetVersion({
        organizationId: ctx.organizationId,
        partyId: correction.partyId,
        contactId: correction.contactId ?? null,
        locationId: correction.locationId ?? null,
        field: correction.field,
      });
      await store.insertCorrectionRequest({
        issueId,
        organizationId: ctx.organizationId,
        partyId: correction.partyId,
        contactId: correction.contactId ?? null,
        locationId: correction.locationId ?? null,
        field: correction.field,
        proposedValue: correction.proposedValue,
        source: correction.source,
        decision: null,
        appliedEventId: null,
        decisionReason: null,
        decidedByMemberId: null,
        decidedAt: null,
        createdAt: ctx.effectiveAt,
        targetVersionAtRequest,
        valueMatched: null,
        differenceExplanation: null,
      });
    }

    // The proposed value is restricted: it is kept only in the correction record, never in the event.
    return this.emit(ctx, store, 'issue.reported', 'issue', issueId, {
      issueId,
      title: issue.title,
      description: issue.description,
      references,
      ...(correction
        ? {
            correction: {
              partyId: correction.partyId,
              contactId: correction.contactId ?? null,
              locationId: correction.locationId ?? null,
              field: correction.field,
              source: correction.source,
            },
          }
        : {}),
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
    const correction = await store.getCorrectionRequest(ctx.organizationId, parsed.issueId);
    if (correction) {
      // L4: the responsible person must be able to apply the requested change.
      const ownerSnap = await this.snapshotInOrg(ctx.organizationId, parsed.ownerMemberId, ctx.effectiveAt);
      const access = ownerSnap
        ? await this.correctionAccessFor(ctx, ownerSnap, correction.partyId, correction.field)
        : null;
      if (!access?.canApply) throw new Error('VALIDATION_FAILED');
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
    await this.assertCorrectionStanding(ctx, snap, store, issue);
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
    const snap = await this.authorize(ctx, 'AddIssueJournalEntry', ctx.organizationId);

    const parsed = AddIssueJournalEntryPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    await this.assertCorrectionStanding(ctx, snap, store, issue);
    this.assertIssueParticipant(snap, ctx, issue);
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
    const snap = await this.authorize(ctx, 'LinkIssueWork', ctx.organizationId);

    const parsed = LinkIssueWorkPayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    await this.assertCorrectionStanding(ctx, snap, store, issue);
    this.assertIssueParticipant(snap, ctx, issue);
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

    const correction = await store.getCorrectionRequest(ctx.organizationId, parsed.issueId);
    const decision = parsed.correction;
    if (!correction && decision) throw new Error('VALIDATION_FAILED');
    let valueMatched: boolean | null = null;
    if (correction) {
      // L4: a correction is decided only by someone who may apply it, and "applied" must cite
      // the customer event that made the change. The request itself never writes data.
      if (!decision) throw new Error('VALIDATION_FAILED');
      const access = await this.correctionAccessFor(ctx, snap, correction.partyId, correction.field);
      if (!access.canApply) throw new Error('PERMISSION_DENIED');
      if (decision.decision === 'applied') {
        valueMatched = await this.validateAppliedEvidence(ctx, store, issue, correction, decision.appliedEventId!);
        // A change that set something other than the proposal is Applied only with an explicit explanation.
        if (!valueMatched && !decision.differenceExplanation) throw new Error('CORRECTION_VALUE_DIFFERS');
      }
      await store.decideCorrectionRequest(ctx.organizationId, parsed.issueId, {
        decision: decision.decision,
        appliedEventId: decision.appliedEventId ?? null,
        decisionReason: decision.reason,
        decidedByMemberId: ctx.actorMemberId,
        decidedAt: ctx.effectiveAt,
        valueMatched,
        differenceExplanation: decision.differenceExplanation ?? null,
      });
    }

    const before = { status: issue.status, resolution: issue.resolution, outcome: issue.outcome };
    await store.updateIssue(
      parsed.issueId,
      {
        status: 'resolved',
        resolution: parsed.resolution,
        resolvedAt: ctx.effectiveAt,
        ...(decision ? { outcome: decision.decision } : {}),
        version: issue.version + 1,
      },
      issue.version,
    );

    const correctionFacts = decision
      ? {
          correction: {
            decision: decision.decision,
            appliedEventId: decision.appliedEventId ?? null,
            reason: decision.reason,
            valueMatched,
            differenceExplanation: decision.differenceExplanation ?? null,
          },
        }
      : {};
    return this.emit(
      ctx,
      store,
      'issue.resolved',
      'issue',
      parsed.issueId,
      { issueId: parsed.issueId, resolution: parsed.resolution, ...correctionFacts },
      'issue.resolved',
      before,
      {
        status: 'resolved',
        resolution: parsed.resolution,
        ...(decision ? { outcome: decision.decision } : {}),
      },
    );
  }

  private async recordIssueOutcome(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsIssueStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'RecordIssueOutcome', ctx.organizationId);

    const parsed = RecordIssueOutcomePayloadSchema.parse(payload);
    const issue = await this.requireIssue(store, ctx.organizationId, parsed.issueId);
    await this.assertCorrectionStanding(ctx, snap, store, issue);
    this.assertIssueParticipant(snap, ctx, issue);
    this.assertVersion(parsed.expectedVersion, issue.version);
    // L4: a correction request's outcome is its recorded decision, set only by ResolveIssue.
    if (await store.getCorrectionRequest(ctx.organizationId, parsed.issueId)) {
      throw new Error('VALIDATION_FAILED');
    }

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

    // L4: a reopened correction request is pending again; the earlier decision stays in the event history.
    const correction = await store.getCorrectionRequest(ctx.organizationId, parsed.issueId);
    if (correction) {
      await store.decideCorrectionRequest(ctx.organizationId, parsed.issueId, {
        decision: null,
        appliedEventId: null,
        decisionReason: null,
        decidedByMemberId: null,
        decidedAt: null,
        valueMatched: null,
        differenceExplanation: null,
      });
    }

    const before = { status: issue.status };
    await store.updateIssue(
      parsed.issueId,
      {
        status: 'reopened',
        reopenedAt: ctx.effectiveAt,
        ...(correction ? { outcome: null } : {}),
        version: issue.version + 1,
      },
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
