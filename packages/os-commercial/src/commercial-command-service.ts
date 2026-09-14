import type { CommercialCommandName, RequestContext } from '@isalwa/os-contracts';
import {
  COMMAND_REQUIRED_SCOPES,
  canConvertQuoteToOrder,
  canReassignCommercialAccountOwner,
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
  private activeIdempotencyKey?: string;

  constructor(private readonly store: OsCommercialStore) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId);
    const delegations = await this.store.listDelegationsForDelegate(memberId);
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

  private memberHasAdminScope(snap: MemberAccessSnapshot): boolean {
    return memberHasScope(snap, 'people.admin');
  }

  async execute(
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
        return existing.resultJson as unknown as CommandResult;
      }
    }

    return this.store.runInTransaction(async (store) => {
      this.activeIdempotencyKey = idempotencyKey;
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
      idempotencyKey: this.activeIdempotencyKey,
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

  private async requireActiveParty(
    store: OsCommercialStore,
    orgId: string,
    partyId: string,
  ) {
    const party = await store.getPartyInOrg(orgId, partyId);
    if (!party) throw new Error('NOT_FOUND');
    if (party.status !== 'active' || party.mergedIntoPartyId) {
      throw new Error('VALIDATION_FAILED');
    }
    return party;
  }

  private async resolveCommercialAccountId(
    store: OsCommercialStore,
    orgId: string,
    partyId: string,
  ): Promise<string | null> {
    const account = await store.getCommercialAccountForParty(orgId, partyId);
    return account?.status === 'active' ? account.id : null;
  }

  private assertCanEditOpportunity(
    snap: MemberAccessSnapshot,
    opportunity: OpportunityRecord,
  ): void {
    if (this.memberHasAdminScope(snap)) return;
    if (opportunity.ownerMemberId !== snap.memberId) throw new Error('PERMISSION_DENIED');
  }

  private assertCanEditQuote(snap: MemberAccessSnapshot, quote: QuoteRecord): void {
    if (this.memberHasAdminScope(snap)) return;
    if (quote.ownerMemberId !== snap.memberId) throw new Error('PERMISSION_DENIED');
  }

  private async recalculateQuoteTotals(
    store: OsCommercialStore,
    quote: QuoteRecord,
  ): Promise<QuoteRecord> {
    const lines = await store.listQuoteLines(quote.organizationId, quote.id);
    const totals = computeQuoteTotals(lines, quote.headerDiscountCentavos);
    await store.updateQuote(
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
    await this.authorize(ctx, 'CreateOpportunity', ctx.organizationId);
    const partyId = String(payload.partyId);
    await this.requireActiveParty(store, ctx.organizationId, partyId);

    const ownerMemberId = payload.ownerMemberId
      ? String(payload.ownerMemberId)
      : ctx.actorMemberId;
    if (payload.ownerMemberId) {
      const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
      if (!owner) throw new Error('VALIDATION_FAILED');
    }

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
    const existing = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.status !== 'open') throw new Error('VALIDATION_FAILED');
    this.assertCanEditOpportunity(snap, existing);

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

    await store.updateOpportunity(opportunityId, patch, existing.version);
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
    const existing = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.status !== 'open') throw new Error('VALIDATION_FAILED');
    this.assertCanEditOpportunity(snap, existing);

    await store.updateOpportunity(
      opportunityId,
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
    const existing = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.status !== 'open') throw new Error('VALIDATION_FAILED');
    this.assertCanEditOpportunity(snap, existing);

    const status = outcome;
    await store.updateOpportunity(
      opportunityId,
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
    const existing = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
    if (!existing) throw new Error('NOT_FOUND');
    if (existing.status !== 'open') throw new Error('VALIDATION_FAILED');
    this.assertCanEditOpportunity(snap, existing);

    const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!owner || owner.accessStatus !== 'active') throw new Error('VALIDATION_FAILED');

    await store.updateOpportunity(
      opportunityId,
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
    await this.authorize(ctx, 'CreateQuote', ctx.organizationId);
    const partyId = String(payload.partyId);
    await this.requireActiveParty(store, ctx.organizationId, partyId);

    const ownerMemberId = payload.ownerMemberId
      ? String(payload.ownerMemberId)
      : ctx.actorMemberId;
    if (payload.ownerMemberId) {
      const owner = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
      if (!owner) throw new Error('VALIDATION_FAILED');
    }

    let opportunityId: string | null = null;
    if (payload.opportunityId) {
      opportunityId = String(payload.opportunityId);
      const opportunity = await store.getOpportunityInOrg(ctx.organizationId, opportunityId);
      if (!opportunity || opportunity.partyId !== partyId) throw new Error('VALIDATION_FAILED');
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

  private async requireDraftQuote(
    store: OsCommercialStore,
    orgId: string,
    quoteId: string,
  ): Promise<QuoteRecord> {
    const quote = await store.getQuoteInOrg(orgId, quoteId);
    if (!quote) throw new Error('NOT_FOUND');
    if (quote.status !== 'draft') throw new Error('VALIDATION_FAILED');
    return quote;
  }

  private async addQuoteLine(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'AddQuoteLine', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = await this.requireDraftQuote(store, ctx.organizationId, quoteId);
    this.assertCanEditQuote(snap, quote);

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

    const lineNumber = await store.nextQuoteLineNumber(quoteId);
    const quoteLineId = createId();
    const now = ctx.effectiveAt;
    const line: QuoteLineRecord = {
      id: quoteLineId,
      organizationId: ctx.organizationId,
      quoteId,
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
    const updatedQuote = await this.recalculateQuoteTotals(store, quote);

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
    const line = await store.getQuoteLineInOrg(ctx.organizationId, quoteLineId);
    if (!line) throw new Error('NOT_FOUND');
    const quote = await this.requireDraftQuote(store, ctx.organizationId, line.quoteId);
    this.assertCanEditQuote(snap, quote);

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

    await store.updateQuoteLine(quoteLineId, {
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
    const updatedQuote = await this.recalculateQuoteTotals(store, quote);

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
    const line = await store.getQuoteLineInOrg(ctx.organizationId, quoteLineId);
    if (!line) throw new Error('NOT_FOUND');
    const quote = await this.requireDraftQuote(store, ctx.organizationId, line.quoteId);
    this.assertCanEditQuote(snap, quote);

    await store.deleteQuoteLine(quoteLineId);
    const updatedQuote = await this.recalculateQuoteTotals(store, quote);

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
    const quote = await this.requireDraftQuote(store, ctx.organizationId, quoteId);
    this.assertCanEditQuote(snap, quote);

    const headerDiscountCentavos =
      payload.headerDiscountCentavos != null
        ? parseCentavos(payload.headerDiscountCentavos as string | number | bigint)
        : quote.headerDiscountCentavos;
    if (headerDiscountCentavos < 0n) throw new Error('VALIDATION_FAILED');

    const lines = await store.listQuoteLines(ctx.organizationId, quoteId);
    const totals = computeQuoteTotals(lines, headerDiscountCentavos);

    await store.updateQuote(
      quoteId,
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
    const quote = await this.requireDraftQuote(store, ctx.organizationId, quoteId);
    this.assertCanEditQuote(snap, quote);

    const lines = await store.listQuoteLines(ctx.organizationId, quoteId);
    if (lines.length === 0) throw new Error('VALIDATION_FAILED');

    await store.updateQuote(
      quoteId,
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

  private async cancelQuote(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsCommercialStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CancelQuote', ctx.organizationId);
    const quoteId = String(payload.quoteId);
    const quote = await store.getQuoteInOrg(ctx.organizationId, quoteId);
    if (!quote) throw new Error('NOT_FOUND');
    if (quote.status === 'cancelled' || quote.status === 'accepted') {
      throw new Error('VALIDATION_FAILED');
    }
    this.assertCanEditQuote(snap, quote);

    const existingOrder = await store.getOrderForQuote(ctx.organizationId, quoteId);
    if (existingOrder && existingOrder.status === 'open') {
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateQuote(
      quoteId,
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
    const quote = await store.getQuoteInOrg(ctx.organizationId, quoteId);
    if (!quote) throw new Error('NOT_FOUND');
    if (quote.status !== 'submitted') throw new Error('VALIDATION_FAILED');
    if (
      !canConvertQuoteToOrder({
        actorMemberId: snap.memberId,
        grantedScopes: [...snap.roleKeys, ...snap.delegatedScopes],
        quoteOwnerMemberId: quote.ownerMemberId,
      })
    ) {
      throw new Error('PERMISSION_DENIED');
    }

    const existingOrder = await store.getOrderForQuote(ctx.organizationId, quoteId);
    if (existingOrder) throw new Error('CONFLICT');

    const lines = await store.listQuoteLines(ctx.organizationId, quoteId);
    if (lines.length === 0) throw new Error('VALIDATION_FAILED');

    const orderId = createId();
    const orderCount = await store.countOrdersForOrg(ctx.organizationId);
    const orderNumber = `O-${String(orderCount + 1).padStart(6, '0')}`;
    const now = ctx.effectiveAt;
    const orderLines = copyQuoteLinesToOrderLines({
      organizationId: ctx.organizationId,
      orderId,
      quoteId,
      lines,
      copiedAt: now,
    });
    const order: OrderRecord = {
      id: orderId,
      organizationId: ctx.organizationId,
      partyId: quote.partyId,
      commercialAccountId: quote.commercialAccountId,
      quoteId,
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
      quoteId,
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
    const order = await store.getOrderInOrg(ctx.organizationId, orderId);
    if (!order) throw new Error('NOT_FOUND');
    if (order.status !== 'open') throw new Error('VALIDATION_FAILED');
    if (!this.memberHasAdminScope(snap) && order.ownerMemberId !== snap.memberId) {
      throw new Error('PERMISSION_DENIED');
    }

    await store.updateOrder(
      orderId,
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
    const account = await store.getCommercialAccountInOrg(ctx.organizationId, commercialAccountId);
    if (!account) throw new Error('NOT_FOUND');
    if (account.status !== 'active') throw new Error('VALIDATION_FAILED');

    const target = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!target) throw new Error('NOT_FOUND');
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
      commercialAccountId,
      { ownerMemberId, version: account.version + 1 },
      account.version,
    );

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
      },
      'commercial_account.owner_reassigned',
      { ownerMemberId: previousOwnerMemberId },
      { ownerMemberId },
    );
  }
}
