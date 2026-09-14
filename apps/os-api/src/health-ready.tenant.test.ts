import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildUnauthenticatedReadiness } from './health-ready';

const FOREIGN_BACKLOG = {
  pending: 9,
  published: 40,
  deadLetter: 4,
  retrying: 2,
  oldestPendingAgeMs: 123456,
  lastPublishedAt: '2026-01-01T00:00:00.000Z',
  recentDeadLetters: [{ outboxId: 'outbox-foreign', eventId: 'evt-foreign' }],
};

describe('unauthenticated health/ready', () => {
  it('does not run the global outbox count when there is no session', async () => {
    let healthCalls = 0;
    const body = await buildUnauthenticatedReadiness({
      runtime: {
        profile: 'staging',
        authMode: 'supabase',
        databaseConfigured: true,
        outboxWorkerEnabled: true,
        attentionClockEnabled: true,
        devBootstrapEnabled: false,
      },
      databaseReachable: true,
      session: null,
      outboxHost: {
        getState: () => ({ running: true }),
        getHealth: async () => {
          healthCalls += 1;
          return { backlog: FOREIGN_BACKLOG };
        },
      },
      attentionClock: {
        getState: () => ({
          running: true,
          lastRunAt: '2026-09-14T12:00:00.000Z',
          lastSuccessAt: '2026-09-14T12:00:00.000Z',
          lastError: null,
          lastRun: {
            refreshedOrganizations: 3,
            organizationIds: ['org-foreign'],
          },
        }),
      },
      setStatus: () => {},
    });

    assert.equal(healthCalls, 0);
    assert.equal(body.status, 'ready');
    assert.equal(body.checks.some((check) => check.name === 'database' && check.ok), true);
    assert.equal(body.outboxWorker?.pending, null);
    assert.equal(body.attentionClock?.lastRefreshedOrganizations, null);

    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes('123456'), false);
    assert.equal(serialized.includes('deadLetter'), false);
    assert.equal(serialized.includes('oldestPending'), false);
    assert.equal(serialized.includes('org-foreign'), false);
    assert.equal(serialized.includes('"pending":9'), false);
    assert.equal(serialized.includes('organizationId'), false);
  });
});
