import {
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PRODUCTION_REVIEW_MEMBER_SCOPE,
  canEnterProduction,
  canRecordProduction,
  canReviewProduction,
  scopeImplies,
  scopesGrantedByCargoOrTitle,
} from '../../os-contracts/src/operations-scopes';
import { COMMERCIAL_TEAM_READ_SCOPE } from '../../os-contracts/src/scopes';
import type {
  ClassificationRecord,
  ConsumptionRecord,
  FinishedGoodsReceipt,
  LossRecord,
  ProcessRecord,
  QuemaProductLink,
  QuemaView,
} from '../../os-contracts/src/production-trace';
import { InMemoryProductionTraceStore, ProductionTraceError } from './store';

/**
 * Live database writes are not in this package. The store is in-memory.
 * Do not treat a passing test here as a hosted or Prisma write.
 */
export const PRODUCTION_LIVE_DB_WRITES = 'UNPROVEN' as const;

/** No review mutation exists. Review is not an entry grant. */
export const PRODUCTION_REVIEW_MUTATION = 'not_implemented' as const;

export const PRODUCTION_WRITE_SCOPE = PRODUCTION_ENTRY_MEMBER_SCOPE;

const UNAUTHORIZED = 'Hace falta la capacidad production.entry.member.';
const NOT_FOUND = 'Production record was not found in this organization';
const INVALID = 'No se pudo anotar.';

const SAFE_CONFLICT = new Set([
  'Production record id already exists',
  'Idempotency key already used in this organization',
  'Correct the latest record. The prior record is not overwritten.',
  'Correct the latest end. The prior fact is not overwritten.',
  'A correction keeps the same kind. The prior record is not overwritten.',
]);

export type ProductionWriteSession = {
  organizationId?: string | null;
  grantedScopes?: readonly string[] | null;
  memberId?: string | null;
  actorLabel?: string | null;
  cargo?: string | null;
  title?: string | null;
};

export type ProductionSuccessEvent = {
  kind:
    | 'production.entry.recorded'
    | 'production.loss.recorded'
    | 'production.loss.corrected'
    | 'production.consumption.recorded'
    | 'production.classification.recorded'
    | 'production.receipt.recorded'
    | 'production.quema.started'
    | 'production.quema.ended'
    | 'production.quema.product_attached';
  organizationId: string;
  id: string;
};

export type ProductionWriteFailure = {
  ok: false;
  denial: 'unauthorized' | 'not_found' | 'conflict' | 'invalid';
  message: string;
};

export type ProductionWriteResult<T> = { ok: true; value: T } | ProductionWriteFailure;

/**
 * Entry is the only production write scope used here.
 * Review, operational record, and commercial.team.read stay distinct.
 */
export function productionWriteGranted(session: ProductionWriteSession | null | undefined): boolean {
  if (!session) return false;
  return canEnterProduction(scopesOf(session));
}

export function reviewAuthorizesProductionEntry(grantedScopes: readonly string[]): boolean {
  return (
    scopeImplies(PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE) &&
    canEnterProduction(grantedScopes)
  );
}

export function operationalRecordAuthorizesProductionEntry(grantedScopes: readonly string[]): boolean {
  return (
    scopeImplies(PRODUCTION_OPERATIONAL_RECORD_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE) &&
    canEnterProduction(grantedScopes)
  );
}

export function commercialTeamReadAuthorizesProductionWrite(grantedScopes: readonly string[]): boolean {
  return (
    scopeImplies(COMMERCIAL_TEAM_READ_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE) &&
    canEnterProduction(grantedScopes)
  );
}

export function reviewScopeDistinctFromEntry(): boolean {
  return (
    !scopeImplies(PRODUCTION_REVIEW_MEMBER_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE) &&
    !canEnterProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]) &&
    canReviewProduction([PRODUCTION_REVIEW_MEMBER_SCOPE]) &&
    !canReviewProduction([PRODUCTION_ENTRY_MEMBER_SCOPE])
  );
}

export function operationalRecordDistinctFromEntry(): boolean {
  return (
    !scopeImplies(PRODUCTION_OPERATIONAL_RECORD_SCOPE, PRODUCTION_ENTRY_MEMBER_SCOPE) &&
    !canEnterProduction([PRODUCTION_OPERATIONAL_RECORD_SCOPE]) &&
    canRecordProduction([PRODUCTION_OPERATIONAL_RECORD_SCOPE]) &&
    !canRecordProduction([PRODUCTION_ENTRY_MEMBER_SCOPE])
  );
}

function scopesOf(session: ProductionWriteSession): readonly string[] {
  return [...(session.grantedScopes ?? []), ...scopesGrantedByCargoOrTitle(session.cargo, session.title)];
}

