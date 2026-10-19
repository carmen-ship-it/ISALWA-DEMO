import type { LocationCommandName, LocationStatus, RequestContext } from '@isalwa/os-contracts';
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
import { createId } from '@isalwa/ts-utils';
import { assertPartyCommandAuthority } from './customer-authority';
import type { OsPartyStore } from './os-party-store';
import type { LocationRecord, PartyRecord } from './store-types';

export type LocationCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

export class LocationCommandService {
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
    command: LocationCommandName,
    targetOrgId: string,
    customerPartyId?: string | null,
    store: OsPartyStore = this.store,
  ): Promise<void> {
    assertTenantMatch(ctx.organizationId, targetOrgId);
    const snap = await this.snapshotInOrg(ctx.organizationId, ctx.actorMemberId, ctx.effectiveAt);
    if (!snap) throw new Error('AUTH_REQUIRED');
    assertMemberActive(snap);
    await assertPartyCommandAuthority({ store, ctx, snap, command, customerPartyId });
  }

  /** Customer behind a location command, read without revealing whether the id exists. */
  private async commandPartyId(
    store: OsPartyStore,
    ctx: RequestContext,
    command: LocationCommandName,
    payload: Record<string, unknown>,
  ): Promise<string | null> {
    if (command === 'CreateLocation') return typeof payload.partyId === 'string' ? payload.partyId : null;
    if (typeof payload.locationId !== 'string') return null;
    const location = await store.getLocationInOrg(ctx.organizationId, payload.locationId);
    return location && location.organizationId === ctx.organizationId ? location.partyId : null;
  }

  /**
   * S11: authorize the current actor for this command, then return the stored
   * result only for the same actor, command, and payload. Any mismatch is
   * CONFLICT without the stored body; a row without that binding is
   * REPLAY_REVIEW_REQUIRED and is not re-run.
   */
  private async acceptedReplay(
    ctx: RequestContext,
    command: LocationCommandName,
    payload: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Promise<LocationCommandResult> {
    await this.authorize(ctx, command, ctx.organizationId, await this.commandPartyId(this.store, ctx, command, payload));
    return openReplay<LocationCommandResult>(stored, replayBinding(ctx.actorMemberId, command, payload));
  }

  /** A concurrent request with the same key won the insert: replay its result under the same rules. */
  private async replayAfterConflict(
    ctx: RequestContext,
    command: LocationCommandName,
    payload: Record<string, unknown>,
    err: unknown,
    idempotencyKey?: string,
  ): Promise<LocationCommandResult> {
    if (idempotencyKey && isIdempotencyConflict(err)) {
      const existing = await this.store.findIdempotency(ctx.organizationId, idempotencyKey);
      if (existing) return this.acceptedReplay(ctx, command, payload, existing.resultJson);
    }
    throw err;
  }

  async execute(
    command: LocationCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<LocationCommandResult> {
    return withIdempotencyKey(idempotencyKey, () =>
      this.runCommand(command, ctx, payload, idempotencyKey),
    );
  }

  private async runCommand(
    command: LocationCommandName,
    ctx: RequestContext,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<LocationCommandResult> {
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
      let result: LocationCommandResult;
      switch (command) {
        case 'CreateLocation':
          result = await this.createLocation(ctx, payload, store);
          break;
        case 'UpdateLocation':
          result = await this.updateLocation(ctx, payload, store);
          break;
        case 'DeactivateLocation':
          result = await this.deactivateLocation(ctx, payload, store);
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
    primaryId: string,
    payload?: Record<string, unknown>,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): Promise<LocationCommandResult> {
    const event = buildBusinessEvent({
      organizationId: ctx.organizationId,
      eventType,
      occurredAt: ctx.effectiveAt,
      actorMemberId: ctx.actorMemberId,
      authorizationContext: { memberId: ctx.actorMemberId },
      primaryEntityType: 'location',
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
      eventType,
      'location',
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
    if (party.status !== 'active' || party.mergedIntoPartyId) {
      throw new Error('VALIDATION_FAILED');
    }
    return party;
  }

  private async requireLocation(
    store: OsPartyStore,
    orgId: string,
    locationId: string,
  ): Promise<LocationRecord> {
    const location = await store.getLocationInOrg(orgId, locationId);
    if (!location) throw new Error('NOT_FOUND');
    return location;
  }

  private async createLocation(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<LocationCommandResult> {
    await this.authorize(ctx, 'CreateLocation', ctx.organizationId, await this.commandPartyId(store, ctx, 'CreateLocation', payload), store);
    const partyId = String(payload.partyId);
    await this.requireActiveParty(store, ctx.organizationId, partyId);

    const now = ctx.effectiveAt;
    const locationId = createId();
    const latitude =
      payload.latitude === undefined || payload.latitude === null ? null : Number(payload.latitude);
    const longitude =
      payload.longitude === undefined || payload.longitude === null
        ? null
        : Number(payload.longitude);
    const location: LocationRecord = {
      id: locationId,
      organizationId: ctx.organizationId,
      partyId,
      label: String(payload.label),
      addressText: payload.addressText ? String(payload.addressText) : null,
      latitude,
      longitude,
      provenanceUrl: payload.provenanceUrl ? String(payload.provenanceUrl) : null,
      status: 'active',
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    await store.insertLocation(location);

    return this.emit(ctx, store, 'location.created', locationId, {
      locationId,
      partyId,
      label: location.label,
      addressText: location.addressText,
      latitude: location.latitude,
      longitude: location.longitude,
      provenanceUrl: location.provenanceUrl,
      status: location.status,
    });
  }

  private async updateLocation(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<LocationCommandResult> {
    await this.authorize(ctx, 'UpdateLocation', ctx.organizationId, await this.commandPartyId(store, ctx, 'UpdateLocation', payload), store);
    const locationId = String(payload.locationId);
    const expectedVersion = Number(payload.expectedVersion);
    const before = await this.requireLocation(store, ctx.organizationId, locationId);
    if (before.status !== 'active') throw new Error('VALIDATION_FAILED');

    const label = payload.label !== undefined ? String(payload.label) : before.label;
    const addressText =
      payload.addressText !== undefined
        ? payload.addressText === null
          ? null
          : String(payload.addressText)
        : before.addressText;
    const latitude =
      payload.latitude !== undefined
        ? payload.latitude === null
          ? null
          : Number(payload.latitude)
        : before.latitude;
    const longitude =
      payload.longitude !== undefined
        ? payload.longitude === null
          ? null
          : Number(payload.longitude)
        : before.longitude;
    const provenanceUrl =
      payload.provenanceUrl !== undefined
        ? payload.provenanceUrl === null
          ? null
          : String(payload.provenanceUrl)
        : before.provenanceUrl;

    await store.updateLocation(
      ctx.organizationId,
      locationId,
      {
        label,
        addressText,
        latitude,
        longitude,
        provenanceUrl,
        version: before.version + 1,
      },
      expectedVersion,
    );

    return this.emit(
      ctx,
      store,
      'location.updated',
      locationId,
      {
        locationId,
        partyId: before.partyId,
        label,
        addressText,
        latitude,
        longitude,
        provenanceUrl,
        changedFields: [
          ...(label !== before.label ? ['label'] : []),
          ...((addressText ?? null) !== (before.addressText ?? null) ? ['addressText'] : []),
          ...((latitude ?? null) !== (before.latitude ?? null) ? ['latitude'] : []),
          ...((longitude ?? null) !== (before.longitude ?? null) ? ['longitude'] : []),
          ...((provenanceUrl ?? null) !== (before.provenanceUrl ?? null) ? ['provenanceUrl'] : []),
        ].join(','),
        version: before.version + 1,
      },
      {
        label: before.label,
        addressText: before.addressText,
        latitude: before.latitude,
        longitude: before.longitude,
        provenanceUrl: before.provenanceUrl,
      },
      { label, addressText, latitude, longitude, provenanceUrl },
    );
  }

  private async deactivateLocation(
    ctx: RequestContext,
    payload: Record<string, unknown>,
    store: OsPartyStore,
  ): Promise<LocationCommandResult> {
    await this.authorize(ctx, 'DeactivateLocation', ctx.organizationId, await this.commandPartyId(store, ctx, 'DeactivateLocation', payload), store);
    const locationId = String(payload.locationId);
    const before = await this.requireLocation(store, ctx.organizationId, locationId);
    if (before.status !== 'active') throw new Error('VALIDATION_FAILED');

    const status: LocationStatus = 'inactive';
    await store.updateLocation(
      ctx.organizationId,
      locationId,
      { status, version: before.version + 1 },
      before.version,
    );

    return this.emit(
      ctx,
      store,
      'location.deactivated',
      locationId,
      { locationId, partyId: before.partyId, status },
      { status: before.status },
      { status },
    );
  }
}
