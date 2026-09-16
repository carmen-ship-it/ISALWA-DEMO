import type { WorkforceCommandName, RequestContext } from '@isalwa/os-contracts';
import { COMMAND_REQUIRED_SCOPES, isAdditionalAssignableScope } from '@isalwa/os-contracts';
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
import type { AuthProviderPort } from './auth-provider';
import { normalizeAuthEmail } from './auth-email';
import type { OsWorkforceStore } from './os-workforce-store';
import { runProviderSideEffectWithRetry } from './provider-side-effects';
import { collectTerminationImpact } from './termination-impact';

export type CommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

type ScheduledProviderEffect = {
  action: 'revoke_sessions' | 'revoke_credentials' | 'update_email';
  memberId: string;
  providerSubject: string;
  run: () => Promise<void>;
};

export class WorkforceCommandService {
  private activeIdempotencyKey?: string;

  constructor(
    private readonly store: OsWorkforceStore,
    private readonly authProvider: AuthProviderPort,
  ) {}

  private async snapshot(
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
        delegatorMemberId: d.delegatorMemberId,
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

  async execute(
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
        return existing.resultJson as unknown as CommandResult;
      }
    }

    if (!this.store.runInTransaction) {
      throw new Error('TRANSACTION_REQUIRED');
    }

    const postCommit: ScheduledProviderEffect[] = [];

    const result = await this.store.runInTransaction(async (store) => {
      this.activeIdempotencyKey = idempotencyKey;
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
          resultJson: commandResult as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 86400_000),
        });
      }

      return commandResult;
    });

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
      idempotencyKey: this.activeIdempotencyKey,
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

    await store.updateMember(memberId, {
      accessStatus: 'active',
      employmentStatus: 'active',
      employmentStartedAt: ctx.effectiveAt,
      version: member.version + 1,
    });

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

  private async changeRole(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'ChangeRole', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const roleKey = String(payload.roleKey);
    const effectiveAt = payload.effectiveAt ? new Date(String(payload.effectiveAt)) : ctx.effectiveAt;
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    // Primary-role replacement: ends every active assignment, including
    // additional permissions. Additive grants use GrantAdditionalRole.
    await store.endActiveRoleAssignments(memberId, effectiveAt);
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
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

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
    const effectiveAt = payload.effectiveAt ? new Date(String(payload.effectiveAt)) : ctx.effectiveAt;
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');
    const manager = await store.getMemberInOrg(ctx.organizationId, managerMemberId);
    if (!manager) throw new Error('NOT_FOUND');

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
    const scopes = payload.scopes as string[];
    const expiresAt = new Date(String(payload.expiresAt));
    if (expiresAt <= ctx.effectiveAt) throw new Error('VALIDATION_FAILED');
    const startsAt = payload.startsAt ? new Date(String(payload.startsAt)) : ctx.effectiveAt;
    const delegate = await store.getMemberInOrg(ctx.organizationId, delegateMemberId);
    if (!delegate) throw new Error('NOT_FOUND');

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

  private async suspendMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'SuspendMember', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');
    await store.updateMember(memberId, {
      accessStatus: 'suspended',
      version: member.version + 1,
    });

    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
    if (auth?.providerSubject) {
      this.scheduleProviderRevokeSessions(postCommit, memberId, auth.providerSubject);
    }

    return this.emit(ctx, 'member.suspended', 'organization_member', memberId, store, { memberId });
  }

  private async terminateMember(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsWorkforceStore,
    postCommit: ScheduledProviderEffect[],
  ): Promise<CommandResult> {
    await this.authorize(ctx, 'TerminateMember', ctx.organizationId, store);
    const memberId = String(payload.memberId);
    const member = await store.getMemberInOrg(ctx.organizationId, memberId);
    if (!member) throw new Error('NOT_FOUND');

    const impact = await collectTerminationImpact(
      store,
      ctx.organizationId,
      memberId,
      ctx.effectiveAt,
    );
    if (!impact.canTerminate) {
      // Same client-facing code as open-work gate; details via GET termination-impact.
      throw new Error('VALIDATION_FAILED');
    }

    await store.updateMember(memberId, {
      accessStatus: 'revoked',
      employmentStatus: 'terminated',
      employmentEndedAt: ctx.effectiveAt,
      version: member.version + 1,
    });

    const auth = await store.findAuthIdentityByPersonAndStatus(member.personId, 'active');
    if (auth?.providerSubject) {
      await store.updateAuthIdentity(auth.id, {
        status: 'revoked',
        revokedAt: ctx.effectiveAt,
      });
      this.scheduleProviderRevokeCredentials(postCommit, memberId, auth.providerSubject);
    }

    const reasonRaw = payload.reason;
    const reason =
      typeof reasonRaw === 'string' && reasonRaw.trim().length > 0 ? reasonRaw.trim() : undefined;
    const emitPayload: Record<string, unknown> = { memberId };
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