function textField(input: unknown, key: string): string {
  if (!input || typeof input !== 'object') return '';
  const value = (input as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function fail(denial: ProductionWriteFailure['denial'], message: string): ProductionWriteFailure {
  return { ok: false, denial, message };
}

function mapStoreError(error: unknown): ProductionWriteFailure {
  if (error instanceof ProductionTraceError && error.code === 'not_found') {
    return fail('not_found', NOT_FOUND);
  }
  if (error instanceof ProductionTraceError && error.code === 'conflict' && SAFE_CONFLICT.has(error.message)) {
    return fail('conflict', error.message);
  }
  if (error instanceof ProductionTraceError && error.code === 'conflict') {
    return fail('conflict', 'Production record was not changed.');
  }
  return fail('invalid', INVALID);
}

/**
 * Session-bound writes over the in-memory trace.
 * organizationId always comes from the trusted session, never the payload.
 */
export class ProductionWriteService {
  readonly successEvents: ProductionSuccessEvent[] = [];

  constructor(private readonly store: InMemoryProductionTraceStore) {}

  recordProcess(session: ProductionWriteSession | null | undefined, input: unknown): ProductionWriteResult<ProcessRecord> {
    return this.write(session, input, 'production.entry.recorded', (organizationId) => {
      const quemaId = textField(input, 'quemaId');
      if (quemaId && !this.quemaInSession(organizationId, quemaId)) return fail('not_found', NOT_FOUND);
      if (!this.priorInSession(organizationId, textField(input, 'correctsEntryId'))) return fail('not_found', NOT_FOUND);
      const value = this.store.recordProcess(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  recordLoss(session: ProductionWriteSession | null | undefined, input: unknown): ProductionWriteResult<LossRecord> {
    return this.write(session, input, 'production.loss.recorded', (organizationId) => {
      if (!this.priorInSession(organizationId, textField(input, 'correctsEntryId'))) return fail('not_found', NOT_FOUND);
      const value = this.store.recordLoss(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  correctLoss(session: ProductionWriteSession | null | undefined, input: unknown): ProductionWriteResult<LossRecord> {
    return this.write(session, input, 'production.loss.corrected', (organizationId) => {
      const priorId = textField(input, 'correctsEntryId');
      const prior = priorId ? this.store.get(organizationId, priorId) : null;
      if (!prior || prior.kind !== 'loss') return fail('not_found', NOT_FOUND);
      const value = this.store.correctLoss(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  recordConsumption(
    session: ProductionWriteSession | null | undefined,
    input: unknown,
  ): ProductionWriteResult<ConsumptionRecord> {
    return this.write(session, input, 'production.consumption.recorded', (organizationId) => {
      if (!this.priorInSession(organizationId, textField(input, 'correctsEntryId'))) return fail('not_found', NOT_FOUND);
      const value = this.store.recordConsumption(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  recordClassification(
    session: ProductionWriteSession | null | undefined,
    input: unknown,
  ): ProductionWriteResult<ClassificationRecord> {
    return this.write(session, input, 'production.classification.recorded', (organizationId) => {
      if (!this.priorInSession(organizationId, textField(input, 'correctsEntryId'))) return fail('not_found', NOT_FOUND);
      const value = this.store.recordClassification(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  recordFinishedGoodsReceipt(
    session: ProductionWriteSession | null | undefined,
    input: unknown,
  ): ProductionWriteResult<FinishedGoodsReceipt> {
    return this.write(session, input, 'production.receipt.recorded', (organizationId) => {
      if (!this.priorInSession(organizationId, textField(input, 'correctsEntryId'))) return fail('not_found', NOT_FOUND);
      const value = this.store.recordFinishedGoodsReceipt(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  openQuema(session: ProductionWriteSession | null | undefined, input: unknown): ProductionWriteResult<QuemaView> {
    return this.write(session, input, 'production.quema.started', (organizationId) => {
      const value = this.store.openQuema(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  endQuema(session: ProductionWriteSession | null | undefined, input: unknown): ProductionWriteResult<QuemaView> {
    return this.write(session, input, 'production.quema.ended', (organizationId) => {
      const quemaId = textField(input, 'quemaId');
      if (!this.quemaInSession(organizationId, quemaId)) return fail('not_found', NOT_FOUND);
      const value = this.store.endQuema(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  attachQuemaProduct(
    session: ProductionWriteSession | null | undefined,
    input: unknown,
  ): ProductionWriteResult<QuemaProductLink> {
    return this.write(session, input, 'production.quema.product_attached', (organizationId) => {
      const quemaId = textField(input, 'quemaId');
      if (!this.quemaInSession(organizationId, quemaId)) return fail('not_found', NOT_FOUND);
      const value = this.store.attachQuemaProduct(organizationId, input);
      return { ok: true, value, id: value.id };
    });
  }

  private priorInSession(organizationId: string, entryId: string): boolean {
    if (!entryId) return true;
    return this.store.get(organizationId, entryId) !== null;
  }

  private quemaInSession(organizationId: string, quemaId: string): boolean {
    if (!quemaId) return false;
    try {
      this.store.getQuema(organizationId, quemaId);
      return true;
    } catch (error) {
      if (error instanceof ProductionTraceError && error.code === 'not_found') return false;
      throw error;
    }
  }

  private write<T>(
    session: ProductionWriteSession | null | undefined,
    input: unknown,
    kind: ProductionSuccessEvent['kind'],
    run: (organizationId: string) => ProductionWriteResult<T> & { id?: string } | ProductionWriteFailure,
  ): ProductionWriteResult<T> {
    const organizationId = session?.organizationId?.trim() ?? '';
    if (!organizationId || !productionWriteGranted(session)) {
      return fail('unauthorized', UNAUTHORIZED);
    }
    void input;
    try {
      const result = run(organizationId);
      if (!result.ok) return result;
      this.successEvents.push({ kind, organizationId, id: result.id ?? '' });
      return { ok: true, value: result.value };
    } catch (error) {
      return mapStoreError(error);
    }
  }
}
