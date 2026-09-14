import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { OutboxWorkerHost } from '@isalwa/os-events';
import type { AttentionClock } from '@isalwa/os-query';
import { OS_ATTENTION_CLOCK, OS_OUTBOX_WORKER_HOST } from './os-store.module';
import { getPublicRuntimeSnapshot } from './env-validation';
import { buildUnauthenticatedReadiness } from './health-ready';
import { pingDatabase } from './readiness';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(OS_OUTBOX_WORKER_HOST) private readonly outboxHost: OutboxWorkerHost,
    @Inject(OS_ATTENTION_CLOCK) private readonly attentionClock: AttentionClock,
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

  /** Readiness — database reachability only. No tenant backlog without a session. */
  @Get('ready')
  async readiness(@Res({ passthrough: true }) res: Response) {
    const runtime = getPublicRuntimeSnapshot();
    const databaseReachable = runtime.databaseConfigured ? await pingDatabase() : null;
    return buildUnauthenticatedReadiness({
      runtime,
      databaseReachable,
      session: null,
      outboxHost: this.outboxHost,
      attentionClock: this.attentionClock,
      setStatus: (code) => {
        res.status(code);
      },
    });
  }
}
