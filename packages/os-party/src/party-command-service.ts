import {
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  CONTACT_PHONE_CHANGE_REASONS,
  CONTACT_PHONE_VERIFICATION_METHODS,
  MASTER_DATA_ADMIN_SCOPE,
  maskContactNumber,
  normalizeContactNumber,
  type ContactEndpointChannel,
  type ContactEndpointStatus,
  partyChangeNeedsReason,
  type ContactPhoneChangeReason,
  resolveAccountAssignmentAuthority,
  type PartyCommandName,
  type RequestContext,
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

    // A reveal result holds a full number: it is never stored for replay, and every request is audited.
    const replayKey = command === 'RevealContactEndpoint' ? undefined : idempotencyKey;
    if (replayKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, replayKey);
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
      case 'ChangeContactEndpoint':
        result = await this.changeContactEndpoint(ctx, payload, store);
        break;
      case 'RetireContactEndpoint':
        result = await this.retireContactEndpoint(ctx, payload, store);
        break;
      case 'RevealContactEndpoint':
        result = await this.revealContactEndpoint(ctx, payload, store);
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

      if (replayKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: replayKey,
          commandName: command,
          resultJson: sealReplay(result, replayBinding(ctx.actorMemberId, command, payload)),
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return result;
    }).catch((err: unknown) => {
      // A reused key on a reveal is refused rather than replayed: each reveal needs its own request.
      if (idempotencyKey && !replayKey && isIdempotencyConflict(err)) throw new Error('CONFLICT');
      return this.replayAfterConflict(ctx, command, payload, err, replayKey);
    });
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

    const enteredPhone = parseContactNumber(payload.phone);
    const phone = enteredPhone?.e164 ?? null;

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
        phoneDisplay: enteredPhone?.entered ?? null,
        phoneStatus: enteredPhone ? 'unverified' : null,
      });
      if (enteredPhone) {
        const status = await this.recordEndpointAssociation(ctx, store, partyId, contactId, 'phone', enteredPhone, null);
        if (status === 'identity_review') {
          const created = await store.getContactInOrg(ctx.organizationId, contactId);
          if (created) await store.updateContact(contactId, { phoneStatus: status, version: created.version }, created.version);
        }
      }
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
    // Legal/fiscal identity stays data-steward maintenance; an omitted or unchanged legal name needs no such authority.
    if (changedFields.includes('legalName') && !memberHasScope(snap, MASTER_DATA_ADMIN_SCOPE)) {
      throw new Error('PERMISSION_DENIED');
    }
    if (expectedVersion !== before.version) throw new Error('CONFLICT');
    if (changedFields.length === 0) {
      return {
        commandId: createId(),
        correlationId: ctx.correlationId,
        data: { partyId, unchanged: true, version: before.version },
      };
    }
    const reason = typeof payload.changeReason === 'string' ? payload.changeReason.trim() : '';
    if (partyChangeNeedsReason({ changedFields }) && !reason) throw new Error('VALIDATION_FAILED');
    const version = before.version + 1;

    await store.updateParty(partyId, { displayName, legalName, version }, expectedVersion);

    // The event carries the reason; the audit row carries before/after and the version. Both share the correlation id.
    const result = await this.emit(
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
        reason,
        version,
        source: 'manual',
      },
      'party.updated',
      { displayName: before.displayName, legalName: before.legalName, version: before.version },
      { displayName, legalName, version },
    );
    return {
      ...result,
      data: { eventId: result.data.eventId, partyId, unchanged: false, version, changedFields },
    };
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
    const title = payload.title ? String(payload.title) : null;
    const personPartyId = payload.personPartyId ? String(payload.personPartyId) : null;

    const existing = payload.contactId
      ? await store.getContactInOrg(ctx.organizationId, contactId)
      : null;
    // Authority was checked on organizationPartyId; a contact of another party is not reachable through it.
    if (existing && existing.organizationPartyId !== organizationPartyId) throw new Error('NOT_FOUND');
    // A2 §58 / T03 C5: an existing contact's numbers change only through ChangeContactEndpoint / RetireContactEndpoint.
    if (existing && (payload.phone !== undefined || payload.whatsapp !== undefined)) throw new Error('VALIDATION_FAILED');
    const enteredPhone = existing ? null : parseContactNumber(payload.phone);
    const enteredWhatsapp = existing ? null : parseContactNumber(payload.whatsapp);
    const phone = existing ? existing.phone : (enteredPhone?.e164 ?? null);
    const whatsapp = existing ? existing.whatsapp : (enteredWhatsapp?.e164 ?? null);

    if (existing) {
      await store.updateContact(
        contactId,
        { givenName, familyName, email, title, personPartyId, version: existing.version + 1 },
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
        phoneDisplay: enteredPhone?.entered ?? null,
        whatsappDisplay: enteredWhatsapp?.entered ?? null,
        phoneStatus: enteredPhone ? 'unverified' : null,
        whatsappStatus: enteredWhatsapp ? 'unverified' : null,
      };
      await store.insertContact(contact);
      const statuses: Partial<ContactRecord> = {};
      if (enteredPhone) {
        const s = await this.recordEndpointAssociation(ctx, store, organizationPartyId, contactId, 'phone', enteredPhone, null);
        if (s === 'identity_review') statuses.phoneStatus = s;
      }
      if (enteredWhatsapp) {
        const s = await this.recordEndpointAssociation(ctx, store, organizationPartyId, contactId, 'whatsapp', enteredWhatsapp, null);
        if (s === 'identity_review') statuses.whatsappStatus = s;
      }
      if (Object.keys(statuses).length > 0) await store.updateContact(contactId, { ...statuses, version: 0 }, 0);
    }

    return this.emit(ctx, store, 'contact.updated', 'contact', contactId, {
      contactId,
      organizationPartyId,
      givenName,
      familyName,
      email,
      phoneMasked: maskContactNumber(phone),
      whatsappMasked: maskContactNumber(whatsapp),
    });
  }

  /**
   * T03 C6/C7: records a dated association for a newly entered number. A number that was
   * associated with another customer before opens an identity review instead of being refused;
   * nothing about the earlier customer is returned. Never marks the number verified.
   */
  private async recordEndpointAssociation(
    ctx: RequestContext,
    store: OsPartyStore,
    partyId: string,
    contactId: string,
    channel: ContactEndpointChannel,
    entered: EnteredNumber,
    verificationMethod: string | null,
  ): Promise<ContactEndpointStatus> {
    const previous = await store.findEndedEndpointAssociationElsewhere({
      organizationId: ctx.organizationId,
      numberE164: entered.e164,
      excludePartyId: partyId,
    });
    const associationId = createId();
    await store.insertEndpointAssociation({
      id: associationId,
      organizationId: ctx.organizationId,
      partyId,
      contactId,
      channel,
      numberE164: entered.e164,
      country: entered.country,
      enteredText: entered.entered,
      startedAt: ctx.effectiveAt,
      endedAt: null,
      endReason: null,
      verificationMethod,
      recordedByMemberId: ctx.actorMemberId,
    });
    if (!previous) return 'unverified';
    await store.insertIdentityReview({
      id: createId(),
      organizationId: ctx.organizationId,
      partyId,
      contactId,
      channel,
      associationId,
      matchedAssociationId: previous.id,
      status: 'open',
      openedAt: ctx.effectiveAt,
      resolvedAt: null,
      resolvedByMemberId: null,
      verificationMethod: null,
      note: null,
    });
    return 'identity_review';
  }

  /** The customer's active contact for an endpoint command, with the reason rules shared by change and retire. */
  private async contactForEndpointCommand(
    ctx: RequestContext,
    command: 'ChangeContactEndpoint' | 'RetireContactEndpoint',
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ) {
    const partyId = String(payload.partyId);
    await this.authorize(ctx, command, ctx.organizationId, partyId, store);
    await this.requireActiveParty(store, ctx.organizationId, partyId);
    const contact = await store.getContactInOrg(ctx.organizationId, String(payload.contactId));
    if (!contact || contact.organizationPartyId !== partyId) throw new Error('NOT_FOUND');
    if (contact.status !== 'active') throw new Error('VALIDATION_FAILED');
    const channel = String(payload.channel) as ContactEndpointChannel;
    if (channel !== 'phone' && channel !== 'whatsapp') throw new Error('VALIDATION_FAILED');
    const reason = String(payload.reason) as ContactPhoneChangeReason;
    if (!(CONTACT_PHONE_CHANGE_REASONS as readonly string[]).includes(reason)) throw new Error('VALIDATION_FAILED');
    const reasonNote = typeof payload.reasonNote === 'string' ? payload.reasonNote.trim() : '';
    if (reason === 'other' && !reasonNote) throw new Error('VALIDATION_FAILED');
    return {
      partyId,
      contact,
      channel,
      reason,
      reasonNote: reasonNote || null,
      expectedVersion: Number(payload.expectedVersion),
    };
  }

  private async changeContactEndpoint(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const { partyId, contact, channel, reason, reasonNote, expectedVersion } = await this.contactForEndpointCommand(
      ctx,
      'ChangeContactEndpoint',
      payload,
      store,
    );
    const verificationMethod = String(payload.verificationMethod);
    if (!(CONTACT_PHONE_VERIFICATION_METHODS as readonly string[]).includes(verificationMethod)) {
      throw new Error('VALIDATION_FAILED');
    }
    const entered = parseContactNumber(payload.newNumber);
    if (!entered) throw new Error('VALIDATION_FAILED');
    const current = channel === 'phone' ? contact.phone : contact.whatsapp;
    if (entered.e164 === current) throw new Error('VALIDATION_FAILED');
    const whatsappFollows = channel === 'phone' && Boolean(contact.phone) && contact.whatsapp === contact.phone;
    const channels: ContactEndpointChannel[] = whatsappFollows ? ['phone', 'whatsapp'] : [channel];

    const patch: Partial<ContactRecord> = {};
    let identityReviewRequired = false;
    for (const ch of channels) {
      await store.endActiveEndpointAssociations({
        organizationId: ctx.organizationId,
        contactId: contact.id,
        channel: ch,
        endedAt: ctx.effectiveAt,
        endReason: `changed:${reason}`,
      });
      const status = await this.recordEndpointAssociation(ctx, store, partyId, contact.id, ch, entered, verificationMethod);
      identityReviewRequired ||= status === 'identity_review';
      if (ch === 'phone') {
        Object.assign(patch, {
          phone: entered.e164,
          phoneDisplay: entered.entered,
          phoneStatus: status,
          phoneRetiredAt: null,
          phoneRetiredReason: null,
        });
      } else {
        Object.assign(patch, {
          whatsapp: entered.e164,
          whatsappDisplay: entered.entered,
          whatsappStatus: status,
          whatsappRetiredAt: null,
          whatsappRetiredReason: null,
        });
      }
    }
    const version = contact.version + 1;
    await store.updateContact(contact.id, { ...patch, version }, expectedVersion);
    const evidenceNote = typeof payload.evidenceNote === 'string' ? payload.evidenceNote.trim() || null : null;
    const previousMasked = maskContactNumber(current);
    const numberMasked = maskContactNumber(entered.e164);
    return this.emit(
      ctx,
      store,
      'contact.endpoint.changed',
      'contact',
      contact.id,
      {
        partyId,
        contactId: contact.id,
        channel,
        previousMasked,
        numberMasked,
        whatsappFollows,
        identityReviewRequired,
        reason,
        reasonNote,
        verificationMethod,
        evidenceNote,
        version,
      },
      'contact.endpoint.changed',
      { channel, number: previousMasked },
      { channel, number: numberMasked, whatsappFollows },
    );
  }

  private async retireContactEndpoint(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const { partyId, contact, channel, reason, reasonNote, expectedVersion } = await this.contactForEndpointCommand(
      ctx,
      'RetireContactEndpoint',
      payload,
      store,
    );
    const current = channel === 'phone' ? contact.phone : contact.whatsapp;
    if (!current) throw new Error('VALIDATION_FAILED');
    const whatsappFollows = channel === 'phone' && contact.whatsapp === contact.phone;
    const channels: ContactEndpointChannel[] = whatsappFollows ? ['phone', 'whatsapp'] : [channel];
    const patch: Partial<ContactRecord> = {};
    for (const ch of channels) {
      await store.endActiveEndpointAssociations({
        organizationId: ctx.organizationId,
        contactId: contact.id,
        channel: ch,
        endedAt: ctx.effectiveAt,
        endReason: `retired:${reason}`,
      });
      if (ch === 'phone') {
        Object.assign(patch, {
          phone: null,
          phoneDisplay: null,
          phoneStatus: null,
          phoneRetiredAt: ctx.effectiveAt,
          phoneRetiredReason: reason,
        });
      } else {
        Object.assign(patch, {
          whatsapp: null,
          whatsappDisplay: null,
          whatsappStatus: null,
          whatsappRetiredAt: ctx.effectiveAt,
          whatsappRetiredReason: reason,
        });
      }
    }
    const version = contact.version + 1;
    await store.updateContact(contact.id, { ...patch, version }, expectedVersion);
    const retiredMasked = maskContactNumber(current);
    return this.emit(
      ctx,
      store,
      'contact.endpoint.retired',
      'contact',
      contact.id,
      {
        partyId,
        contactId: contact.id,
        channel,
        retiredMasked,
        whatsappFollows,
        reason,
        reasonNote,
        version,
      },
      'contact.endpoint.retired',
      { channel, number: retiredMasked },
      { channel, number: null, whatsappFollows },
    );
  }

  /**
   * T03 C6: one full number from this contact's own history. The event and audit record who,
   * which association and why, never the number. Not projected to any timeline.
   */
  private async revealContactEndpoint(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<CommandResult> {
    const partyId = String(payload.partyId);
    await this.authorize(ctx, 'RevealContactEndpoint', ctx.organizationId, partyId, store);
    const justification = typeof payload.justification === 'string' ? payload.justification.trim() : '';
    if (justification.length < 10 || justification.length > 500) throw new Error('VALIDATION_FAILED');
    const contact = await store.getContactInOrg(ctx.organizationId, String(payload.contactId));
    if (!contact || contact.organizationPartyId !== partyId) throw new Error('NOT_FOUND');
    const association = await store.getEndpointAssociation(ctx.organizationId, String(payload.associationId));
    if (!association || association.contactId !== contact.id || association.partyId !== partyId) {
      throw new Error('NOT_FOUND');
    }
    const result = await this.emit(
      ctx,
      store,
      'contact.endpoint.revealed',
      'contact',
      contact.id,
      { partyId, contactId: contact.id, associationId: association.id, channel: association.channel, justification },
      'contact.endpoint.revealed',
      undefined,
      { associationId: association.id, channel: association.channel, justification },
    );
    return { ...result, data: { eventId: result.data.eventId, associationId: association.id, number: association.numberE164 } };
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

/** Timeline-safe form of a number: only the last three digits. */
type EnteredNumber = { e164: string; country: string; entered: string };

/** T03 C5: the one number contract. Absent input is null; an invalid number is VALIDATION_FAILED. */
function parseContactNumber(raw: unknown): EnteredNumber | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') throw new Error('VALIDATION_FAILED');
  const { country, number } = raw as { country?: unknown; number?: unknown };
  if (typeof country !== 'string' || typeof number !== 'string') throw new Error('VALIDATION_FAILED');
  const e164 = normalizeContactNumber({ country, number });
  if (!e164) throw new Error('VALIDATION_FAILED');
  return { e164, country, entered: number.trim() };
}
