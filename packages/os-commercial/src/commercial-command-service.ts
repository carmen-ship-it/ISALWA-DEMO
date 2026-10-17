import type { CommercialCommandName, RequestContext } from '@isalwa/os-contracts';
import {
  COMMAND_REQUIRED_SCOPES,
  canConvertQuoteToOrder,
  canGrantCustomerCoverage,
  canReassignCommercialAccountOwner,
  canRevokeCustomerCoverage,
  canConvertCoveredQuote,
  canKnowCustomer,
  canManageCustomerAccountWork,
  grantableCoverageActionsFor,
  resolveAccountAssignmentAuthority,
  canWorkCustomerAccount,
  COMMERCIAL_ORDER_CONVERT_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  coverageAuditForConvert,
  buildCustomerCoverageGrant,
  isGrantableCoverageAction,
  LEGACY_COVERAGE_ACTIONS,
  type CustomerCoverageGrant,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasScope,
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
import {
  centavosToString,
  computeLineTotalCentavos,
  computeQuoteTotals,
  parseCentavos,
} from './money';
import type { OsCommercialStore } from './os-commercial-store';
import { copyQuoteLinesToOrderLines } from './order-lines';
import type { OpportunityRecord, OrderRecord, QuoteLineRecord, QuoteRecord } from './store-types';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class CommercialCommandService {
  constructor(private readonly store: OsCommercialStore) {}

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
    command: CommercialCommandName,
    targetOrgId: string,
  ): Promise<MemberAccessSnapshot> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    const required = COMMAND_REQUIRED_SCOPES[command];
    if (required && required !== 'member_active' && !memberHasScope(snap, required)) {
      throw new Error('PERMISSION_DENIED');
    }
    return snap;
  }

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run. The actor must still be able to
   * know the customer the command acted on; otherwise NOT_FOUND, as a fresh
   * command would answer.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: CommercialCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, command, ctx.organizationId);
    const result = openReplay<CommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
    const partyId =
      (await this.replayCustomerPartyId(ctx.organizationId, payload)) ??
      (await this.replayCustomerPartyId(ctx.organizationId, result.data ?? {}));
    if (!partyId || !(await this.customerAccess(ctx, this.store, snap, partyId)).knowable) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  /** Customer a commercial command or its stored result refers to; null when none is resolvable. */
  private async replayCustomerPartyId(
    organizationId: string,
    source: Record<string, unknown>,
  ): Promise<string | null> {
    const id = (key: string) => (typeof source[key] === 'string' && source[key] ? String(source[key]) : null);
    const quoteParty = async (quoteId: string) =>
      (await this.store.getQuoteInOrg(organizationId, quoteId))?.partyId ?? null;
    if (id('partyId')) return id('partyId');
    if (id('opportunityId')) {
      const opportunity = await this.store.getOpportunityInOrg(organizationId, id('opportunityId')!);
      if (opportunity) return opportunity.partyId;
    }
    if (id('quoteId')) {
      const party = await quoteParty(id('quoteId')!);
      if (party) return party;
    }
    if (id('quoteLineId')) {
      const line = await this.store.getQuoteLineInOrg(organizationId, id('quoteLineId')!);
      if (line) return quoteParty(line.quoteId);
    }
    if (id('orderId')) {
      const order = await this.store.getOrderInOrg(organizationId, id('orderId')!);
      if (order) return order.partyId;
    }
    if (id('commercialAccountId')) {
      const account = await this.store.getCommercialAccountInOrg(organizationId, id('commercialAccountId')!);
      if (account) return account.partyId;
    }
    if (id('grantId')) {
      const grant = await this.store.getCustomerCoverageGrantInOrg(organizationId, id('grantId')!);
      if (grant) return grant.customerPartyId;
    }
    return null;
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: CommercialCommandName,
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
    command: CommercialCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
    command: CommercialCommandName,
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
      case 'CreateOpportunity':
        result = await this.createOpportunity(ctx, payload, store);
        break;
      case 'UpdateOpportunity':
        result = await this.updateOpportunity(ctx, payload, store);
        break;
      case 'ChangeOpportunityStage':
        result = await this.changeOpportunityStage(ctx, payload, store);
        break;
      case 'CloseOpportunity':
        result = await this.closeOpportunity(ctx, payload, store);
        break;
      case 'AssignOpportunityOwner':
        result = await this.assignOpportunityOwner(ctx, payload, store);
        break;
      case 'CreateQuote':
        result = await this.createQuote(ctx, payload, store);
        break;
      case 'AddQuoteLine':
        result = await this.addQuoteLine(ctx, payload, store);
        break;
      case 'UpdateQuoteLine':
        result = await this.updateQuoteLine(ctx, payload, store);
        break;
      case 'RemoveQuoteLine':
        result = await this.removeQuoteLine(ctx, payload, store);
        break;
      case 'UpdateQuote':
        result = await this.updateQuote(ctx, payload, store);
        break;
      case 'SubmitQuote':
        result = await this.submitQuote(ctx, payload, store);
        break;
      case 'RecordQuoteManualSend':
        result = await this.recordQuoteManualSend(ctx, payload, store);
        break;
      case 'CancelQuote':
        result = await this.cancelQuote(ctx, payload, store);
        break;
      case 'CreateOrder':
        result = await this.createOrder(ctx, payload, store);
        break;
      case 'CancelOrder':
        result = await this.cancelOrder(ctx, payload, store);
        break;
      case 'ReassignCommercialAccountOwner':
        result = await this.reassignCommercialAccountOwner(ctx, payload, store);
        break;
      case 'GrantCustomerCoverage':
        result = await this.grantCustomerCoverage(ctx, payload, store);
        break;
      case 'RevokeCustomerCoverage':
        result = await this.revokeCustomerCoverage(ctx, payload, store);
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
    store: OsCommercialStore,
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
      capabilityKey: 'commercial',
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

  private async resolveCommercialAccountId(
    store: OsCommercialStore,
    orgId: string,
    partyId: string,
  ): Promise<string | null> {
    const account = await store.getCommercialAccountForParty(orgId, partyId);
    if (!account || account.organizationId !== orgId || account.status !== 'active') return null;
    return account.id;
  }

  /**
   * T03 account access for one customer. knowable follows T02 non-disclosure:
   * when false the command answers exactly as for a missing or foreign id.
   * canWork is the commercial account access (owner, or active coverage that
   * explicitly covers commercial.work). Neither people.admin nor
   * master_data.admin gives commercial access. inCommercialRange is the
   * canKnowCustomer range without coverage or data-steward knowledge; it only
   * narrows a separately held permission and never authorizes on its own.
   * canManage is commercial.work.manage plus current range over the account.
   */
  private async customerAccess(
    ctx: RequestContext,
    store: OsCommercialStore,
    snap: MemberAccessSnapshot,
    partyId: string,
  ): Promise<{
    knowable: boolean;
    canWork: boolean;
    canManage: boolean;
    inCommercialRange: boolean;
    accountOwnerMemberId: string | null;
    coverageGrants: readonly CustomerCoverageGrant[];
  }> {
    const account = await store.getCommercialAccountForParty(ctx.organizationId, partyId);
    const accountOwnerMemberId =
      account && account.organizationId === ctx.organizationId ? account.ownerMemberId : null;
    const actorMemberId = ctx.actorMemberId;
    let coverageGrants: readonly CustomerCoverageGrant[] = [];
    let ownerIsDirectReportOfActor = false;
    const grantedScopes = [...snap.roleKeys, ...snap.delegatedScopes];
    if (accountOwnerMemberId && accountOwnerMemberId !== actorMemberId) {
      coverageGrants = await store.listActiveCustomerCoverageGrants({
        organizationId: ctx.organizationId,
        customerPartyId: partyId,
        actingAdvisorMemberId: actorMemberId,
        asOf: ctx.effectiveAt,
      });
      ownerIsDirectReportOfActor = await store.isDirectReport(
        ctx.organizationId,
        actorMemberId,
        accountOwnerMemberId,
        ctx.effectiveAt,
      );
    }
    const base = {
      actorMemberId,
      organizationId: ctx.organizationId,
      customerPartyId: partyId,
      accountOwnerMemberId,
      coverageGrants,
      asOf: ctx.effectiveAt,
    };
    return {
      knowable: canKnowCustomer({ ...base, grantedScopes, ownerIsDirectReportOfActor }),
      canWork: canWorkCustomerAccount(base),
      canManage: canManageCustomerAccountWork({ ...base, grantedScopes, ownerIsDirectReportOfActor }),
      inCommercialRange: canKnowCustomer({
        ...base,
        coverageGrants: [],
        grantedScopes: grantedScopes.filter((scope) => scope !== MASTER_DATA_ADMIN_SCOPE),
        ownerIsDirectReportOfActor,
      }),
      accountOwnerMemberId,
      coverageGrants,
    };
  }

  /**
   * Assignment authority over an account (reassignment and coverage administration):
   * commercial.account.reassign plus org, team or intake scope
   * (resolveAccountAssignmentAuthority). targetMemberId null = no target (revocation
   * only removes access, so authority over the account is enough). Without
   * authority: NOT_FOUND when the caller cannot know the customer, else PERMISSION_DENIED.
   */
  private async assignmentAuthority(
    ctx: RequestContext,
    store: OsCommercialStore,
    snap: MemberAccessSnapshot,
    account: { partyId: string; ownerMemberId: string | null },
    targetMemberId: string | null,
  ): Promise<'org' | 'team' | 'intake'> {
    const { organizationId, actorMemberId, effectiveAt } = ctx;
    const owner = account.ownerMemberId;
    const authority = resolveAccountAssignmentAuthority({
      grantedScopes: [...snap.roleKeys, ...snap.delegatedScopes],
      currentOwnerMemberId: owner,
      actorLeadsCurrentOwner: owner
        ? await store.isDirectReport(organizationId, actorMemberId, owner, effectiveAt)
        : false,
      actorLeadsTarget:
        targetMemberId === null ||
        (await store.isDirectReport(organizationId, actorMemberId, targetMemberId, effectiveAt)),
    });
    if (authority) return authority;
    const access = await this.customerAccess(ctx, store, snap, account.partyId);
    if (!access.knowable) throw new Error('NOT_FOUND');
    throw new Error('PERMISSION_DENIED');
  }

  /** Opening new commercial work: knowable, then active customer, then account access. */
  private async requireWorkableCustomer(
    ctx: RequestContext,
    store: OsCommercialStore,
    snap: MemberAccessSnapshot,
    partyId: string,
  ): Promise<{ accountOwnerMemberId: string }> {
    const party = this.refuseForeign(
      await store.getPartyInOrg(ctx.organizationId, partyId),
      ctx.organizationId,
    );
    const access = await this.customerAccess(ctx, store, snap, partyId);
    if (!access.knowable) throw new Error('NOT_FOUND');
    if (party.status !== 'active' || party.mergedIntoPartyId) {
      throw new Error('VALIDATION_FAILED');
    }
    if (!(access.canWork || access.canManage) || !access.accountOwnerMemberId) {
      throw new Error('PERMISSION_DENIED');
    }
    return { accountOwnerMemberId: access.accountOwnerMemberId };
  }

  /**
   * New work belongs to the account owner. A covering advisor acts without
   * becoming the owner; the event keeps the real actor.
   */
  private async resolveNewRecordOwner(
    ctx: RequestContext,
    store: OsCommercialStore,
    payload: Record<string, unknown>,
    accountOwnerMemberId: string,
  ): Promise<string> {
    if (!payload.ownerMemberId) return accountOwnerMemberId;
    const ownerMemberId = String(payload.ownerMemberId);
    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (
      !owner ||
      owner.organizationId !== ctx.organizationId ||
      owner.accessStatus !== 'active' ||
      ownerMemberId !== accountOwnerMemberId
    ) {
      throw new Error('VALIDATION_FAILED');
    }
    return ownerMemberId;
  }

  /**
   * Existing record command. Order: knowable (else NOT_FOUND), state (else
   * VALIDATION_FAILED), then current account access plus record ownership: the
   * record owner, or a covering advisor continuing the account owner's record,
   * or (unless ownership changes) a manager with canManage on the account
   * owner's record. Record authorship alone never keeps access after the account moves.
   */
  private async assertCanEditOwnedRecord(
    ctx: RequestContext,
    store: OsCommercialStore,
    snap: MemberAccessSnapshot,
    record: { ownerMemberId: string; partyId: string },
    stateAllowsCommand: boolean,
    changesOwnership = false,
  ): Promise<void> {
    const access = await this.customerAccess(ctx, store, snap, record.partyId);
    if (!access.knowable && record.ownerMemberId !== snap.memberId) throw new Error('NOT_FOUND');
    if (!stateAllowsCommand) throw new Error('VALIDATION_FAILED');
    if (
      !changesOwnership &&
      access.canManage &&
      access.accountOwnerMemberId === record.ownerMemberId
    ) {
      return;
    }
    if (!access.canWork) throw new Error('PERMISSION_DENIED');
    // After a reassignment the current account owner continues pending records;
    // the record keeps its original owner for history and attribution.
    if (access.accountOwnerMemberId === snap.memberId) return;
    if (
      record.ownerMemberId !== snap.memberId &&
      access.accountOwnerMemberId !== record.ownerMemberId
    ) {
      throw new Error('PERMISSION_DENIED');
    }
  }

  private refuseForeign<T extends { organizationId: string }>(
    record: T | null,
    organizationId: string,
  ): T {
    if (!record || record.organizationId !== organizationId) {
      throw new Error('NOT_FOUND');
    }
    return record;
  }

  private isSessionRecord(
    record: { organizationId?: string } | null,
    organizationId: string,
  ): boolean {
    if (!record) return false;
    return record.organizationId == null || record.organizationId === organizationId;
  }

  private async recalculateQuoteTotals(
    store: OsCommercialStore,
    organizationId: string,
    quote: QuoteRecord,
  ): Promise<QuoteRecord> {
    this.refuseForeign(quote, organizationId);
    const lines = await store.listQuoteLines(organizationId, quote.id);
    const totals = computeQuoteTotals(lines, quote.headerDiscountCentavos);
    await store.updateQuote(
      organizationId,
      quote.id,
      {
        subtotalCentavos: totals.subtotalCentavos,
        totalCentavos: totals.totalCentavos,
        version: quote.version + 1,
      },
      quote.version,
    );
    return {
      ...quote,
      subtotalCentavos: totals.subtotalCentavos,
      totalCentavos: totals.totalCentavos,
      version: quote.version + 1,
    };
  }

  private serializeOpportunity(opportunity: OpportunityRecord) {
    return {
      opportunityId: opportunity.id,
      partyId: opportunity.partyId,
      commercialAccountId: opportunity.commercialAccountId,
      ownerMemberId: opportunity.ownerMemberId,
      title: opportunity.title,
      stage: opportunity.stage,
      status: opportunity.status,
      expectedValueCentavos:
        opportunity.expectedValueCentavos != null
          ? centavosToString(opportunity.expectedValueCentavos)
          : null,
    };
  }

  private serializeQuote(quote: QuoteRecord) {
    return {
      quoteId: quote.id,
      partyId: quote.partyId,
      ownerMemberId: quote.ownerMemberId,
      opportunityId: quote.opportunityId,
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      currency: quote.currency,
      subtotalCentavos: centavosToString(quote.subtotalCentavos),
      headerDiscountCentavos: centavosToString(quote.headerDiscountCentavos),
      totalCentavos: centavosToString(quote.totalCentavos),
    };
  }

  private async createOpportunity(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CreateOpportunity', ctx.organizationId);
    const partyId = String(payload.partyId);
    const { accountOwnerMemberId } = await this.requireWorkableCustomer(ctx, store, snap, partyId);
    const ownerMemberId = await this.resolveNewRecordOwner(ctx, store, payload, accountOwnerMemberId);

    const commercialAccountId = await this.resolveCommercialAccountId(
      store,
      ctx.organizationId,
      partyId,
    );
    const expectedValueCentavos =
      payload.expectedValueCentavos != null
        ? parseCentavos(payload.expectedValueCentavos as string | number | bigint)
        : null;
    if (expectedValueCentavos != null && expectedValueCentavos < 0n) {
      throw new Error('VALIDATION_FAILED');
    }

    const opportunityId = createId();
    const now = ctx.effectiveAt;
    const opportunity: OpportunityRecord = {
      id: opportunityId,
      organizationId: ctx.organizationId,
      partyId,
      commercialAccountId,
      ownerMemberId,
      title: String(payload.title),
      stage: payload.stage ? String(payload.stage) : 'open',
      status: 'open',
      expectedValueCentavos,
      sourceMetadataJson: (payload.sourceMetadata as Record<string, unknown> | undefined) ?? null,
      version: 0,
      closedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.insertOpportunity(opportunity);

    return this.emit(
      ctx,
      store,
      'opportunity.created',
      'opportunity',
      opportunityId,
      this.serializeOpportunity(opportunity),
    );
  }

  private async updateOpportunity(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'UpdateOpportunity', ctx.organizationId);
    const opportunityId = String(payload.opportunityId);
    const existing = this.refuseForeign(
      await store.getOpportunityInOrg(ctx.organizationId, opportunityId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(ctx, store, snap, existing, existing.status === 'open');

    const patch: Partial<OpportunityRecord> = { version: existing.version + 1 };
    if (payload.title != null) patch.title = String(payload.title);
    if (payload.expectedValueCentavos !== undefined) {
      patch.expectedValueCentavos =
        payload.expectedValueCentavos == null
          ? null
          : parseCentavos(payload.expectedValueCentavos as string | number | bigint);
      if (patch.expectedValueCentavos != null && patch.expectedValueCentavos < 0n) {
        throw new Error('VALIDATION_FAILED');
      }
    }
    if (payload.sourceMetadata !== undefined) {
      patch.sourceMetadataJson =
        payload.sourceMetadata == null
          ? null
          : (payload.sourceMetadata as Record<string, unknown>);
    }

    await store.updateOpportunity(ctx.organizationId, existing.id, patch, existing.version);
    const after = { ...existing, ...patch };
    return this.emit(
      ctx,
      store,
      'opportunity.updated',
      'opportunity',
      opportunityId,
      this.serializeOpportunity(after),
      'opportunity.updated',
      this.serializeOpportunity(existing),
      this.serializeOpportunity(after),
    );
  }

  private async changeOpportunityStage(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'ChangeOpportunityStage', ctx.organizationId);
    const opportunityId = String(payload.opportunityId);
    const stage = String(payload.stage);
    const existing = this.refuseForeign(
      await store.getOpportunityInOrg(ctx.organizationId, opportunityId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(ctx, store, snap, existing, existing.status === 'open');

    await store.updateOpportunity(
      ctx.organizationId,
      existing.id,
      { stage, version: existing.version + 1 },
      existing.version,
    );
    const after = { ...existing, stage, version: existing.version + 1 };
    return this.emit(
      ctx,
      store,
      'opportunity.stage_changed',
      'opportunity',
      opportunityId,
      { opportunityId, previousStage: existing.stage, stage },
      'opportunity.stage_changed',
      { stage: existing.stage },
      { stage },
    );
  }

  private async closeOpportunity(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CloseOpportunity', ctx.organizationId);
    const opportunityId = String(payload.opportunityId);
    const outcome = String(payload.outcome) as 'won' | 'lost';
    const existing = this.refuseForeign(
      await store.getOpportunityInOrg(ctx.organizationId, opportunityId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(ctx, store, snap, existing, existing.status === 'open');

    const status = outcome;
    await store.updateOpportunity(
      ctx.organizationId,
      existing.id,
      {
        status,
        closedAt: ctx.effectiveAt,
        version: existing.version + 1,
      },
      existing.version,
    );

    return this.emit(
      ctx,
      store,
      'opportunity.closed',
      'opportunity',
      opportunityId,
      { opportunityId, outcome: status },
    );
  }

  private async assignOpportunityOwner(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'AssignOpportunityOwner', ctx.organizationId);
    const opportunityId = String(payload.opportunityId);
    const ownerMemberId = String(payload.ownerMemberId);
    const existing = this.refuseForeign(
      await store.getOpportunityInOrg(ctx.organizationId, opportunityId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(ctx, store, snap, existing, existing.status === 'open', true);

    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!owner || owner.organizationId !== ctx.organizationId || owner.accessStatus !== 'active') {
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateOpportunity(
      ctx.organizationId,
      existing.id,
      { ownerMemberId, version: existing.version + 1 },
      existing.version,
    );

    return this.emit(
      ctx,
      store,
      'opportunity.owner_assigned',
      'opportunity',
      opportunityId,
      {
        opportunityId,
        previousOwnerMemberId: existing.ownerMemberId,
        ownerMemberId,
      },
    );
  }

  private async createQuote(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CreateQuote', ctx.organizationId);
    const partyId = String(payload.partyId);
    const { accountOwnerMemberId } = await this.requireWorkableCustomer(ctx, store, snap, partyId);
    const ownerMemberId = await this.resolveNewRecordOwner(ctx, store, payload, accountOwnerMemberId);

    let opportunityId: string | null = null;
    if (payload.opportunityId) {
      opportunityId = String(payload.opportunityId);
      const opportunity = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
      if (
        !opportunity ||
        opportunity.organizationId !== ctx.organizationId ||
        opportunity.partyId !== partyId
      ) {
        throw new Error('VALIDATION_FAILED');
      }
      opportunityId = opportunity.id;
    }

    const commercialAccountId = await this.resolveCommercialAccountId(
      store,
      ctx.organizationId,
      partyId,
    );
    const quoteId = createId();
    const quoteCount = await store.countQuotesForOrg(ctx.organizationId);
    const quoteNumber = `Q-${String(quoteCount + 1).padStart(6, '0')}`;
    const now = ctx.effectiveAt;
    const quote: QuoteRecord = {
      id: quoteId,
      organizationId: ctx.organizationId,
      partyId,
      commercialAccountId,
      opportunityId,
      ownerMemberId,
      quoteNumber,
      status: 'draft',
      currency: (payload.currency as QuoteRecord['currency']) ?? 'BOB',
      subtotalCentavos: 0n,
      headerDiscountCentavos: 0n,
      totalCentavos: 0n,
      revisionNumber: 1,
      notes: payload.notes ? String(payload.notes) : null,
      version: 0,
      submittedAt: null,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.insertQuote(quote);

    return this.emit(
      ctx,
      store,
      'quote.created',
      'quote',
      quoteId,
      this.serializeQuote(quote),
    );
  }

  private async requireQuote(
    store: OsCommercialStore,
    orgId: string,
    quoteId: string,
  ): Promise<QuoteRecord> {
    return this.refuseForeign(await store.getQuoteInOrg(orgId, quoteId), orgId);
  }

  private async addQuoteLine(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'AddQuoteLine', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = await this.requireQuote(store, ctx.organizationId, quoteId);
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'draft');

    const quantity = Number(payload.quantity);
    const unitPriceCentavos = parseCentavos(payload.unitPriceCentavos as string | number | bigint);
    const discountCentavos = payload.discountCentavos
      ? parseCentavos(payload.discountCentavos as string | number | bigint)
      : 0n;
    const lineTotalCentavos = computeLineTotalCentavos(
      quantity,
      unitPriceCentavos,
      discountCentavos,
    );

    const lineNumber = await store.nextQuoteLineNumber(ctx.organizationId, quote.id);
    const quoteLineId = createId();
    const now = ctx.effectiveAt;
    const line: QuoteLineRecord = {
      id: quoteLineId,
      organizationId: ctx.organizationId,
      quoteId: quote.id,
      lineNumber,
      description: String(payload.description),
      quantity,
      unitLabel: payload.unitLabel ? String(payload.unitLabel) : null,
      unitPriceCentavos,
      discountCentavos,
      lineTotalCentavos,
      productRef: payload.productRef ? String(payload.productRef) : null,
      createdAt: now,
      updatedAt: now,
    };
    await store.insertQuoteLine(line);
    const updatedQuote = await this.recalculateQuoteTotals(store, ctx.organizationId, quote);

    return this.emit(
      ctx,
      store,
      'quote.line_added',
      'quote',
      quoteId,
      {
        quoteId,
        quoteLineId,
        lineNumber,
        lineTotalCentavos: centavosToString(lineTotalCentavos),
        totalCentavos: centavosToString(updatedQuote.totalCentavos),
      },
    );
  }

  private async updateQuoteLine(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'UpdateQuoteLine', ctx.organizationId);
    const quoteLineId = String(payload.quoteLineId);
    const line = this.refuseForeign(
      await store.getQuoteLineInOrg(ctx.organizationId, quoteLineId),
      ctx.organizationId,
    );
    const quote = await this.requireQuote(store, ctx.organizationId, line.quoteId);
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'draft');

    const quantity = payload.quantity != null ? Number(payload.quantity) : line.quantity;
    const unitPriceCentavos =
      payload.unitPriceCentavos != null
        ? parseCentavos(payload.unitPriceCentavos as string | number | bigint)
        : line.unitPriceCentavos;
    const discountCentavos =
      payload.discountCentavos != null
        ? parseCentavos(payload.discountCentavos as string | number | bigint)
        : line.discountCentavos;
    const lineTotalCentavos = computeLineTotalCentavos(
      quantity,
      unitPriceCentavos,
      discountCentavos,
    );

    await store.updateQuoteLine(ctx.organizationId, line.id, {
      description: payload.description != null ? String(payload.description) : line.description,
      quantity,
      unitLabel:
        payload.unitLabel !== undefined
          ? payload.unitLabel == null
            ? null
            : String(payload.unitLabel)
          : line.unitLabel,
      unitPriceCentavos,
      discountCentavos,
      lineTotalCentavos,
      productRef:
        payload.productRef !== undefined
          ? payload.productRef == null
            ? null
            : String(payload.productRef)
          : line.productRef,
    });
    const updatedQuote = await this.recalculateQuoteTotals(store, ctx.organizationId, quote);

    return this.emit(
      ctx,
      store,
      'quote.line_updated',
      'quote',
      quote.id,
      {
        quoteId: quote.id,
        quoteLineId,
        lineTotalCentavos: centavosToString(lineTotalCentavos),
        totalCentavos: centavosToString(updatedQuote.totalCentavos),
      },
    );
  }

  private async removeQuoteLine(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'RemoveQuoteLine', ctx.organizationId);
    const quoteLineId = String(payload.quoteLineId);
    const line = this.refuseForeign(
      await store.getQuoteLineInOrg(ctx.organizationId, quoteLineId),
      ctx.organizationId,
    );
    const quote = await this.requireQuote(store, ctx.organizationId, line.quoteId);
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'draft');

    await store.deleteQuoteLine(ctx.organizationId, line.id);
    const updatedQuote = await this.recalculateQuoteTotals(store, ctx.organizationId, quote);

    return this.emit(
      ctx,
      store,
      'quote.line_removed',
      'quote',
      quote.id,
      {
        quoteId: quote.id,
        quoteLineId,
        totalCentavos: centavosToString(updatedQuote.totalCentavos),
      },
    );
  }

  private async updateQuote(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'UpdateQuote', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = await this.requireQuote(store, ctx.organizationId, quoteId);
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'draft');

    const headerDiscountCentavos =
      payload.headerDiscountCentavos != null
        ? parseCentavos(payload.headerDiscountCentavos as string | number | bigint)
        : quote.headerDiscountCentavos;
    if (headerDiscountCentavos < 0n) throw new Error('VALIDATION_FAILED');

    const lines = await store.listQuoteLines(ctx.organizationId, quote.id);
    const totals = computeQuoteTotals(lines, headerDiscountCentavos);

    await store.updateQuote(
      ctx.organizationId,
      quote.id,
      {
        notes:
          payload.notes !== undefined
            ? payload.notes == null
              ? null
              : String(payload.notes)
            : quote.notes,
        headerDiscountCentavos,
        subtotalCentavos: totals.subtotalCentavos,
        totalCentavos: totals.totalCentavos,
        version: quote.version + 1,
      },
      quote.version,
    );

    const after = {
      ...quote,
      notes:
        payload.notes !== undefined
          ? payload.notes == null
            ? null
            : String(payload.notes)
          : quote.notes,
      headerDiscountCentavos,
      subtotalCentavos: totals.subtotalCentavos,
      totalCentavos: totals.totalCentavos,
      version: quote.version + 1,
    };

    return this.emit(
      ctx,
      store,
      'quote.updated',
      'quote',
      quoteId,
      this.serializeQuote(after),
    );
  }

  private async submitQuote(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'SubmitQuote', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = await this.requireQuote(store, ctx.organizationId, quoteId);
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'draft');

    const lines = await store.listQuoteLines(ctx.organizationId, quote.id);
    if (lines.length === 0) throw new Error('VALIDATION_FAILED');

    await store.updateQuote(
      ctx.organizationId,
      quote.id,
      {
        status: 'submitted',
        submittedAt: ctx.effectiveAt,
        version: quote.version + 1,
      },
      quote.version,
    );

    return this.emit(
      ctx,
      store,
      'quote.submitted',
      'quote',
      quoteId,
      {
        quoteId,
        quoteNumber: quote.quoteNumber,
        totalCentavos: centavosToString(quote.totalCentavos),
      },
    );
  }

  /**
   * Records that a human sent the quote outside ISALWA.
   * Does not call WhatsApp or any provider. Does not change quote status.
   */
  private async recordQuoteManualSend(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'RecordQuoteManualSend', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = this.refuseForeign(
      await store.getQuoteInOrg(ctx.organizationId, quoteId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(ctx, store, snap, quote, quote.status === 'submitted');

    const channel = String(payload.channel ?? '');
    if (channel !== 'whatsapp' && channel !== 'email' && channel !== 'otro') {
      throw new Error('VALIDATION_FAILED');
    }
    const noteRaw = payload.note != null ? String(payload.note).trim() : '';
    const note = noteRaw.length > 0 ? noteRaw : undefined;

    return this.emit(
      ctx,
      store,
      'quote.send_recorded',
      'quote',
      quoteId,
      {
        quoteId,
        quoteNumber: quote.quoteNumber,
        partyId: quote.partyId,
        channel,
        note,
        providerSend: false,
        recordedAt: ctx.effectiveAt.toISOString(),
        recordedByMemberId: snap.memberId,
      },
    );
  }

  private async cancelQuote(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CancelQuote', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = this.refuseForeign(
      await store.getQuoteInOrg(ctx.organizationId, quoteId),
      ctx.organizationId,
    );
    await this.assertCanEditOwnedRecord(
      ctx,
      store,
      snap,
      quote,
      quote.status !== 'cancelled' && quote.status !== 'accepted',
    );

    const existingOrder = await store.getOrderForQuote(ctx.organizationId, quote.id);
    if (
      this.isSessionRecord(existingOrder, ctx.organizationId) &&
      existingOrder?.status === 'open'
    ) {
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateQuote(
      ctx.organizationId,
      quote.id,
      {
        status: 'cancelled',
        cancelledAt: ctx.effectiveAt,
        version: quote.version + 1,
      },
      quote.version,
    );

    return this.emit(
      ctx,
      store,
      'quote.cancelled',
      'quote',
      quoteId,
      {
        quoteId,
        reason: payload.reason ? String(payload.reason) : undefined,
      },
    );
  }

  private async createOrder(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CreateOrder', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = this.refuseForeign(
      await store.getQuoteInOrg(ctx.organizationId, quoteId),
      ctx.organizationId,
    );
    const access = await this.customerAccess(ctx, store, snap, quote.partyId);
    if (!access.knowable && quote.ownerMemberId !== snap.memberId) throw new Error('NOT_FOUND');
    if (quote.status !== 'submitted') throw new Error('VALIDATION_FAILED');
    const scopes = [...snap.roleKeys, ...snap.delegatedScopes];
    const account = quote.commercialAccountId
      ? await store.getCommercialAccountInOrg(
          ctx.organizationId,
          quote.commercialAccountId,
        )
      : null;
    const primaryOwnerMemberId =
      account &&
      account.organizationId === ctx.organizationId &&
      account.ownerMemberId
        ? account.ownerMemberId
        : quote.ownerMemberId;
    const grants = await store.listActiveCustomerCoverageGrants({
      organizationId: ctx.organizationId,
      customerPartyId: quote.partyId,
      actingAdvisorMemberId: snap.memberId,
      asOf: ctx.effectiveAt,
    });
    // Conversion permission and account access must both hold, by path:
    // own: quote owner with convert.own who is the current account owner;
    // range: order.convert within the actor's team/org range;
    // coverage: active grant that explicitly covers quote.convert + the advisor's
    // own conversion permission, on the current owner's quote (canConvertCoveredQuote).
    const permitted = canConvertQuoteToOrder({
      actorMemberId: snap.memberId,
      grantedScopes: scopes,
      quoteOwnerMemberId: quote.ownerMemberId,
    });
    const ownConvert =
      permitted &&
      quote.ownerMemberId === snap.memberId &&
      access.accountOwnerMemberId === snap.memberId;
    const rangeConvert = scopes.includes(COMMERCIAL_ORDER_CONVERT_SCOPE) && access.inCommercialRange;
    const coverageConvert = canConvertCoveredQuote({
      actorMemberId: snap.memberId,
      organizationId: ctx.organizationId,
      customerPartyId: quote.partyId,
      grantedScopes: scopes,
      accountOwnerMemberId: access.accountOwnerMemberId,
      quoteOwnerMemberId: quote.ownerMemberId,
      coverageGrants: grants,
      asOf: ctx.effectiveAt,
    });
    if (!ownConvert && !rangeConvert && !coverageConvert) throw new Error('PERMISSION_DENIED');
    const viaCoverage = !ownConvert && !rangeConvert;
    const coverage = coverageAuditForConvert({
      actorMemberId: snap.memberId,
      organizationId: ctx.organizationId,
      customerPartyId: quote.partyId,
      primaryOwnerMemberId,
      grants,
      asOf: ctx.effectiveAt,
    });

    const existingOrder = await store.getOrderForQuote(ctx.organizationId, quote.id);
    if (this.isSessionRecord(existingOrder, ctx.organizationId)) {
      throw new Error('CONFLICT');
    }

    const lines = await store.listQuoteLines(ctx.organizationId, quote.id);
    if (lines.length === 0) throw new Error('VALIDATION_FAILED');

    const orderId = createId();
    const orderCount = await store.countOrdersForOrg(ctx.organizationId);
    const orderNumber = `O-${String(orderCount + 1).padStart(6, '0')}`;
    const now = ctx.effectiveAt;
    const orderLines = copyQuoteLinesToOrderLines({
      organizationId: ctx.organizationId,
      orderId,
      quoteId: quote.id,
      lines,
      copiedAt: now,
    });
    const order: OrderRecord = {
      id: orderId,
      organizationId: ctx.organizationId,
      partyId: quote.partyId,
      commercialAccountId: quote.commercialAccountId,
      quoteId: quote.id,
      ownerMemberId: quote.ownerMemberId,
      orderNumber,
      status: 'open',
      currency: quote.currency,
      subtotalCentavos: quote.subtotalCentavos,
      headerDiscountCentavos: quote.headerDiscountCentavos,
      totalCentavos: quote.totalCentavos,
      version: 0,
      cancelledAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await store.insertOrder(order);
    await store.insertOrderLines(orderLines);
    await store.updateQuote(
      ctx.organizationId,
      quote.id,
      { status: 'accepted', version: quote.version + 1 },
      quote.version,
    );

    return this.emit(
      ctx,
      store,
      'order.created',
      'order',
      orderId,
      {
        orderId,
        orderNumber,
        quoteId,
        partyId: quote.partyId,
        totalCentavos: centavosToString(order.totalCentavos),
        lineCount: orderLines.length,
        quoteLineIds: orderLines.map((line) => line.quoteLineId),
        primaryOwnerMemberId,
        actingAdvisorMemberId: viaCoverage ? coverage.actingAdvisorMemberId : null,
        coverageSource: viaCoverage ? 'commercial.customer.coverage' : null,
        conversionPath: ownConvert ? 'own' : rangeConvert ? 'range' : 'coverage',
        convertingActorMemberId: snap.memberId,
        sharedOwnership: false,
      },
    );
  }

  private async cancelOrder(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CancelOrder', ctx.organizationId);
    const orderId = String(payload.orderId);
    const order = this.refuseForeign(
      await store.getOrderInOrg(ctx.organizationId, orderId),
      ctx.organizationId,
    );
    const access = await this.customerAccess(ctx, store, snap, order.partyId);
    if (!access.knowable && order.ownerMemberId !== snap.memberId) throw new Error('NOT_FOUND');
    if (order.status !== 'open') throw new Error('VALIDATION_FAILED');
    if (order.ownerMemberId !== snap.memberId || !access.canWork) {
      throw new Error('PERMISSION_DENIED');
    }

    await store.updateOrder(
      ctx.organizationId,
      order.id,
      {
        status: 'cancelled',
        cancelledAt: ctx.effectiveAt,
        version: order.version + 1,
      },
      order.version,
    );

    return this.emit(
      ctx,
      store,
      'order.cancelled',
      'order',
      orderId,
      {
        orderId,
        reason: payload.reason ? String(payload.reason) : undefined,
      },
    );
  }

  private async reassignCommercialAccountOwner(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'ReassignCommercialAccountOwner', ctx.organizationId);
    if (!canReassignCommercialAccountOwner([...snap.roleKeys, ...snap.delegatedScopes])) {
      throw new Error('PERMISSION_DENIED');
    }

    const commercialAccountId = String(payload.commercialAccountId);
    const ownerMemberId = String(payload.ownerMemberId);
    const account = this.refuseForeign(
      await store.getCommercialAccountInOrg(ctx.organizationId, commercialAccountId),
      ctx.organizationId,
    );
    const authority = await this.assignmentAuthority(ctx, store, snap, account, ownerMemberId);
    if (account.status !== 'active') throw new Error('VALIDATION_FAILED');

    const target = this.refuseForeign(
      await store.getMemberInOrg(ctx.organizationId, ownerMemberId),
      ctx.organizationId,
    );
    if (target.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const previousOwnerMemberId = account.ownerMemberId;
    if (previousOwnerMemberId === ownerMemberId) {
      return {
        commandId: ctx.correlationId,
        correlationId: ctx.correlationId,
        data: {
          commercialAccountId,
          partyId: account.partyId,
          previousOwnerMemberId,
          ownerMemberId,
          unchanged: true,
        },
      };
    }

    await store.updateCommercialAccount(
      ctx.organizationId,
      account.id,
      { ownerMemberId, version: account.version + 1 },
      account.version,
    );
    // Coverage was granted on behalf of the previous owner; end it explicitly so
    // the history shows why it stopped. Quotes, orders and opportunities keep
    // their recorded owner (sales attribution is not rewritten).
    const endedCoverageGrantIds: string[] = [];
    for (const grant of await store.listActiveCustomerCoverageForParty({
      organizationId: ctx.organizationId,
      customerPartyId: account.partyId,
      asOf: ctx.effectiveAt,
    })) {
      const ended = await store.revokeCustomerCoverageGrant({
        organizationId: ctx.organizationId,
        grantId: grant.id,
        revokedAt: ctx.effectiveAt,
        recordedByMemberId: snap.memberId,
      });
      if (ended) endedCoverageGrantIds.push(ended.id);
    }

    return this.emit(
      ctx,
      store,
      'commercial_account.owner_reassigned',
      'commercial_account',
      commercialAccountId,
      {
        commercialAccountId,
        partyId: account.partyId,
        previousOwnerMemberId,
        ownerMemberId,
        assignmentAuthority: authority,
        endedCoverageGrantIds,
      },
      'commercial_account.owner_reassigned',
      { ownerMemberId: previousOwnerMemberId },
      { ownerMemberId },
    );
  }

  private async grantCustomerCoverage(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'GrantCustomerCoverage', ctx.organizationId);
    if (!canGrantCustomerCoverage([...snap.roleKeys, ...snap.delegatedScopes])) {
      throw new Error('PERMISSION_DENIED');
    }

    const commercialAccountId = String(payload.commercialAccountId);
    const actingAdvisorMemberId = String(payload.actingAdvisorMemberId);
    const note = payload.note != null ? String(payload.note).trim() || undefined : undefined;
    const requestedActions = Array.isArray(payload.coveredActions)
      ? payload.coveredActions.map(String)
      : [...LEGACY_COVERAGE_ACTIONS];
    if (requestedActions.length === 0 || !requestedActions.every(isGrantableCoverageAction)) {
      throw new Error('VALIDATION_FAILED');
    }
    let endsAt: Date | null = null;
    if (payload.endsAt != null && String(payload.endsAt).trim()) {
      endsAt = new Date(String(payload.endsAt));
      if (Number.isNaN(endsAt.getTime())) throw new Error('VALIDATION_FAILED');
    }

    const account = this.refuseForeign(
      await store.getCommercialAccountInOrg(ctx.organizationId, commercialAccountId),
      ctx.organizationId,
    );
    await this.assignmentAuthority(ctx, store, snap, account, actingAdvisorMemberId);
    // A grantor delegates only what they are authorized to do themselves.
    const delegable: readonly string[] = grantableCoverageActionsFor([...snap.roleKeys, ...snap.delegatedScopes]);
    if (!requestedActions.every((action) => delegable.includes(action))) throw new Error('PERMISSION_DENIED');
    if (account.status !== 'active') throw new Error('VALIDATION_FAILED');
    if (!account.ownerMemberId) throw new Error('VALIDATION_FAILED');

    const helper = this.refuseForeign(
      await store.getMemberInOrg(ctx.organizationId, actingAdvisorMemberId),
      ctx.organizationId,
    );
    if (helper.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    const startsAt = new Date();
    const built = buildCustomerCoverageGrant({
      organizationId: ctx.organizationId,
      customerPartyId: account.partyId,
      primaryOwnerMemberId: account.ownerMemberId,
      actingAdvisorMemberId,
      coveredActions: requestedActions,
      startsAt,
      endsAt: endsAt ?? undefined,
    });
    if (!built) throw new Error('VALIDATION_FAILED');

    const existing = await store.listActiveCustomerCoverageGrants({
      organizationId: ctx.organizationId,
      customerPartyId: account.partyId,
      actingAdvisorMemberId,
      asOf: startsAt,
    });
    if (existing.length > 0) throw new Error('VALIDATION_FAILED');

    const grantId = createId();
    await store.createCustomerCoverageGrant({
      id: grantId,
      organizationId: ctx.organizationId,
      customerPartyId: account.partyId,
      primaryOwnerMemberId: account.ownerMemberId,
      actingAdvisorMemberId,
      coveredActions: built.coveredActions,
      startsAt,
      endsAt,
      recordedAt: startsAt,
      recordedByMemberId: snap.memberId,
    });

    return this.emit(
      ctx,
      store,
      'customer_coverage.granted',
      'party',
      account.partyId,
      {
        grantId,
        commercialAccountId,
        partyId: account.partyId,
        primaryOwnerMemberId: account.ownerMemberId,
        actingAdvisorMemberId,
        coveredActions: [...built.coveredActions],
        startsAt: startsAt.toISOString(),
        endsAt: endsAt?.toISOString() ?? null,
        note,
        assignedByMemberId: snap.memberId,
      },
      'customer_coverage.granted',
      undefined,
      {
        grantId,
        actingAdvisorMemberId,
        primaryOwnerMemberId: account.ownerMemberId,
      },
    );
  }

  private async revokeCustomerCoverage(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'RevokeCustomerCoverage', ctx.organizationId);
    if (!canRevokeCustomerCoverage([...snap.roleKeys, ...snap.delegatedScopes])) {
      throw new Error('PERMISSION_DENIED');
    }

    const grantId = String(payload.grantId);
    const note = payload.note != null ? String(payload.note).trim() || undefined : undefined;
    const grant = this.refuseForeign(
      await store.getCustomerCoverageGrantInOrg(ctx.organizationId, grantId),
      ctx.organizationId,
    );
    const account = await store.getCommercialAccountForParty(ctx.organizationId, grant.customerPartyId);
    await this.assignmentAuthority(
      ctx,
      store,
      snap,
      { partyId: grant.customerPartyId, ownerMemberId: account?.ownerMemberId ?? grant.primaryOwnerMemberId },
      null,
    );
    const revokedAt = new Date();
    const revoked = await store.revokeCustomerCoverageGrant({
      organizationId: ctx.organizationId,
      grantId,
      revokedAt,
      recordedByMemberId: snap.memberId,
    });
    if (!revoked) throw new Error('NOT_FOUND');

    return this.emit(
      ctx,
      store,
      'customer_coverage.revoked',
      'party',
      revoked.customerPartyId,
      {
        grantId: revoked.id,
        partyId: revoked.customerPartyId,
        primaryOwnerMemberId: revoked.primaryOwnerMemberId,
        actingAdvisorMemberId: revoked.actingAdvisorMemberId,
        revokedAt: revokedAt.toISOString(),
        note,
        revokedByMemberId: snap.memberId,
      },
      'customer_coverage.revoked',
      { grantId: revoked.id, revokedAt: null },
      { grantId: revoked.id, revokedAt: revokedAt.toISOString() },
    );
  }
}
