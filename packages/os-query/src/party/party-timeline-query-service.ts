import type { ListPartyTimelineQuery, PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import { isPartyTimelineEventType, OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { DirectReportLookup } from '../leadership/direct-reports';
import { canReadOwnedRecord } from '../leadership/leadership-visibility';
import type { QueryContext } from '../query-context';
import { assertQueryScope, assertQueryTenantResource } from '../query-context';
import type { PaginatedResult } from '../pagination';
import type { OsProjectionStorePort, StoredPartyTimelineEntry } from '../projection-store-port';
import { canViewApproval, canViewWork } from '../work/work-auth';

export type PartyTimelineQueryServiceDeps = {
  projectionStore: OsProjectionStorePort;
  encodeCursor: (occurredAt: string, entryId: string) => string;
  partyExists: (organizationId: string, partyId: string) => Promise<boolean>;
  /** Required for team-lead visibility. Missing lookup fails closed, as in the commercial reads. */
  directReports?: DirectReportLookup | null;
};

function toTimelineEntry(model: StoredPartyTimelineEntry): PartyTimelineEntryReadModel {
  return {
    entryId: model.entryId,
    organizationId: model.organizationId,
    partyId: model.partyId,
    eventType: model.eventType,
    occurredAt: model.occurredAt.toISOString(),
    actorMemberId: model.actorMemberId,
    correlationId: model.correlationId,
    primaryEntityType: model.primaryEntityType,
    primaryEntityId: model.primaryEntityId,
    facts: isPartyTimelineEventType(model.eventType) ? { ...model.factsJson } : {},
  };
}

/**
 * The timeline is a mixed feed. Entries are not stored with an owner, so the owner
 * is resolved at read time from the record the event is about (primaryEntityType /
 * primaryEntityId), using the same read models and the same primitive
 * (`canReadOwnedRecord`) as GET /quotes/:id, /orders/:id, /opportunities/:id and
 * /work-items/:id.
 *
 * Party-level (party./contact./lead.) and fulfilment events carry no commercial values and no ownership
 * facts, so they stay readable by any active member (unchanged behavior).
 * Everything else is shown only when the reader may read the owning record.
 * An entry whose owner cannot be determined (record missing, other tenant,
 * unexpected entity type, timeline event type with no classification) is
 * omitted: fail closed.
 *
 * An event type outside PARTY_TIMELINE_EVENT_TYPES cannot come from the projector
 * (it skips them, and extractTimelineFacts has no allowlist for them, so they never
 * carry facts). Such a row is returned as before but with its facts emptied.
 */
const OPEN_EVENT_PREFIXES = [
  'party.',
  'contact.',
  'lead.',
  'delivery_note.',
  'warehouse_exit.',
  'customer_delivery.',
  'finished_goods.',
  'customer_coverage.',
] as const;

const OWNED_ENTITY_BY_PREFIX = [
  ['opportunity.', 'opportunity'],
  ['quote.', 'quote'],
  ['order.', 'order'],
] as const;

export type TimelineEventClass =
  | 'open'
  | 'opportunity'
  | 'quote'
  | 'order'
  | 'commercial_account'
  | 'work'
  | 'approval'
  | 'unclassified';

export function classifyTimelineEventType(eventType: string): TimelineEventClass {
  if (OPEN_EVENT_PREFIXES.some((prefix) => eventType.startsWith(prefix))) return 'open';
  for (const [prefix, entityType] of OWNED_ENTITY_BY_PREFIX) {
    if (eventType.startsWith(prefix)) return entityType;
  }
  if (eventType.startsWith('commercial_account.')) return 'commercial_account';
  if (eventType.startsWith('work.') || eventType.startsWith('task.')) return 'work';
  if (eventType.startsWith('approval.')) return 'approval';
  return 'unclassified';
}

class TimelineVisibility {
  private readonly cache = new Map<string, Promise<unknown>>();
  private readonly reportsCache = new Map<string, Promise<string[]>>();
  private readonly lookup: DirectReportLookup | null;

  constructor(
    private readonly ctx: QueryContext,
    private readonly store: OsProjectionStorePort,
    lookup: DirectReportLookup | null,
  ) {
    // canReadOwnedRecord loads direct reports per call; memoize per request.
    this.lookup = lookup
      ? {
          listDirectReportMemberIds: (organizationId, managerMemberId, asOf) => {
            const key = `${organizationId}|${managerMemberId}`;
            let pending = this.reportsCache.get(key);
            if (!pending) {
              pending = lookup.listDirectReportMemberIds(organizationId, managerMemberId, asOf);
              this.reportsCache.set(key, pending);
            }
            return pending;
          },
        }
      : null;
  }

  private memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    let pending = this.cache.get(key);
    if (!pending) {
      pending = load();
      this.cache.set(key, pending);
    }
    return pending as Promise<T>;
  }

  private canReadOwner(organizationId: string, ownerMemberId: string): Promise<boolean> {
    return canReadOwnedRecord({
      ctx: this.ctx,
      organizationId,
      ownerMemberId,
      lookup: this.lookup,
    });
  }

  private async ownerOfCommercial(
    entityType: 'opportunity' | 'quote' | 'order',
    entityId: string,
  ): Promise<{ organizationId: string; ownerMemberId: string } | null> {
    const orgId = this.ctx.organizationId;
    return this.memo(`${entityType}:${entityId}`, async () => {
      if (entityType === 'opportunity') return this.store.getOpportunityReadModel(orgId, entityId);
      if (entityType === 'quote') return this.store.getQuoteReadModel(orgId, entityId);
      return this.store.getOrderReadModel(orgId, entityId);
    });
  }

  private async commercialRecordReadable(
    entityType: 'opportunity' | 'quote' | 'order',
    entityId: string,
  ): Promise<boolean> {
    const record = await this.ownerOfCommercial(entityType, entityId);
    if (!record) return false;
    return this.canReadOwner(record.organizationId, record.ownerMemberId);
  }

  async canSee(entry: StoredPartyTimelineEntry): Promise<boolean> {
    if (entry.organizationId !== this.ctx.organizationId) return false;
    const { eventType, primaryEntityType, primaryEntityId } = entry;
    const kind = classifyTimelineEventType(eventType);

    if (kind === 'open') return true;

    if (kind === 'opportunity' || kind === 'quote' || kind === 'order') {
      if (primaryEntityType !== kind) return false;
      return this.commercialRecordReadable(kind, primaryEntityId);
    }

    if (kind === 'commercial_account') {
      const owner = entry.factsJson.ownerMemberId;
      if (typeof owner !== 'string' || !owner) return false;
      return this.canReadOwner(entry.organizationId, owner);
    }

    if (kind === 'work') {
      if (primaryEntityType !== 'work_item') return false;
      return this.workReadable(primaryEntityId);
    }

    if (kind === 'approval') {
      if (primaryEntityType !== 'approval_request') return false;
      return this.approvalReadable(primaryEntityId);
    }

    // Not a projectable timeline type: no facts are ever stored for it (see above).
    return !isPartyTimelineEventType(eventType);
  }

  private async workReadable(workItemId: string): Promise<boolean> {
    const work = await this.memo(`work:${workItemId}`, () =>
      this.store.getWorkReadModel(this.ctx.organizationId, workItemId),
    );
    if (!work) return false;
    // Same predicate as WorkQueryService.getWorkSummary.
    return (
      canViewWork(this.ctx, work) ||
      (await this.canReadOwner(work.organizationId, work.ownerMemberId))
    );
  }

  private async approvalReadable(approvalRequestId: string): Promise<boolean> {
    const approval = await this.memo(`approval:${approvalRequestId}`, () =>
      this.store.getApprovalReadModel(this.ctx.organizationId, approvalRequestId),
    );
    if (!approval) return false;
    // Same predicate as ApprovalQueryService.getApproval ...
    if (canViewApproval(this.ctx, approval)) return true;
    // ... plus the owner/leadership of the quote or order being approved, matching
    // ApprovalQueryService.listSubjectApprovals.
    if (approval.subjectType === 'quote' || approval.subjectType === 'order') {
      return this.commercialRecordReadable(approval.subjectType, approval.subjectId);
    }
    return false;
  }
}

export class PartyTimelineQueryService {
  constructor(private readonly deps: PartyTimelineQueryServiceDeps) {}

  async listPartyTimeline(
    ctx: QueryContext,
    partyId: string,
    query: ListPartyTimelineQuery,
  ): Promise<PaginatedResult<PartyTimelineEntryReadModel> & { freshness: unknown }> {
    assertQueryScope(ctx, 'member_active');
    assertQueryTenantResource(ctx, ctx.organizationId);

    const exists = await this.deps.partyExists(ctx.organizationId, partyId);
    if (!exists) {
      throw new Error('NOT_FOUND');
    }

    const { items, hasMore } = await this.deps.projectionStore.listPartyTimelineEntries(
      ctx.organizationId,
      partyId,
      query,
    );

    const visibility = new TimelineVisibility(
      ctx,
      this.deps.projectionStore,
      this.deps.directReports ?? null,
    );
    const allowed = await Promise.all(items.map((item) => visibility.canSee(item)));
    const visible = items.filter((_, index) => allowed[index]);

    const limit = query.limit ?? 25;
    // Cursor follows the raw page, not the filtered one, so hidden rows never stall paging.
    const last = items.at(-1);
    const nextCursor =
      hasMore && last
        ? this.deps.encodeCursor(last.occurredAt.toISOString(), last.entryId)
        : null;

    const freshness =
      (await this.deps.projectionStore.getFreshness(
        ctx.organizationId,
        OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
      )) ?? {
        consumerKey: OS_PROJECTION_CONSUMER_KEYS.partyTimeline,
        organizationId: ctx.organizationId,
        lastSuccessAt: null,
        lastEventOccurredAt: null,
        pendingOutboxCount: 0,
        isStale: true,
        lastError: null,
        rebuiltAt: null,
      };

    return {
      items: visible.map(toTimelineEntry),
      meta: { nextCursor, limit, hasMore },
      freshness,
    };
  }
}

export function encodePartyTimelineCursor(occurredAt: string, entryId: string): string {
  return Buffer.from(JSON.stringify({ occurredAt, entryId }), 'utf8').toString('base64url');
}

export function decodePartyTimelineCursor(cursor: string): { occurredAt: string; entryId: string } {
  const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
    occurredAt: string;
    entryId: string;
  };
  return parsed;
}
