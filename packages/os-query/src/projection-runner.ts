import type { OsOutboxConsumerPort, OsOutboxStorePort } from '@isalwa/os-events';
import { OsOutboxWorker } from '@isalwa/os-events';

export type ProjectionRunnerDeps = {
  outboxStore: OsOutboxStorePort;
  consumers: OsOutboxConsumerPort[];
  batchSize?: number;
};

export class ProjectionRunner {
  private readonly worker: OsOutboxWorker;

  constructor(deps: ProjectionRunnerDeps) {
    this.worker = new OsOutboxWorker(deps.outboxStore, deps.consumers, {
      batchSize: deps.batchSize ?? 25,
      maxAttempts: 5,
      baseRetryMs: 500,
      maxRetryMs: 30_000,
    });
  }

  async runOnce() {
    return this.worker.runOnce();
  }
}

export function startProjectionWorker(
  deps: ProjectionRunnerDeps,
  intervalMs = 5_000,
): { stop: () => void } {
  const timer = setInterval(() => {
    void deps.outboxStore.getStats().then(async (stats) => {
      if (stats.pending > 0) {
        await new ProjectionRunner(deps).runOnce();
      }
    });
  }, intervalMs);
  return {
    stop: () => clearInterval(timer),
  };
}
