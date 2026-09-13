import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { OutboxWorkerHost } from '@isalwa/os-events';
import { OS_OUTBOX_WORKER_HOST } from './os-store.module';
import { getPublicRuntimeSnapshot } from './env-validation';
import { pingDatabase } from './readiness';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(OS_OUTBOX_WORKER_HOST) private readonly outboxHost: OutboxWorkerHost,
  ) {}

  /** Liveness — process is running. Does not check dependencies. */
  @Get()
  liveness() {
    return {
      status: 'ok',
      service: 'os-api',
      check: 'liveness',
    };
  }

  /** Readiness — safe to serve traffic for critical dependencies. */
  @Get('ready')
  async readiness(@Res({ passthrough: true }) res: Response) {
    const runtime = getPublicRuntimeSnapshot();
    const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];

    if (runtime.databaseConfigured) {
      const dbOk = await pingDatabase();
      checks.push({ name: 'database', ok: dbOk });
    } else if (runtime.profile !== 'development') {
      checks.push({ name: 'database', ok: false, detail: 'not_configured' });
    }

    if (runtime.databaseConfigured && runtime.outboxWorkerEnabled) {
      const worker = this.outboxHost.getState();
      checks.push({
        name: 'outboxWorker',
        ok: worker.running,
        detail: worker.running ? 'running' : 'not_running',
      });
    }

    const failedRequired = checks.some((check) => !check.ok);
    const status = failedRequired ? 'not_ready' : 'ready';

    if (failedRequired) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    let pending: number | null = null;
    try {
      if (runtime.databaseConfigured) {
        const health = await this.outboxHost.getHealth();
        pending = health.backlog.pending;
      }
    } catch {
      pending = null;
    }

    return {
      status,
      service: 'os-api',
      check: 'readiness',
      runtime: {
        profile: runtime.profile,
        authMode: runtime.authMode,
        devBootstrapEnabled: runtime.devBootstrapEnabled,
      },
      checks,
      outboxWorker: runtime.databaseConfigured
        ? {
            enabled: runtime.outboxWorkerEnabled,
            pending,
          }
        : undefined,
    };
  }
}
