import { OS_PROJECTION_CONSUMER_KEYS } from '@isalwa/os-contracts';
import type { ProjectionFreshness } from '@isalwa/os-contracts';
import type { OsProjectionStorePort } from '../projection-store-port';

/** Default wall-clock interval. Aging does not need the outbox poll cadence. */
export const DEFAULT_ATTENTION_CLOCK_INTERVAL_MS = 60_000;

/** Floor so a mis-set interval cannot tight-loop the database. */
export const MIN_ATTENTION_CLOCK_INTERVAL_MS = 1_000;

export type AttentionClockStore = Pick<
  OsProjectionStorePort,
  | 'listOrganizationIdsNeedingOverdueRefresh'
  | 'rebuildAttentionForOrganization'
  | 'upsertFreshness'
>;

export type AttentionClockRunResult = {
  scannedOrganizations: number;
  refreshedOrganizations: number;
  organizationIds: string[];
};

export type AttentionClockState = {
  running: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveErrors: number;
  lastRun: AttentionClockRunResult | null;
};

export type AttentionClockLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

const defaultLogger: AttentionClockLogger = {
  info(message, meta) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: 'info', component: 'attention-clock', message, ...meta }));
  },
  error(message, meta) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'error', component: 'attention-clock', message, ...meta }));
  },
};

export type AttentionClockConfig = {
  pollIntervalMs?: number;
  logger?: AttentionClockLogger;
  skipOverlappingRuns?: boolean;
};

/**
 * Refreshes derived overdue_work from wall clock.
 * Does not emit business events, claim outbox rows, or invent attention types.
 * Catch-up after downtime is the next tick: the predicate is dueAt < now, not elapsed intervals.
 */
export class AttentionClock {
  private readonly logger: AttentionClockLogger;
  private readonly pollIntervalMs: number;
  private readonly skipOverlappingRuns: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private stopRequested = false;
  private state: AttentionClockState = {
    running: false,
    startedAt: null,
    lastRunAt: null,
    lastSuccessAt: null,
    lastError: null,
    consecutiveErrors: 0,
    lastRun: null,
  };

  constructor(
    private readonly store: AttentionClockStore,
    config: AttentionClockConfig = {},
  ) {
    this.logger = config.logger ?? defaultLogger;
    const requested = config.pollIntervalMs ?? DEFAULT_ATTENTION_CLOCK_INTERVAL_MS;
    this.pollIntervalMs =
      Number.isFinite(requested) && requested >= MIN_ATTENTION_CLOCK_INTERVAL_MS
        ? requested
        : DEFAULT_ATTENTION_CLOCK_INTERVAL_MS;
    this.skipOverlappingRuns = config.skipOverlappingRuns ?? true;
  }

  getState(): AttentionClockState {
    return {
      ...this.state,
      lastRun: this.state.lastRun ? { ...this.state.lastRun, organizationIds: [...this.state.lastRun.organizationIds] } : null,
    };
  }

  start(): void {
    if (this.state.running) return;
    this.stopRequested = false;
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();
    this.logger.info('attention clock started', { pollIntervalMs: this.pollIntervalMs });
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
  }

  async stop(graceMs = 10_000): Promise<void> {
    this.stopRequested = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    const deadline = Date.now() + graceMs;
    while (this.inFlight && Date.now() < deadline) {
      await this.inFlight;
    }
    this.state.running = false;
    this.logger.info('attention clock stopped');
  }

  async runOnce(asOf = new Date()): Promise<AttentionClockRunResult> {
    try {
      const organizationIds = await this.store.listOrganizationIdsNeedingOverdueRefresh(asOf);
      const failures: string[] = [];
      let refreshedOrganizations = 0;

      for (const organizationId of organizationIds) {
        try {
          await this.store.rebuildAttentionForOrganization(organizationId, asOf);
          await this.recordSuccess(organizationId, asOf);
          refreshedOrganizations += 1;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'ATTENTION_CLOCK_REFRESH_FAILED';
          failures.push(`${organizationId}: ${message}`);
        }
      }

      const result: AttentionClockRunResult = {
        scannedOrganizations: organizationIds.length,
        refreshedOrganizations,
        organizationIds,
      };
      this.state.lastRunAt = new Date().toISOString();
      this.state.lastRun = result;

      if (failures.length > 0) {
        throw new Error(failures.join('; '));
      }

      this.state.lastSuccessAt = this.state.lastRunAt;
      this.state.lastError = null;
      this.state.consecutiveErrors = 0;
      if (refreshedOrganizations > 0) {
        this.logger.info('attention clock refreshed overdue attention', {
          refreshedOrganizations,
          organizationIds,
        });
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ATTENTION_CLOCK_TICK_FAILED';
      this.state.lastRunAt = new Date().toISOString();
      this.state.lastError = message;
      this.state.consecutiveErrors += 1;
      this.logger.error('attention clock refresh failed', {
        error: message,
        consecutiveErrors: this.state.consecutiveErrors,
      });
      throw err instanceof Error ? err : new Error(message);
    }
  }

  private async recordSuccess(organizationId: string, asOf: Date): Promise<void> {
    const freshness: Partial<Omit<ProjectionFreshness, 'organizationId' | 'consumerKey'>> = {
      lastSuccessAt: asOf.toISOString(),
      lastError: null,
    };
    await this.store.upsertFreshness(
      organizationId,
      OS_PROJECTION_CONSUMER_KEYS.workAttention,
      freshness,
    );
  }

  private async tick(): Promise<void> {
    if (this.stopRequested) return;
    if (this.skipOverlappingRuns && this.inFlight) return;

    this.inFlight = (async () => {
      try {
        await this.runOnce();
      } catch {
        // runOnce already recorded lastError. The interval must keep polling.
      } finally {
        this.inFlight = null;
      }
    })();

    await this.inFlight;
  }
}
