import type { OsOutboxConsumerPort, OsOutboxStorePort } from './outbox-port';
import type { OutboxOperationalHealth } from './outbox-port';
import { OsOutboxWorker, type OutboxWorkerRunResult } from './outbox-worker';
import { DEFAULT_OUTBOX_WORKER_CONFIG } from './outbox-port';

export type { OutboxWorkerRunResult };

export type OutboxWorkerRunner = {
  runOnce(): Promise<OutboxWorkerRunResult>;
};

export type OutboxWorkerHostLogger = {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
};

const defaultLogger: OutboxWorkerHostLogger = {
  info(message, meta) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ level: 'info', component: 'outbox-worker', message, ...meta }));
  },
  warn(message, meta) {
    // eslint-disable-next-line no-console
    console.warn(JSON.stringify({ level: 'warn', component: 'outbox-worker', message, ...meta }));
  },
  error(message, meta) {
    // eslint-disable-next-line no-console
    console.error(JSON.stringify({ level: 'error', component: 'outbox-worker', message, ...meta }));
  },
};

export type OutboxWorkerHostConfig = {
  pollIntervalMs?: number;
  batchSize?: number;
  maxAttempts?: number;
  baseRetryMs?: number;
  maxRetryMs?: number;
  logger?: OutboxWorkerHostLogger;
  /** When true, skip polling ticks while a run is in flight. */
  skipOverlappingRuns?: boolean;
};

export type OutboxWorkerHostState = {
  running: boolean;
  startedAt: string | null;
  lastRunAt: string | null;
  lastRunResult: OutboxWorkerRunResult | null;
  lastError: string | null;
  consecutiveErrors: number;
};

export class OutboxWorkerHost {
  private readonly executeRun: () => Promise<OutboxWorkerRunResult>;
  private readonly logger: OutboxWorkerHostLogger;
  private readonly pollIntervalMs: number;
  private readonly skipOverlappingRuns: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private stopRequested = false;
  private state: OutboxWorkerHostState = {
    running: false,
    startedAt: null,
    lastRunAt: null,
    lastRunResult: null,
    lastError: null,
    consecutiveErrors: 0,
  };

  constructor(
    private readonly store: OsOutboxStorePort,
    runnerOrConsumers: OutboxWorkerRunner | OsOutboxConsumerPort[],
    config: OutboxWorkerHostConfig = {},
  ) {
    this.logger = config.logger ?? defaultLogger;
    this.pollIntervalMs = config.pollIntervalMs ?? 5_000;
    this.skipOverlappingRuns = config.skipOverlappingRuns ?? true;

    if (Array.isArray(runnerOrConsumers)) {
      const worker = new OsOutboxWorker(this.store, runnerOrConsumers, {
        batchSize: config.batchSize ?? DEFAULT_OUTBOX_WORKER_CONFIG.batchSize,
        maxAttempts: config.maxAttempts ?? DEFAULT_OUTBOX_WORKER_CONFIG.maxAttempts,
        baseRetryMs: config.baseRetryMs ?? DEFAULT_OUTBOX_WORKER_CONFIG.baseRetryMs,
        maxRetryMs: config.maxRetryMs ?? DEFAULT_OUTBOX_WORKER_CONFIG.maxRetryMs,
      });
      this.executeRun = () => worker.runOnce();
    } else {
      this.executeRun = () => runnerOrConsumers.runOnce();
    }
  }

  getState(): OutboxWorkerHostState {
    return { ...this.state };
  }

  async getHealth(organizationId?: string): Promise<OutboxOperationalHealth> {
    const backlog = await this.store.getOperationalHealth(organizationId);
    const state = this.getState();
    return {
      backlog,
      worker: {
        running: state.running,
        startedAt: state.startedAt,
        lastRunAt: state.lastRunAt,
        lastError: state.lastError,
        consecutiveErrors: state.consecutiveErrors,
        lastRunClaimed: state.lastRunResult?.claimed ?? null,
        lastRunPublished: state.lastRunResult?.published ?? null,
      },
    };
  }

  start(): void {
    if (this.state.running) return;
    this.stopRequested = false;
    this.state.running = true;
    this.state.startedAt = new Date().toISOString();
    this.logger.info('outbox worker host started', { pollIntervalMs: this.pollIntervalMs });
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
    this.logger.info('outbox worker host stopped');
  }

  async runOnce(): Promise<OutboxWorkerRunResult> {
    const result = await this.executeRun();
    this.state.lastRunAt = new Date().toISOString();
    this.state.lastRunResult = result;
    this.state.lastError = null;
    this.state.consecutiveErrors = 0;
    if (result.claimed > 0) {
      this.logger.info('outbox dispatch tick', { ...result });
    }
    return result;
  }

  private async tick(): Promise<void> {
    if (this.stopRequested) return;
    if (this.skipOverlappingRuns && this.inFlight) return;

    this.inFlight = (async () => {
      try {
        const stats = await this.store.getStats();
        if (stats.pending === 0) return;
        await this.runOnce();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OUTBOX_HOST_TICK_FAILED';
        this.state.lastError = message;
        this.state.consecutiveErrors += 1;
        this.logger.error('outbox dispatch tick failed', {
          error: message,
          consecutiveErrors: this.state.consecutiveErrors,
        });
      } finally {
        this.inFlight = null;
      }
    })();

    await this.inFlight;
  }
}

/** Wrap an existing runner (e.g. ProjectionRunner) for OutboxWorkerHost. */
export function asOutboxWorkerRunner(runner: OutboxWorkerRunner): OutboxWorkerRunner {
  return runner;
}
