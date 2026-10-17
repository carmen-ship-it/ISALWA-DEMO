import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  partyChangeNeedsReason,
  resolveAccountAssignmentAuthority,
  type PartyChangeKind,
  type PartyCommandName,
  type RequestContext,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
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
import { createId, normalizeBoliviaPhone } from '@isalwa/ts-utils';
import { assertPartyCommandAuthority } from './customer-authority';
import type { OsPartyStore } from './os-party-store';
import type {
  CommercialAccountRecord,
  ContactRecord,
  PartyRecord,
  PartyRoleAssignmentRecord,
} from './store-types';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class PartyCommandService {
  constructor(private readonly store: OsPartyStore) {}

  private async snapshotInOrg(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.store.listDelegationsForDelegate(memberId, organizationId);
    const effectiveScopes = computeEffectiveScopes(
      roles.map((r) => ({
        roleKey: r.roleKey,
        effectiveAt: r.effectiveAt,
        endedAt: r.endedAt,
      })),
      delegations.map((d) => ({
        scopes: d.scopes,
        startsAt: d.startsAt,
        expiresAt: d.expiresAt,
        revokedAt: d.revokedAt,
        delegatorMemberId: d.delegatorMemberId ?? '',
        organizationId: d.organizationId,
        delegator: d.delegator,
      })),
      asOf,
    );
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: effectiveScopes,
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    command: PartyCommandName,
    targetOrgId: string,
    customerPartyId?: string | null,
    store: OsPartyStore = this.store,
  ): Promise<MemberAccessSnapshot> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    await assertPartyCommandAuthority({ store, ctx, snap, command, customerPartyId });
    return snap;
  }

  /** The customer a replayed payload targets, so replay re-checks the same resource authority. */
  private static payloadPartyId(command: PartyCommandName, payload: Record<string, unknown>): string | null {
    const raw = command === 'UpdateContact' ? payload.organizationPartyId : payload.partyId;
    return typeof raw === 'string' ? raw : null;
  }

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: PartyCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<CommandResult> {
    await this.authorize(ctx, command, ctx.organizationId, PartyCommandService.payloadPartyId(command, payload));
    return openReplay<CommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: PartyCommandName,
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
    command: PartyCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
    command: PartyCommandName,
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
      case 'CreateParty':
        result = await this.createParty(ctx, payload, store);
        break;
      case 'UpdateParty':
        result = await this.updateParty(ctx, payload, store);
        break;
      case 'DeactivateParty':
        result = await this.deactivateParty(ctx, payload, store);
        break;
      case 'ReactivateParty':
        result = await this.reactivateParty(ctx, payload, store);
        break;
      case 'AssignPartyRole':
        result = await this.assignPartyRole(ctx, payload, store);
        break;
      case 'EndPartyRole':
        result = await this.endPartyRole(ctx, payload, store);
        break;
      case 'UpdateContact':
        result = await this.updateContact(ctx, payload, store);
        break;
      case 'UpdateFiscalIdentity':
        result = await this.updateFiscalIdentity(ctx, payload, store);
        break;
      case 'CreateLead':
        result = await this.createLead(ctx, payload, store);
        break;
      case 'ResolveLead':
        result = await this.resolveLead(ctx, payload, store);
        break;
      case 'RequestPartyMerge':
        result = await this.requestPartyMerge(ctx, payload, store);
        break;
      case 'ApprovePartyMerge':
        result = await this.approvePartyMerge(ctx, payload, store);
        break;
      case 'RejectPartyMerge':
        result = await this.rejectPartyMerge(ctx, payload, store);
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
    store: OsPartyStore,
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
      capabilityKey: 'partygraph',
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
    store: OsPartyStore,
    orgId: string,
    partyId: string,
  ): Promise<PartyRecord> {
    const party = await store.getPartyInOrg(orgId, partyId);
    if (!party) throw new Error('NOT_FOUND');
    if (party.status === 'merged') throw new Error('VALIDATION_FAILED');
    return party;
  }

  private async suggestDuplicateByNit(
    store: OsPartyStore,
    ctx: RequestContext,
    partyId: string,
    nit: string,
  ): Promise<void> {
    const match = await store.findActiveFiscalByNit(ctx.organizationId, nit, partyId);
    if (!match) return;
    const candidateId = createId();
    const [partyIdA, partyIdB] = partyId < match.partyId ? [partyId, match.partyId] : [match.partyId, partyId];
    await store.upsertDuplicateCandidate({
      id: candidateId,
      organizationId: ctx.organizationId,
      partyIdA,
      partyIdB,
      matchReason: 'fiscal_nit_exact',
      confidence: 1,
      status: 'suggested',
    });
    await this.emit(ctx, store, 'party.duplicate.suggested', 'party', partyId, {
      partyIdA,
      partyIdB,
      matchReason: 'fiscal_nit_exact',
      candidateId,
    });
  }

  /** Account owner is explicit: the creating seller, an assigned member, or nobody (steward data entry). */
  private async maybeCreateCommercialAccount(
    store: OsPartyStore,
    ctx: RequestContext,
    partyId: string,
    roleKey: string,
    ownerMemberId: string | null,
  ): Promise<CommercialAccountRecord | null> {
    if (roleKey !== 'customer') return null;
    const existing = await store.getCommercialAccountForParty(ctx.organizationId, partyId);
    if (existing) return existing;
    const account: CommercialAccountRecord = {
      id: createId(),
      organizationId: ctx.organizationId,
      partyId,
      territoryId: null,
      ownerMemberId,
      status: 'active',
      version: 0,
    };
    await store.insertCommercialAccount(account);
    return account;
  }

  /**
   * Initial account owner. Holding commercial.customer.create makes the creator
   * the default owner (V2 §5.4 "Responsable default actor para asesor").
   * Naming another member allocates an unassigned account: commercial.account.reassign
   * plus organization-wide or intake assignment scope (resolveAccountAssignmentAuthority).
   * master_data.admin alone never makes the steward an owner.
   */
  private async resolveInitialAccountOwner(
    ctx: RequestContext,
    store: OsPartyStore,
    scopes: readonly string[],
    requested: unknown,
  ): Promise<string | null> {
    const seller = scopes.includes(COMMERCIAL_CUSTOMER_CREATE_SCOPE);
    if (requested == null || requested === '') return seller ? ctx.actorMemberId : null;
    const ownerMemberId = String(requested);
    if (ownerMemberId === ctx.actorMemberId) {
      if (!seller) throw new Error('PERMISSION_DENIED');
      return ownerMemberId;
    }
    const authority = resolveAccountAssignmentAuthority({
      grantedScopes: scopes,
      currentOwnerMemberId: null,
      actorLeadsCurrentOwner: false,
      actorLeadsTarget: false,
    });
    if (!authority) throw new Error('PERMISSION_DENIED');
    const member = await store.getMemberInOrg(ctx.organizationId, ownerMemberId);
    if (!member || member.organizationId !== ctx.organizationId || member.accessStatus !== 'active') {
      throw new Error('VALIDATION_FAILED');
    }
    return ownerMemberId;
  }

  private async createParty(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const snap = await this.authorize(ctx, 'CreateParty', ctx.organizationId);
    const scopes = [...snap.roleKeys, ...snap.delegatedScopes];
    const steward = scopes.includes(MASTER_DATA_ADMIN_SCOPE);
    const partyKind = String(payload.partyKind) as PartyRecord['partyKind'];
    const displayName = String(payload.displayName).trim();
    const legalName = payload.legalName ? String(payload.legalName) : null;
    const fiscal = payload.fiscalIdentity as { nit: string; razonSocial: string } | undefined;
    let initialRoleKey = payload.initialRoleKey ? String(payload.initialRoleKey) : undefined;
    const contactInput = payload.contact as { givenName: string; familyName?: string } | undefined;
    const duplicateReason = payload.duplicateReason ? String(payload.duplicateReason).trim() : '';
    if (!displayName) throw new Error('VALIDATION_FAILED');

    let phone: string | null = null;
    if (payload.phone != null && String(payload.phone).trim()) {
      phone = normalizeBoliviaPhone(String(payload.phone));
      if (!/^\+\d{8,15}$/.test(phone)) throw new Error('VALIDATION_FAILED');
    }

    if (!steward) {
      // Bounded seller registration (V2 §5.4): a customer with contact data only.
      if (fiscal || legalName) throw new Error('VALIDATION_FAILED');
      if (initialRoleKey && initialRoleKey !== 'customer') throw new Error('VALIDATION_FAILED');
      initialRoleKey = 'customer';
      if (!phone && payload.noPhoneReason !== 'no_phone_available') throw new Error('VALIDATION_FAILED');
      if (partyKind === 'organization' && !contactInput?.givenName?.trim()) {
        throw new Error('VALIDATION_FAILED');
      }
    }

    const accountOwnerMemberId =
      initialRoleKey === 'customer'
        ? await this.resolveInitialAccountOwner(ctx, store, scopes, payload.accountOwnerMemberId)
        : null;
    if (initialRoleKey !== 'customer' && payload.accountOwnerMemberId) throw new Error('VALIDATION_FAILED');

    // A shared phone is never blocked and nothing merges. Matches need an explicit
    // reason ("Registrar otro cliente"); the response never names the matches.
    const phoneMatches = phone ? await store.listPartyIdsWithContactPhone(ctx.organizationId, phone) : [];
    if (phoneMatches.length > 0 && !duplicateReason) throw new Error('DUPLICATE_REVIEW_REQUIRED');

    const partyId = createId();
    const party: PartyRecord = {
      id: partyId,
      organizationId: ctx.organizationId,
      partyKind,
      displayName,
      legalName,
      status: 'active',
      mergedIntoPartyId: null,
      version: 0,
    };
    await store.insertParty(party);

    if (fiscal) {
      await store.insertFiscalIdentity({
        id: createId(),
        organizationId: ctx.organizationId,
        partyId,
        nit: fiscal.nit,
        razonSocial: fiscal.razonSocial,
        effectiveAt: ctx.effectiveAt,
        endedAt: null,
      });
      await this.suggestDuplicateByNit(store, ctx, partyId, fiscal.nit);
    }

    let roleAssignmentId: string | undefined;
    let commercialAccount: CommercialAccountRecord | null = null;
    if (initialRoleKey) {
      roleAssignmentId = createId();
      await store.insertPartyRoleAssignment({
        id: roleAssignmentId,
        organizationId: ctx.organizationId,
        partyId,
        roleKey: initialRoleKey as PartyRoleAssignmentRecord['roleKey'],
        effectiveAt: ctx.effectiveAt,
        endedAt: null,
      });
      commercialAccount = await this.maybeCreateCommercialAccount(
        store,
        ctx,
        partyId,
        initialRoleKey,
        accountOwnerMemberId,
      );
    }

    let contactId: string | undefined;
    if (phone || contactInput) {
      contactId = createId();
      await store.insertContact({
        id: contactId,
        organizationId: ctx.organizationId,
        organizationPartyId: partyId,
        personPartyId: null,
        givenName: contactInput?.givenName?.trim() || displayName,
        familyName: contactInput?.familyName?.trim() ?? '',
        email: null,
        phone,
        whatsapp: null,
        title: null,
        status: 'active',
        version: 0,
      });
    }

    const city = payload.city ? String(payload.city).trim() || null : null;
    const department = payload.department ? String(payload.department).trim() || null : null;
    const addressText = payload.addressReference ? String(payload.addressReference).trim() || null : null;
    let locationId: string | undefined;
    if (city || department || addressText) {
      locationId = createId();
      await store.insertLocation({
        id: locationId,
        organizationId: ctx.organizationId,
        partyId,
        label: 'Principal',
        addressText,
        latitude: null,
        longitude: null,
        provenanceUrl: null,
        city,
        department,
        status: 'active',
        version: 0,
        createdAt: ctx.effectiveAt,
        updatedAt: ctx.effectiveAt,
      });
    }

    for (const matchPartyId of phoneMatches) {
      const [partyIdA, partyIdB] = partyId < matchPartyId ? [partyId, matchPartyId] : [matchPartyId, partyId];
      await store.upsertDuplicateCandidate({
        id: createId(),
        organizationId: ctx.organizationId,
        partyIdA,
        partyIdB,
        matchReason: 'phone_shared',
        confidence: 0.5,
        status: 'suggested',
      });
    }

    return this.emit(ctx, store, 'party.created', 'party', partyId, {
      partyId,
      partyKind,
      displayName,
      legalName,
      fiscalIdentity: fiscal,
      initialRoleKey,
      roleAssignmentId,
      commercialAccountId: commercialAccount?.id,
      accountOwnerMemberId: commercialAccount?.ownerMemberId ?? null,
      contactId,
      locationId,
      duplicateReviewRequested: phoneMatches.length > 0,
      duplicateReason: phoneMatches.length > 0 ? duplicateReason : undefined,
    });
  }

  private async updateParty(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const partyId = String(payload.partyId);
    const snap = await this.authorize(ctx, 'UpdateParty', ctx.organizationId, partyId, store);
    const expectedVersion = Number(payload.expectedVersion);
    const before = await this.requireActiveParty(store, ctx.organizationId, partyId);
    // Legal/fiscal identity stays data-steward maintenance; commercial edit covers the commercial name.
    if (
      payload.legalName !== undefined &&
      ![...snap.roleKeys, ...snap.delegatedScopes].includes(MASTER_DATA_ADMIN_SCOPE)
    ) {
      throw new Error('VALIDATION_FAILED');
    }
    const displayName = payload.displayName !== undefined ? String(payload.displayName) : before.displayName;
    const legalName =
      payload.legalName !== undefined
        ? payload.legalName === null
          ? null
          : String(payload.legalName)
        : before.legalName;
    const changedFields = [
      ...(displayName !== before.displayName ? ['displayName'] : []),
      ...((legalName ?? null) !== (before.legalName ?? null) ? ['legalName'] : []),
    ];
    const changeKind = (payload.changeKind as PartyChangeKind | undefined) ?? 'update';
    const reason = typeof payload.changeReason === 'string' ? payload.changeReason.trim() : '';
    if (partyChangeNeedsReason({ changedFields, changeKind }) && !reason) throw new Error('VALIDATION_FAILED');
    const version = before.version + 1;

    await store.updateParty(partyId, { displayName, legalName, version }, expectedVersion);

    return this.emit(
      ctx,
      store,
      'party.updated',
      'party',
      partyId,
      {
        partyId,
        displayName,
        legalName,
        previousDisplayName: before.displayName,
        previousLegalName: before.legalName ?? null,
        changedFields: changedFields.join(','),
        changeKind,
        reason: reason || null,
        version,
        source: 'manual',
      },
      'party.updated',
      { displayName: before.displayName, legalName: before.legalName },
      { displayName, legalName },
    );
  }

  private async deactivateParty(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const partyId = String(payload.partyId);
    await this.authorize(ctx, 'DeactivateParty', ctx.organizationId, partyId, store);
    const before = await this.requireActiveParty(store, ctx.organizationId, partyId);
    await store.updateParty(partyId, { status: 'inactive', version: before.version + 1 }, before.version);
    return this.emit(ctx, store, 'party.deactivated', 'party', partyId, { partyId });
  }

  private async reactivateParty(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const partyId = String(payload.partyId);
    await this.authorize(ctx, 'ReactivateParty', ctx.organizationId, partyId, store);
    const party = await store.getPartyInOrg(ctx.organizationId, partyId);
    if (!party || party.status === 'merged') throw new Error('NOT_FOUND');
    await store.updateParty(partyId, { status: 'active', version: party.version + 1 }, party.version);
    return this.emit(ctx, store, 'party.reactivated', 'party', partyId, { partyId });
  }

  private async assignPartyRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'AssignPartyRole', ctx.organizationId);
    const partyId = String(payload.partyId);
    const roleKey = String(payload.roleKey);
    const effectiveAt = payload.effectiveAt ? new Date(String(payload.effectiveAt)) : ctx.effectiveAt;
    await this.requireActiveParty(store, ctx.organizationId, partyId);

    const roleAssignmentId = createId();
    await store.insertPartyRoleAssignment({
      id: roleAssignmentId,
      organizationId: ctx.organizationId,
      partyId,
      roleKey: roleKey as PartyRoleAssignmentRecord['roleKey'],
      effectiveAt,
      endedAt: null,
    });
    const commercialAccount = await this.maybeCreateCommercialAccount(store, ctx, partyId, roleKey, null);

    return this.emit(ctx, store, 'party.role.assigned', 'party_role_assignment', roleAssignmentId, {
      partyId,
      roleKey,
      roleAssignmentId,
      commercialAccountId: commercialAccount?.id,
    });
  }

  private async endPartyRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'EndPartyRole', ctx.organizationId);
    const roleAssignmentId = String(payload.roleAssignmentId);
    const assignment = await store.getPartyRoleAssignment(ctx.organizationId, roleAssignmentId);
    if (!assignment) throw new Error('NOT_FOUND');
    const endedAt = payload.endedAt ? new Date(String(payload.endedAt)) : ctx.effectiveAt;
    await store.endPartyRoleAssignment(roleAssignmentId, endedAt);
    return this.emit(ctx, store, 'party.role.ended', 'party_role_assignment', roleAssignmentId, {
      roleAssignmentId,
      partyId: assignment.partyId,
      roleKey: assignment.roleKey,
      endedAt: endedAt.toISOString(),
    });
  }

  private async updateContact(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const organizationPartyId = String(payload.organizationPartyId);
    await this.authorize(ctx, 'UpdateContact', ctx.organizationId, organizationPartyId, store);
    await this.requireActiveParty(store, ctx.organizationId, organizationPartyId);
    const party = await store.getPartyInOrg(ctx.organizationId, organizationPartyId);
    if (party?.partyKind !== 'organization') throw new Error('VALIDATION_FAILED');

    const contactId = payload.contactId ? String(payload.contactId) : createId();
    const givenName = String(payload.givenName);
    const familyName = String(payload.familyName);
    const email = payload.email ? String(payload.email) : null;
    const phone = payload.phone ? String(payload.phone) : null;
    const whatsapp = payload.whatsapp ? String(payload.whatsapp) : null;
    const title = payload.title ? String(payload.title) : null;
    const personPartyId = payload.personPartyId ? String(payload.personPartyId) : null;

    const existing = payload.contactId
      ? await store.getContactInOrg(ctx.organizationId, contactId)
      : null;
    // Authority was checked on organizationPartyId; a contact of another party is not reachable through it.
    if (existing && existing.organizationPartyId !== organizationPartyId) throw new Error('NOT_FOUND');

    if (existing) {
      await store.updateContact(
        contactId,
        { givenName, familyName, email, phone, whatsapp, title, personPartyId, version: existing.version + 1 },
        existing.version,
      );
    } else {
      const contact: ContactRecord = {
        id: contactId,
        organizationId: ctx.organizationId,
        organizationPartyId,
        personPartyId,
        givenName,
        familyName,
        email,
        phone,
        whatsapp,
        title,
        status: 'active',
        version: 0,
      };
      await store.insertContact(contact);
    }

    return this.emit(ctx, store, 'contact.updated', 'contact', contactId, {
      contactId,
      organizationPartyId,
      givenName,
      familyName,
      email,
      phone,
      whatsapp,
    });
  }

  private async updateFiscalIdentity(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'UpdateFiscalIdentity', ctx.organizationId);
    const partyId = String(payload.partyId);
    const nit = String(payload.nit);
    const razonSocial = String(payload.razonSocial);
    const effectiveAt = payload.effectiveAt ? new Date(String(payload.effectiveAt)) : ctx.effectiveAt;
    await this.requireActiveParty(store, ctx.organizationId, partyId);

    await store.endActiveFiscalIdentities(partyId, effectiveAt);
    const fiscalId = createId();
    await store.insertFiscalIdentity({
      id: fiscalId,
      organizationId: ctx.organizationId,
      partyId,
      nit,
      razonSocial,
      effectiveAt,
      endedAt: null,
    });
    await this.suggestDuplicateByNit(store, ctx, partyId, nit);

    return this.emit(ctx, store, 'party.fiscal_identity.changed', 'fiscal_identity', fiscalId, {
      partyId,
      nit,
      razonSocial,
      fiscalIdentityId: fiscalId,
    });
  }

  private async createLead(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'CreateLead', ctx.organizationId);
    const leadId = createId();
    await store.insertLead({
      id: leadId,
      organizationId: ctx.organizationId,
      displayName: String(payload.displayName),
      email: payload.email ? String(payload.email) : null,
      phone: payload.phone ? String(payload.phone) : null,
      status: 'open',
      resolvedPartyId: null,
      batchRef: payload.batchRef ? String(payload.batchRef) : null,
    });
    return this.emit(ctx, store, 'lead.created', 'lead', leadId, {
      leadId,
      displayName: String(payload.displayName),
    });
  }

  private async resolveLead(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ResolveLead', ctx.organizationId);
    const leadId = String(payload.leadId);
    const lead = await store.getLeadInOrg(ctx.organizationId, leadId);
    if (!lead || lead.status !== 'open') throw new Error('NOT_FOUND');

    const createResult = await this.createParty(
      ctx,
      {
        partyKind: payload.partyKind ?? 'organization',
        displayName: payload.displayName ?? lead.displayName,
        legalName: payload.legalName,
        initialRoleKey: payload.initialRoleKey,
      },
      store,
    );
    const actualPartyId = String(createResult.data.partyId);
    await store.resolveLead(leadId, actualPartyId);

    return this.emit(ctx, store, 'lead.resolved', 'lead', leadId, {
      leadId,
      resolvedPartyId: actualPartyId,
    });
  }

  private async requestPartyMerge(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RequestPartyMerge', ctx.organizationId);
    const sourcePartyId = String(payload.sourcePartyId);
    const targetPartyId = String(payload.targetPartyId);
    if (sourcePartyId === targetPartyId) throw new Error('VALIDATION_FAILED');

    const source = await this.requireActiveParty(store, ctx.organizationId, sourcePartyId);
    const target = await this.requireActiveParty(store, ctx.organizationId, targetPartyId);

    const mergeRequestId = createId();
    await store.insertMergeRequest({
      id: mergeRequestId,
      organizationId: ctx.organizationId,
      sourcePartyId,
      targetPartyId,
      status: 'pending',
      requestedByMemberId: ctx.actorMemberId,
      decidedByMemberId: null,
      lineageSnapshotJson: null,
      createdAt: ctx.effectiveAt,
      decidedAt: null,
    });

    return this.emit(ctx, store, 'party.merge.requested', 'party_merge_request', mergeRequestId, {
      mergeRequestId,
      sourcePartyId: source.id,
      targetPartyId: target.id,
    });
  }

  private async approvePartyMerge(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ApprovePartyMerge', ctx.organizationId);
    const mergeRequestId = String(payload.mergeRequestId);
    const request = await store.getMergeRequest(ctx.organizationId, mergeRequestId);
    if (!request || request.status !== 'pending') throw new Error('NOT_FOUND');

    const source = await this.requireActiveParty(store, ctx.organizationId, request.sourcePartyId);
    const target = await this.requireActiveParty(store, ctx.organizationId, request.targetPartyId);

    const sourceCommercial = await store.getCommercialAccountForParty(ctx.organizationId, source.id);
    const targetCommercial = await store.getCommercialAccountForParty(ctx.organizationId, target.id);
    if (sourceCommercial && targetCommercial) {
      throw new Error('VALIDATION_FAILED');
    }

    const lineage = {
      sourceParty: source,
      targetParty: target,
      sourceRoles: await store.listActivePartyRoles(ctx.organizationId, source.id, ctx.effectiveAt),
      targetRoles: await store.listActivePartyRoles(ctx.organizationId, target.id, ctx.effectiveAt),
      sourceContacts: (await store.listContactsForOrgParty(ctx.organizationId, source.id)).items,
      sourceFiscal: await store.listFiscalIdentitiesForParty(ctx.organizationId, source.id),
      sourceCommercialAccountId: sourceCommercial?.id ?? null,
    };

    const movedContacts = await store.reassignContactsOrgParty(
      ctx.organizationId,
      source.id,
      target.id,
    );

    if (sourceCommercial && !targetCommercial) {
      await store.reassignCommercialAccountParty(ctx.organizationId, source.id, target.id);
    }

    for (const role of lineage.sourceRoles) {
      if (!role.endedAt) {
        await store.endPartyRoleAssignment(role.id, ctx.effectiveAt);
        const exists = (await store.listActivePartyRoles(ctx.organizationId, target.id, ctx.effectiveAt))
          .some((r) => r.roleKey === role.roleKey);
        if (!exists) {
          await store.insertPartyRoleAssignment({
            id: createId(),
            organizationId: ctx.organizationId,
            partyId: target.id,
            roleKey: role.roleKey,
            effectiveAt: ctx.effectiveAt,
            endedAt: null,
          });
        }
      }
    }

    await store.updateParty(
      source.id,
      { status: 'merged', mergedIntoPartyId: target.id, version: source.version + 1 },
      source.version,
    );

    await store.updateMergeRequest(mergeRequestId, {
      status: 'approved',
      decidedByMemberId: ctx.actorMemberId,
      lineageSnapshotJson: { ...lineage, movedContacts },
      decidedAt: ctx.effectiveAt,
    });

    return this.emit(ctx, store, 'party.merged', 'party', target.id, {
      mergeRequestId,
      sourcePartyId: source.id,
      targetPartyId: target.id,
      mergedFromPartyId: source.id,
      lineageSnapshot: lineage,
      movedContacts,
    });
  }

  private async rejectPartyMerge(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RejectPartyMerge', ctx.organizationId);
    const mergeRequestId = String(payload.mergeRequestId);
    const request = await store.getMergeRequest(ctx.organizationId, mergeRequestId);
    if (!request || request.status !== 'pending') throw new Error('NOT_FOUND');

    await store.updateMergeRequest(mergeRequestId, {
      status: 'rejected',
      decidedByMemberId: ctx.actorMemberId,
      decidedAt: ctx.effectiveAt,
    });

    return this.emit(ctx, store, 'party.merge.rejected', 'party_merge_request', mergeRequestId, {
      mergeRequestId,
      sourcePartyId: request.sourcePartyId,
      targetPartyId: request.targetPartyId,
    });
  }
}
