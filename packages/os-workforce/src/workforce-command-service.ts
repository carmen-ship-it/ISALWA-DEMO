import type { WorkforceCommandName, RequestContext } from '@isalwa/os-contracts';
import {
  COMMAND_REQUIRED_SCOPES,
  classifyRoleKey,
  unresolvedOwnership,
  isAdditionalAssignableScope,
  isCommandReservedScope,
  isDelegableScope,
  isRecognizedPermissionScope,
  commercialReachKeys,
  reachBeyondGrantor,
  roleKeysThatConferAuthority,
} from '@isalwa/os-contracts';
import {
  assertMemberActive,
  assertTenantMatch,
  computeEffectiveScopes,
  memberHasGrantedScope,
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
import type { AuthProviderPort } from './auth-provider';
import { normalizeAuthEmail } from './auth-email';
import type { OsWorkforceStore } from './os-workforce-store';
import { runProviderSideEffectWithRetry } from './provider-side-effects';
import { collectTerminationImpact } from './termination-impact';
import {
  parseRevokeAdditionalRoleKeys,
  planRoleChange,
  RoleChangeRefused,
  type RoleChangePlan,
  type RoleChangePreviewResult,
  type RoleChangeRefusal,
} from './role-change-plan';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

const PROVIDER_EFFECT_EVENTS = new Set(['member.suspended', 'member.terminated', 'member.email.changed']);

type ScheduledProviderEffect = {
  action: 'revoke_sessions' | 'revoke_credentials' | 'update_email';
  memberId: string;
  providerSubject: string;
  run: () => Promise<void>;
};

type EndedCustomerCoverage = {
  grantId: string;
  customerPartyId: string;
  memberRole: 'primary_owner' | 'acting_advisor';
  /** Active primary owner who keeps the customer, or null when nobody does. */
  responsibleMemberId: string | null;
};

function unresolvedCustomers(ended: readonly EndedCustomerCoverage[]): string[] {
  return [...new Set(ended.filter((e) => e.responsibleMemberId === null).map((e) => e.customerPartyId))].sort();
}

export class WorkforceCommandService {
  constructor(
    private readonly store: OsWorkforceStore,
    private readonly authProvider: AuthProviderPort,
  ) {}

  /**
   * Role keys and delegated scopes both arrive in computeEffectiveScopes as
   * plain strings, so a job title (sales_rep) sits in the same set as a real
   * scope. Only recognized permission definitions leave this method: a title or
   * an unknown string can never satisfy memberHasScope. `delegations: false`
   * answers "what does this member hold in their own right", which is what
   * grant authority is checked against.
   */
  private async snapshot(
    organizationId: string,
    memberId: string,
    asOf: Date,
    options: { delegations: boolean } = { delegations: true },
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.store.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.store.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = options.delegations
      ? await this.store.listDelegationsForDelegate(memberId, organizationId)
      : [];
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
        delegatorMemberId: d.delegatorMemberId,
        organizationId: d.organizationId,
        delegator: d.delegator,
      })),
      asOf,
    );
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: roleKeysThatConferAuthority(effectiveScopes),
      delegatedScopes: [],
    };
  }

  private async authorize(
    ctx: RequestContext,
    command: WorkforceCommandName,
    targetOrgId: string,
    store: OsWorkforceStore = this.store,
  ): Promise<void> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshot(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    const required = COMMAND_REQUIRED_SCOPES[command];
    if (required === 'member_active') return;
    if (!required || !memberHasScope(snap, required)) throw new Error('PERMISSION_DENIED');
    void store;
  }

  /**
   * OsPerson has no organization column and os_auth_identities is keyed by
   * person, so one login can serve memberships in several organizations. An
   * org-scoped admin must not reach a login that another organization also
   * depends on.
   */
  private async personBelongsToAnotherOrg(
    personId: string,
    organizationId: string,
    store: OsWorkforceStore,
  ): Promise<boolean> {
    const memberships = await store.listMembersForPerson(personId);
    return memberships.some((member) => member.organizationId !== organizationId);
  }

  private async assertPersonOnlyBelongsToOrg(
    personId: string,
    organizationId: string,
    store: OsWorkforceStore,
  ): Promise<void> {
    if (await this.personBelongsToAnotherOrg(personId, organizationId, store)) {
      throw new Error('PERMISSION_DENIED');
    }
  }

  /**
   * A delegated scope is a real grant, so delegation is closed by default.
   * A scope may be delegated only when all of these hold:
   *   1. it is a recognized permission definition (an unknown string is never a grant);
   *   2. it is not a reserved technical or QA scope;
   *   3. it is on the explicit DELEGABLE_SCOPE_KEYS allowlist (a scope that is
   *      merely absent from a denylist is not delegable);
   *   4. the delegator holds it in their own right, through their own role
   *      assignment. A scope received by delegation is not held, so a delegate
   *      cannot pass it on.
   */
  private async assertScopesDelegable(
    ctx: RequestContext,
    scopes: unknown,
    store: OsWorkforceStore,
  ): Promise<string[]> {
    if (!Array.isArray(scopes) || scopes.length === 0) throw new Error('VALIDATION_FAILED');
    if (!scopes.every((scope): scope is string => typeof scope === 'string')) {
      throw new Error('VALIDATION_FAILED');
    }
    for (const scope of scopes) {
      if (isCommandReservedScope(scope)) throw new Error('PERMISSION_DENIED');
      if (!isRecognizedPermissionScope(scope)) throw new Error('VALIDATION_FAILED');
      if (!isDelegableScope(scope)) throw new Error('PERMISSION_DENIED');
    }
    const held = await this.snapshot(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt, {
      delegations: false,
    });
    if (!held) throw new Error('PERMISSION_DENIED');
    for (const scope of scopes) {
      if (!memberHasGrantedScope(held, scope)) throw new Error('PERMISSION_DENIED');
    }
    void store;
    return scopes;
  }

  /**
   * A role key is either a job title or a recognized permission definition.
   * - Job titles (sales_rep) are stored as labels and confer nothing: the
   *   authorization snapshot drops every key that is not a recognized scope.
   * - Technical and QA scopes are provisioned out of band, never here.
   * - Any other string (for example an unknown dotted string that looks like a
   *   permission but is not one) is rejected, so a future privileged scope
   *   cannot be stored as a "title" and become a grant later.
   * - A recognized authority scope may be assigned only when the actor holds
   *   that scope through their own role assignment (`delegations: false`).
   *   A scope received only by delegation does not count. The rule is the
   *   same when the target is the actor, another member, or a new invite.
   */
  private async assertRoleKeyAssignable(
    ctx: RequestContext,
    roleKey: string,
    _targetMemberId: string | null,
    store: OsWorkforceStore,
  ): Promise<void> {
    const kind = classifyRoleKey(roleKey);
    if (kind === 'reserved') throw new Error('PERMISSION_DENIED');
    if (kind === 'invalid') throw new Error('VALIDATION_FAILED');
    if (kind === 'job_title') return;
    const snap = await this.snapshot(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt, {
      delegations: false,
    });
    if (!snap || !memberHasGrantedScope(snap, roleKey)) throw new Error('PERMISSION_DENIED');
    void store;
  }

  /**
   * Holding a scope does not authorize handing out wider resource range. A grant, a
   * role change or a manager change must not give the target any commercial reach
   * (action x org/direct report/intake) that the grantor does not hold by their own
   * role assignments and direct reports. Reductions are not checked.
   */
  private async assertReachWithinGrantor(
    ctx: RequestContext,
    targetMemberId: string,
    change: { roleKeys?: readonly string[]; addDirectReport?: string },
    store: OsWorkforceStore,
  ): Promise<void> {
    const asOf = ctx.effectiveAt;
    const reportsOf = async (memberId: string) =>
      (await store.listActiveDirectReportAssignments(ctx.organizationId, memberId, asOf)).map((row) => row.memberId);
    const ownScopes = async (memberId: string) =>
      computeEffectiveScopes(await store.listRoleAssignmentsForMember(memberId, ctx.organizationId), [], asOf);

    const targetScopes = await ownScopes(targetMemberId);
    const targetReports = await reportsOf(targetMemberId);
    const before = commercialReachKeys(targetScopes, targetReports);
    const after = commercialReachKeys(
      change.roleKeys ?? targetScopes,
      change.addDirectReport ? [...targetReports, change.addDirectReport] : targetReports,
    );
    const grantor = await this.snapshot(ctx.organizationId, ctx.actorMemberId, asOf, { delegations: false });
    if (!grantor || grantor.accessStatus !== 'active') throw new Error('PERMISSION_DENIED');
    const grantorReach = commercialReachKeys(grantor.roleKeys, await reportsOf(ctx.actorMemberId));
    if (reachBeyondGrantor(before, after, grantorReach).length > 0) throw new Error('PERMISSION_DENIED');
  }

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: WorkforceCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<CommandResult> {
    await this.authorize(ctx, command, ctx.organizationId);
    return openReplay<CommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: WorkforceCommandName,
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
    command: WorkforceCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
    command: WorkforceCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<CommandResult> {
    const actor = await this.store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!actor) {
      throw new Error('TENANT_FORBIDDEN');
    }

    if (idempotencyKey) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) {
        return this.acceptedReplay(ctx, command, payload, existing.resultJson);
      }
    }

    if (!this.store.runInTransaction) {
      throw new Error('TRANSACTION_REQUIRED');
    }

    const postCommit: ScheduledProviderEffect[] = [];

    // Set when a concurrent request with the same key committed first. Its provider
    // effects already ran, so this request must not run them again.
    let lostRace = false;
    const result = await this.store.runInTransaction(async (store) => {
      let commandResult: CommandResult;
      switch (command) {
      case 'InviteMember':
        commandResult = await this.inviteMember(ctx, payload, store);
        break;
      case 'ActivateMember':
        commandResult = await this.activateMember(ctx, payload, store);
        break;
      case 'RequestMemberEmailChange':
        commandResult = await this.requestMemberEmailChange(ctx, payload, store);
        break;
      case 'ChangeMemberEmail':
        commandResult = await this.changeMemberEmail(ctx, payload, store, postCommit);
        break;
      case 'ChangeDepartment':
        commandResult = await this.changeDepartment(ctx, payload, store);
        break;
      case 'ChangeRole':
        commandResult = await this.changeRole(ctx, payload, store);
        break;
      case 'GrantAdditionalRole':
        commandResult = await this.grantAdditionalRole(ctx, payload, store);
        break;
      case 'EndAdditionalRole':
        commandResult = await this.endAdditionalRole(ctx, payload, store);
        break;
      case 'ChangeManager':
        commandResult = await this.changeManager(ctx, payload, store);
        break;
      case 'GrantDelegation':
        commandResult = await this.grantDelegation(ctx, payload, store);
        break;
      case 'RevokeDelegation':
        commandResult = await this.revokeDelegation(ctx, payload, store);
        break;
      case 'SuspendMember':
        commandResult = await this.suspendMember(ctx, payload, store, postCommit);
        break;
      case 'TerminateMember':
        commandResult = await this.terminateMember(ctx, payload, store, postCommit);
        break;
      case 'RehireMember':
        commandResult = await this.rehireMember(ctx, payload, store);
        break;
      case 'RetryAuthProviderSync':
        commandResult = await this.retryAuthProviderSync(ctx, payload, store);
        break;
      default:
        throw new Error('VALIDATION_FAILED');
      }

      if (idempotencyKey) {
        await store.saveIdempotency({
          organizationId: ctx.organizationId,
          key: idempotencyKey,
          commandName: command,
          resultJson: sealReplay(commandResult, replayBinding(ctx.actorMemberId, command, payload)),
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return commandResult;
    }).catch(async (err: unknown) => {
      const winner = await this.replayAfterConflict(ctx, command, payload, err, idempotencyKey);
      lostRace = true;
      return winner;
    });
    if (lostRace) return result;

    await this.runScheduledProviderEffects(ctx, postCommit);

    return result;
  }

  private async runScheduledProviderEffects(
    ctx: RequestContext,
    effects: ScheduledProviderEffect[],
  ): Promise<void> {
    for (const effect of effects) {
      const outcome = await runProviderSideEffectWithRetry(effect.run);
      if (outcome.ok) continue;
      await this.store.appendStandaloneAudit(
        buildAuditEntry(
          ctx.organizationId,
          ctx.actorMemberId,
          'auth.provider.side_effect_failed',
          'organization_member',
          effect.memberId,
          ctx.correlationId,
          undefined,
          {
            action: effect.action,
            providerSubject: effect.providerSubject,
            error: outcome.error,
            attempts: outcome.attempts,
          },
        ),
      );
    }
  }

  /**
   * Durable side of the provider effects above. The member event is committed in the
   * same transaction as the access change, so the outbox redelivers it after a crash
   * or a provider failure. Each delivery converges the provider to the identity's
   * current state instead of replaying the event's values, so a late delivery can
   * neither restore an older email nor revoke access that was restored since.
   * Throwing leaves the message to the outbox retry and dead-letter path.
   */
  async reconcileProviderEffect(event: {
    organizationId: string;
    eventType: string;
    primaryEntityType: string;
    primaryEntityId: string;
  }): Promise<void> {
    if (!PROVIDER_EFFECT_EVENTS.has(event.eventType)) return;
    if (event.primaryEntityType !== 'organization_member') return;
    const memberId = event.primaryEntityId;
    const member = memberId ? await this.store.getMemberInOrg(event.organizationId, memberId) : null;
    if (!member) return;
    // Same rule as the command: the login is person-wide, so it is left alone while
    // another organization still depends on it.
    const sharedLogin = () =>
      this.personBelongsToAnotherOrg(member.personId, event.organizationId, this.store);
    switch (event.eventType) {
      case 'member.suspended': {
        if (member.accessStatus !== 'suspended' || (await sharedLogin())) return;
        const auth = await this.store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
        if (auth?.providerSubject) await this.authProvider.revokeSessions(auth.providerSubject);
        return;
      }
      case 'member.terminated': {
        if (member.accessStatus !== 'revoked' || (await sharedLogin())) return;
        const auth = await this.store.findAuthIdentityByPersonAndStatus(member.personId, 'revoked');
        if (auth?.providerSubject) await this.authProvider.revokeCredentials(auth.providerSubject);
        return;
      }
      case 'member.email.changed': {
        const auth = await this.store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
        if (auth?.providerSubject && auth.email) {
          await this.authProvider.updateEmail(auth.providerSubject, auth.email);
        }
        return;
      }
    }
  }

  private scheduleProviderRevokeSessions(
    postCommit: ScheduledProviderEffect[],
    memberId: string,
    providerSubject: string,
  ): void {
    postCommit.push({
      action: 'revoke_sessions',
      memberId,
      providerSubject,
      run: async () => {
        await this.authProvider.revokeSessions(providerSubject);
      },
    });
  }

  private scheduleProviderRevokeCredentials(
    postCommit: ScheduledProviderEffect[],
    memberId: string,
    providerSubject: string,
  ): void {
    postCommit.push({
      action: 'revoke_credentials',
      memberId,
      providerSubject,
      run: async () => {
        await this.authProvider.revokeCredentials(providerSubject);
      },
    });
  }

  private async findAuthIdentityForProviderSync(
    store: OsWorkforceStore,
    personId: string,
    accessStatus: string,
  ) {
    if (accessStatus === 'suspended') {
      return store.findAuthIdentityByPersonAndStatus(personId, 'active');
    }
    if (accessStatus === 'revoked') {
      return store.findAuthIdentityByPersonAndStatus(personId, 'revoked');
    }
    return null;
  }

  private async retryAuthProviderSync(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RetryAuthProviderSync', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    const auth = await this.findAuthIdentityForProviderSync(
      store,
      member.personId,
      member.accessStatus,
    );
    if (!auth?.providerSubject) throw new Error('VALIDATION_FAILED');

    if (member.accessStatus === 'suspended') {
      await this.authProvider.revokeSessions(auth.providerSubject);
    } else if (member.accessStatus === 'revoked') {
      await this.authProvider.revokeCredentials(auth.providerSubject);
    } else {
      throw new Error('VALIDATION_FAILED');
    }

    return this.emit(ctx, 'auth.provider.sync_completed', 'organization_member', memberId, store, {
      memberId,
      accessStatus: member.accessStatus,
      providerSubject: auth.providerSubject,
    });
  }

  private async emit(
    ctx: RequestContext,
    eventType: string,
    primaryType: string,
    primaryId: string,
    store: OsWorkforceStore,
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
      capabilityKey: 'workforce',
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
      data: { eventId: event.id, ...payload },
    };
  }

  private async inviteMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'InviteMember', ctx.organizationId, store);
    const email = normalizeAuthEmail(String(payload.email));
    const givenName = String(payload.givenName);
    const familyName = String(payload.familyName);
    const roleKey = String(payload.roleKey);
    await this.assertRoleKeyAssignable(ctx, roleKey, null, store);
    const departmentId = payload.departmentId ? String(payload.departmentId) : undefined;
    if (departmentId) {
      const department = await store.getDepartmentInOrg(ctx.organizationId, departmentId);
      if (!department) throw new Error('VALIDATION_FAILED');
    }

    const invite = await this.authProvider.createInvite(email);

    const personId = createId();
    await store.insertPerson({
      id: personId,
      givenName,
      familyName,
      version: 0,
    });

    const memberId = createId();
    await store.insertMember({
      id: memberId,
      organizationId: ctx.organizationId,
      personId,
      employmentStatus: 'pending_start',
      accessStatus: 'invited',
      employmentStartedAt: null,
      employmentEndedAt: null,
      version: 0,
    });

    const authId = createId();
    await store.insertAuthIdentity({
      id: authId,
      personId,
      provider: this.authProvider.name,
      providerSubject: invite.providerUserId?.trim() || null,
      email,
      status: 'invited',
      invitedAt: ctx.effectiveAt,
      activatedAt: null,
      revokedAt: null,
    });

    const effectiveAt = ctx.effectiveAt;
    await store.insertRoleAssignment({
      id: createId(),
      organizationId: ctx.organizationId,
      memberId,
      roleKey,
      effectiveAt,
      endedAt: null,
    });

    if (departmentId) {
      await store.insertDepartmentAssignment({
        id: createId(),
        organizationId: ctx.organizationId,
        memberId,
        departmentId,
        effectiveAt,
        endedAt: null,
      });
    }

    return this.emit(
      ctx,
      'member.invited',
      'organization_member',
      memberId,
      store,
      {
        memberId,
        personId,
        email,
        inviteRef: invite.inviteRef,
      },
    );
  }

  private async activateMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    const memberId = String(payload.memberId);
    const providerSubject = String(payload.providerSubject);
    await store.lockMemberForUpdate(ctx.organizationId, memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    if (member.accessStatus === 'revoked' || member.employmentStatus === 'terminated') {
      throw new Error('VALIDATION_FAILED');
    }

    if (member.accessStatus === 'suspended') {
      if (ctx.actorMemberId === memberId) {
        throw new Error('VALIDATION_FAILED');
      }
      await this.authorize(ctx, 'InviteMember', ctx.organizationId, store);
    } else if (member.accessStatus === 'invited') {
      if (ctx.actorMemberId !== memberId) {
        await this.authorize(ctx, 'InviteMember', ctx.organizationId, store);
      } else {
        assertTenantMatch(ctx.organizationId, member.organizationId);
      }
    } else {
      throw new Error('VALIDATION_FAILED');
    }

    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'invited');
    if (auth) {
      if (auth.providerSubject && auth.providerSubject !== providerSubject) {
        throw new Error('VALIDATION_FAILED');
      }
      const bound = await store.findAuthIdentityByProviderSubject(auth.provider, providerSubject);
      if (bound && bound.id !== auth.id) {
        throw new Error('VALIDATION_FAILED');
      }
    }

    const reinstated = member.accessStatus === 'suspended';
    await store.updateMember(memberId, {
      accessStatus: 'active',
      employmentStatus: 'active',
      employmentStartedAt: ctx.effectiveAt,
      version: member.version + 1,
    });
    // Authority from the previous lifecycle never carries into the new one,
    // including members suspended before suspension ended it.
    const endedDelegationIds = reinstated
      ? await this.endDelegationsForLifecycle(ctx, memberId, store)
      : [];
    const endedCustomerCoverage = reinstated
      ? await this.endCustomerCoverageForLifecycle(ctx, memberId, store, 'received')
      : [];

    if (auth) {
      await store.updateAuthIdentity(auth.id, {
        status: 'active',
        providerSubject,
        activatedAt: ctx.effectiveAt,
      });
    }

    return this.emit(ctx, 'member.activated', 'organization_member', memberId, store, {
      memberId,
      providerSubject,
      ...(reinstated ? { endedDelegationIds, endedCustomerCoverage } : {}),
    });
  }

  private async requestMemberEmailChange(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    const newEmail = String(payload.newEmail);
    const member = await store.getMemberInOrg(ctx.organizationId, ctx.actorMemberId);
    if (!member) throw new Error('NOT_FOUND');
    assertTenantMatch(ctx.organizationId, member.organizationId);
    assertMemberActive((await this.snapshot(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt))!);

    return this.emit(ctx, 'member.email.change_requested', 'organization_member', member.id, store, {
      memberId: member.id,
      newEmail,
    });
  }

  private async changeMemberEmail(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    const memberId = String(payload.memberId);
    const newEmail = String(payload.newEmail);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    if (ctx.actorMemberId !== memberId) {
      await this.authorize(ctx, 'ChangeRole', ctx.organizationId, store);
      // The person may sign in to another organization with this identity.
      await this.assertPersonOnlyBelongsToOrg(member.personId, ctx.organizationId, store);
    } else {
      assertTenantMatch(ctx.organizationId, member.organizationId);
      assertMemberActive((await this.snapshot(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt))!);
    }

    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
    if (!auth?.providerSubject) throw new Error('VALIDATION_FAILED');

    const before = { email: auth.email };
    await store.updateAuthIdentity(auth.id, { email: newEmail });

    postCommit.push({
      action: 'update_email',
      memberId,
      providerSubject: auth.providerSubject,
      run: async () => {
        await this.authProvider.updateEmail(auth.providerSubject!, newEmail);
      },
    });

    return this.emit(
      ctx,
      'member.email.changed',
      'organization_member',
      memberId,
      store,
      { newEmail },
      'member.email.changed',
      before,
      { email: newEmail },
    );
  }

  private async changeDepartment(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ChangeDepartment', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const departmentId = String(payload.departmentId);
    const effectiveAt = payload.effectiveAt ? new Date(String(payload.effectiveAt)) : ctx.effectiveAt;
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    // Org-scoped existence check — nonexistent and foreign-tenant IDs both
    // fail as VALIDATION_FAILED (no FK 500; no foreign-tenant existence leak).
    const department = await store.getDepartmentInOrg(ctx.organizationId, departmentId);
    if (!department) throw new Error('VALIDATION_FAILED');

    await store.endActiveDepartmentAssignments(memberId, effectiveAt);
    await store.insertDepartmentAssignment({
      id: createId(),
      organizationId: ctx.organizationId,
      memberId,
      departmentId,
      effectiveAt,
      endedAt: null,
    });

    return this.emit(ctx, 'member.department.changed', 'organization_member', memberId, store, {
      memberId,
      departmentId,
      effectiveAt: effectiveAt.toISOString(),
    });
  }

  /**
   * Every rule ChangeRole applies before writing, shared with the preview so a
   * predictable refusal is shown before confirmation. The command re-runs it in
   * its own transaction, so the preview grants nothing.
   */
  private async authorizeRoleChange(
    ctx: RequestContext,
    input: { memberId: string; roleKey: string; revokeAdditionalRoleKeys: unknown },
    store: OsWorkforceStore,
    validateRequest: () => void = () => {},
  ): Promise<RoleChangePlan> {
    const refuse = async <T>(refusal: RoleChangeRefusal, check: () => Promise<T>): Promise<T> => {
      try {
        return await check();
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        if (code === 'PERMISSION_DENIED' || code === 'VALIDATION_FAILED') throw new RoleChangeRefused(code, refusal);
        throw err;
      }
    };
    await refuse('not_authorized', () => this.authorize(ctx, 'ChangeRole', ctx.organizationId, store));
    validateRequest();
    const revokeAdditionalRoleKeys = parseRevokeAdditionalRoleKeys(input.revokeAdditionalRoleKeys);
    const member = await store.getMemberInOrg(ctx.organizationId, input.memberId);
    if (!member) throw new Error('NOT_FOUND');
    const kind = classifyRoleKey(input.roleKey);
    await refuse(kind === 'reserved' ? 'role_reserved' : kind === 'invalid' ? 'role_invalid' : 'scope_not_held', () =>
      this.assertRoleKeyAssignable(ctx, input.roleKey, input.memberId, store),
    );
    const plan = planRoleChange({
      memberId: input.memberId,
      assignments: await store.listRoleAssignmentsForMember(input.memberId, ctx.organizationId),
      roleKey: input.roleKey,
      revokeAdditionalRoleKeys,
      asOf: ctx.effectiveAt,
    });
    if (plan.revokedAdditionalRoleKeys.length > 0) {
      await refuse('cannot_end_additional', () => this.authorize(ctx, 'EndAdditionalRole', ctx.organizationId, store));
    }
    // Preserved additional grants count toward the resulting reach like any other.
    await refuse('reach_beyond_grantor', () =>
      this.assertReachWithinGrantor(
        ctx,
        input.memberId,
        { roleKeys: [input.roleKey, ...plan.preservedAdditionalRoleKeys] },
        store,
      ),
    );
    return plan;
  }

  /** Read-only: the plan ChangeRole would apply, or the reason it would be refused. */
  async previewRoleChange(
    ctx: RequestContext,
    input: { memberId: string; roleKey: string; revokeAdditionalRoleKeys: unknown },
  ): Promise<RoleChangePreviewResult> {
    try {
      return { allowed: true, ...(await this.authorizeRoleChange(ctx, input, this.store)) };
    } catch (err) {
      if (!(err instanceof RoleChangeRefused)) throw err;
      return { allowed: false, memberId: input.memberId, newPrimaryRoleKey: input.roleKey, refusal: err.refusal };
    }
  }

  private async changeRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    const memberId = String(payload.memberId);
    const roleKey = String(payload.roleKey);
    const plan = await this.authorizeRoleChange(
      ctx,
      { memberId, roleKey, revokeAdditionalRoleKeys: payload.revokeAdditionalRoleKeys },
      store,
      () => notBackdated(payload.effectiveAt, ctx.effectiveAt),
    );
    const effectiveAt = notBackdated(payload.effectiveAt, ctx.effectiveAt);

    // Replaces the primary role only. Additional permissions stay unless the
    // request names them for revocation.
    for (const key of [...plan.endedPrimaryRoleKeys, ...plan.revokedAdditionalRoleKeys]) {
      await store.endActiveRoleAssignmentsForKey(ctx.organizationId, memberId, key, effectiveAt);
    }
    await store.insertRoleAssignment({
      id: createId(),
      organizationId: ctx.organizationId,
      memberId,
      roleKey,
      effectiveAt,
      endedAt: null,
    });

    return this.emit(ctx, 'member.role.changed', 'organization_member', memberId, store, {
      memberId,
      roleKey,
      effectiveAt: effectiveAt.toISOString(),
      endedPrimaryRoleKeys: plan.endedPrimaryRoleKeys,
      preservedAdditionalRoleKeys: plan.preservedAdditionalRoleKeys,
      revokedAdditionalRoleKeys: plan.revokedAdditionalRoleKeys,
      scopesGained: plan.scopesGained,
      scopesLost: plan.scopesLost,
    });
  }

  private async grantAdditionalRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'GrantAdditionalRole', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const roleKey = String(payload.roleKey);
    if (!isAdditionalAssignableScope(roleKey)) throw new Error('VALIDATION_FAILED');
    // Granting to yourself only ever adds authority.
    if (memberId === ctx.actorMemberId) throw new Error('PERMISSION_DENIED');
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');
    await this.assertRoleKeyAssignable(ctx, roleKey, memberId, store);
    await this.assertReachWithinGrantor(
      ctx,
      memberId,
      {
        roleKeys: [
          ...computeEffectiveScopes(await store.listRoleAssignmentsForMember(memberId, ctx.organizationId), [], ctx.effectiveAt),
          roleKey,
        ],
      },
      store,
    );

    const existing = (
      await store.listRoleAssignmentsForMember(memberId, ctx.organizationId)
    ).find((assignment) => assignment.roleKey === roleKey && assignment.endedAt === null);
    if (existing) {
      return {
        commandId: existing.id,
        correlationId: ctx.correlationId,
        data: {
          assignmentId: existing.id,
          memberId,
          roleKey,
          alreadyAssigned: true,
        },
      };
    }

    const assignmentId = createId();
    await store.insertRoleAssignment({
      id: assignmentId,
      organizationId: ctx.organizationId,
      memberId,
      roleKey,
      effectiveAt: ctx.effectiveAt,
      endedAt: null,
    });

    return this.emit(ctx, 'member.additional_role.granted', 'role_assignment', assignmentId, store, {
      assignmentId,
      memberId,
      roleKey,
      grantedByMemberId: ctx.actorMemberId,
      effectiveAt: ctx.effectiveAt.toISOString(),
    });
  }

  private async endAdditionalRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'EndAdditionalRole', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const roleKey = String(payload.roleKey);
    if (!isAdditionalAssignableScope(roleKey)) throw new Error('VALIDATION_FAILED');
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    const assignmentIds = await store.endActiveRoleAssignmentsForKey(
      ctx.organizationId,
      memberId,
      roleKey,
      ctx.effectiveAt,
    );
    if (assignmentIds.length === 0) throw new Error('NOT_FOUND');

    return this.emit(
      ctx,
      'member.additional_role.ended',
      'role_assignment',
      assignmentIds[0] ?? memberId,
      store,
      {
        assignmentId: assignmentIds[0],
        assignmentIds,
        memberId,
        roleKey,
        revokedByMemberId: ctx.actorMemberId,
        endedAt: ctx.effectiveAt.toISOString(),
      },
    );
  }

  private async changeManager(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ChangeManager', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const managerMemberId = String(payload.managerMemberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');
    const manager = await store.getMemberInOrg(ctx.organizationId, managerMemberId);
    if (!manager) throw new Error('NOT_FOUND');
    if (managerMemberId === memberId) throw new Error('VALIDATION_FAILED');
    // A manager assignment is team range; appointing yourself would confer range on yourself.
    if (managerMemberId === ctx.actorMemberId) throw new Error('PERMISSION_DENIED');
    const effectiveAt = notBackdated(payload.effectiveAt, ctx.effectiveAt);
    // The new manager gains team range over this member under any commercial scope they hold.
    await this.assertReachWithinGrantor(ctx, managerMemberId, { addDirectReport: memberId }, store);

    await store.endActiveManagerAssignments(memberId, effectiveAt);
    await store.insertManagerAssignment({
      id: createId(),
      organizationId: ctx.organizationId,
      memberId,
      managerMemberId,
      effectiveAt,
      endedAt: null,
    });

    return this.emit(ctx, 'member.manager.changed', 'organization_member', memberId, store, {
      memberId,
      managerMemberId,
      effectiveAt: effectiveAt.toISOString(),
    });
  }

  private async grantDelegation(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'GrantDelegation', ctx.organizationId, store);
    const delegateMemberId = String(payload.delegateMemberId);
    // A delegation covers the delegator's own approvals, so delegating to
    // yourself only ever adds authority.
    if (delegateMemberId === ctx.actorMemberId) throw new Error('PERMISSION_DENIED');
    const scopes = await this.assertScopesDelegable(ctx, payload.scopes, store);
    const expiresAt = new Date(String(payload.expiresAt));
    if (expiresAt <= ctx.effectiveAt) throw new Error('VALIDATION_FAILED');
    const startsAt = payload.startsAt ? new Date(String(payload.startsAt)) : ctx.effectiveAt;
    await store.lockMemberForUpdate(ctx.organizationId, delegateMemberId);
    const delegate = await store.getMemberInOrg(ctx.organizationId, delegateMemberId);
    if (!delegate) throw new Error('NOT_FOUND');
    // Reinstatement ends every delegation held from the previous lifecycle, so
    // granting to a suspended or removed member would create one that never applies.
    if (delegate.accessStatus === 'suspended' || delegate.accessStatus === 'revoked') {
      throw new Error('VALIDATION_FAILED');
    }

    const delegationId = createId();
    await store.insertDelegation({
      id: delegationId,
      organizationId: ctx.organizationId,
      delegatorMemberId: ctx.actorMemberId,
      delegateMemberId,
      scopes,
      startsAt,
      expiresAt,
      revokedAt: null,
    });

    return this.emit(ctx, 'delegation.granted', 'delegation', delegationId, store, {
      delegationId,
      delegateMemberId,
      scopes,
      expiresAt: expiresAt.toISOString(),
    });
  }

  private async revokeDelegation(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RevokeDelegation', ctx.organizationId, store);
    const delegationId = String(payload.delegationId);
    const d = await store.findDelegation(ctx.organizationId, delegationId);
    if (!d) throw new Error('NOT_FOUND');
    await store.revokeDelegation(delegationId, ctx.effectiveAt);
    return this.emit(ctx, 'delegation.revoked', 'delegation', delegationId, store, { delegationId });
  }

  /**
   * Suspension and termination permanently end delegations issued by or granted
   * to the member, in the lifecycle transaction. Reinstatement never revives
   * them; access needs a fresh authorized grant. Use-time checks already deny
   * while the member is inactive, so a failure here cannot leave access.
   */
  private async endDelegationsForLifecycle(
    ctx: RequestContext,
    memberId: string,
    store: OsWorkforceStore,
  ): Promise<string[]> {
    const open = await store.listUnexpiredDelegationsInvolvingMember(
      ctx.organizationId,
      memberId,
      ctx.effectiveAt,
    );
    for (const delegation of open) {
      await store.revokeDelegation(delegation.id, ctx.effectiveAt);
    }
    return open.map((delegation) => delegation.id).sort();
  }

  /**
   * Suspension and termination end every unended customer coverage grant the
   * member issued (primary owner) or received (acting advisor), future-dated
   * ones included, in the lifecycle transaction. Rows are kept as history and
   * never revive; coverage after reinstatement needs a fresh authorized grant.
   * Responsibility returns to the primary owner only when that owner is
   * another active member; otherwise it is recorded as unresolved.
   * Reinstatement ends only received coverage: coverage issued for a suspended
   * owner's customers may be granted during the suspension and confers
   * nothing on the owner.
   */
  private async endCustomerCoverageForLifecycle(
    ctx: RequestContext,
    memberId: string,
    store: OsWorkforceStore,
    which: 'issued_and_received' | 'received' = 'issued_and_received',
  ): Promise<EndedCustomerCoverage[]> {
    const rows = (
      await store.listUnendedCustomerCoverageInvolvingMember(ctx.organizationId, memberId, ctx.effectiveAt)
    ).filter((row) => which === 'issued_and_received' || row.actingAdvisorMemberId === memberId);
    const ended = new Map<string, EndedCustomerCoverage>();
    for (const row of rows) {
      if (ended.has(row.id)) continue;
      const issued = row.primaryOwnerMemberId === memberId;
      let responsibleMemberId: string | null = null;
      if (!issued) {
        const owner = await store.getMemberInOrg(ctx.organizationId, row.primaryOwnerMemberId);
        if (owner && owner.accessStatus === 'active') responsibleMemberId = owner.id;
      }
      await store.revokeCustomerCoverageGrant(row.id, ctx.effectiveAt);
      ended.set(row.id, {
        grantId: row.id,
        customerPartyId: row.customerPartyId,
        memberRole: issued ? 'primary_owner' : 'acting_advisor',
        responsibleMemberId,
      });
    }
    return [...ended.values()].sort((a, b) => a.grantId.localeCompare(b.grantId));
  }

  private async suspendMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'SuspendMember', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    await store.lockMemberForUpdate(ctx.organizationId, memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    // Open ownership never delays suspension; it is recorded and stays for reassignment.
    const impact = await collectTerminationImpact(
      store,
      ctx.organizationId,
      memberId,
      ctx.effectiveAt,
    );
    const unresolved = unresolvedOwnership(impact.categories);

    await store.updateMember(memberId, {
      accessStatus: 'suspended',
      version: member.version + 1,
    });
    const endedDelegationIds = await this.endDelegationsForLifecycle(ctx, memberId, store);
    const endedCustomerCoverage = await this.endCustomerCoverageForLifecycle(ctx, memberId, store);
    const unresolvedCustomerPartyIds = unresolvedCustomers(endedCustomerCoverage);

    // Sessions are person-wide; suspending here must not sign the person out of
    // another organization. Suspended access is enforced on every request.
    const sharedLogin = await this.personBelongsToAnotherOrg(
      member.personId,
      ctx.organizationId,
      store,
    );
    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
    if (auth?.providerSubject && !sharedLogin) {
      this.scheduleProviderRevokeSessions(postCommit, memberId, auth.providerSubject);
    }

    return this.emit(ctx, 'member.suspended', 'organization_member', memberId, store, {
      memberId,
      endedDelegationIds,
      endedCustomerCoverage,
      unresolvedCustomerPartyIds,
      unresolvedOwnership: unresolved,
    });
  }

  private async terminateMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'TerminateMember', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    await store.lockMemberForUpdate(ctx.organizationId, memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    // Open ownership never delays termination; it is recorded and stays for reassignment.
    const impact = await collectTerminationImpact(
      store,
      ctx.organizationId,
      memberId,
      ctx.effectiveAt,
    );
    const unresolved = unresolvedOwnership(impact.categories);

    await store.updateMember(memberId, {
      accessStatus: 'revoked',
      employmentStatus: 'terminated',
      employmentEndedAt: ctx.effectiveAt,
      version: member.version + 1,
    });
    const endedDelegationIds = await this.endDelegationsForLifecycle(ctx, memberId, store);
    const endedCustomerCoverage = await this.endCustomerCoverageForLifecycle(ctx, memberId, store);
    const unresolvedCustomerPartyIds = unresolvedCustomers(endedCustomerCoverage);

    // Membership access above is revoked and enforced on every request. The
    // login itself is person-wide, so leave it alone when another organization
    // still depends on it.
    const sharedLogin = await this.personBelongsToAnotherOrg(
      member.personId,
      ctx.organizationId,
      store,
    );
    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
    if (auth?.providerSubject && !sharedLogin) {
      await store.updateAuthIdentity(auth.id, {
        status: 'revoked',
        revokedAt: ctx.effectiveAt,
      });
      this.scheduleProviderRevokeCredentials(postCommit, memberId, auth.providerSubject);
    }

    const reasonRaw = payload.reason;
    const reason =
      typeof reasonRaw === 'string' && reasonRaw.trim().length > 0 ? reasonRaw.trim() : undefined;
    const emitPayload: Record<string, unknown> = {
      memberId,
      endedDelegationIds,
      endedCustomerCoverage,
      unresolvedCustomerPartyIds,
      unresolvedOwnership: unresolved,
    };
    if (reason !== undefined) {
      emitPayload.reason = reason;
    }

    return this.emit(
      ctx,
      'member.terminated',
      'organization_member',
      memberId,
      store,
      emitPayload,
    );
  }

  private async rehireMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'RehireMember', ctx.organizationId, store);
    const personId = String(payload.personId);
    const email = String(payload.email);
    const roleKey = String(payload.roleKey);
    // OsPerson has no organization column. Prior membership in the session
    // organization is the tenant proof. Missing and foreign person ids both
    // have zero memberships here, so both are NOT_FOUND. Do not call getPerson.
    const priorMembers = await store.listMembersForPerson(personId, ctx.organizationId);
    if (priorMembers.length === 0) throw new Error('NOT_FOUND');
    // A new identity on this person would also unlock the organizations it
    // already belongs to, so rehire stays limited to persons only known here.
    await this.assertPersonOnlyBelongsToOrg(personId, ctx.organizationId, store);
    await this.assertRoleKeyAssignable(ctx, roleKey, null, store);

    const invite = await this.authProvider.createInvite(email);

    const memberId = createId();
    await store.insertMember({
      id: memberId,
      organizationId: ctx.organizationId,
      personId,
      employmentStatus: 'active',
      accessStatus: 'invited',
      employmentStartedAt: ctx.effectiveAt,
      employmentEndedAt: null,
      version: 0,
    });

    await store.insertAuthIdentity({
      id: createId(),
      personId,
      provider: this.authProvider.name,
      providerSubject: null,
      email,
      status: 'invited',
      invitedAt: ctx.effectiveAt,
      activatedAt: null,
      revokedAt: null,
    });

    await store.insertRoleAssignment({
      id: createId(),
      organizationId: ctx.organizationId,
      memberId,
      roleKey,
      effectiveAt: ctx.effectiveAt,
      endedAt: null,
    });

    return this.emit(ctx, 'employment.restarted', 'organization_member', memberId, store, {
      memberId,
      personId,
      email,
      inviteRef: invite.inviteRef,
    });
  }
}

/**
 * Grants and team assignments start now or later. A past effectiveAt would
 * retroactively widen authority; corrections need their own audited command.
 */
function notBackdated(raw: unknown, now: Date): Date {
  if (raw == null || raw === '') return now;
  const at = new Date(String(raw));
  if (Number.isNaN(at.getTime()) || at < now) throw new Error('VALIDATION_FAILED');
  return at;
}
