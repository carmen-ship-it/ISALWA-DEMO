import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PRODUCTION_ENTRY_SCOPE,
  ProductionAccessLedger,
  recordProcess,
  type ProductionSession,
} from './access';

const ORG = 'org-idem';
const PRODUCT = 'prod-idem';
const at = '2026-09-20T12:00:00.000Z';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

function session(): ProductionSession {
  return {
    organizationId: ORG,
    memberId: 'member-idem',
    grantedScopes: [PRODUCTION_ENTRY_SCOPE],
    actorLabel: 'Operación de planta',
  };
}

function processInput(idempotencyKey: string | null, id: string) {
  return {
    id,
    organizationId: ORG,
    productId: PRODUCT,
    stepKey: 'colaje',
    quemaId: null,
    note: 'Secado confirmado',
    actorMemberId: 'member-idem',
    actorLabel: 'Operación de planta',
    source: 'manual',
    occurredAt: at,
    recordedAt: at,
    evidence: { reference: 'PED-1', note: null },
    correctsEntryId: null,
    correctionReason: null,
    idempotencyKey,
  };
}

describe('PRODUCTION_RECORDPROCESS_IDEMPOTENCY', () => {
  it('DOUBLE_CLICK_DUPLICATE_PROCESS = 0 — same attempt key replays one logical process', () => {
    const ledger = new ProductionAccessLedger();
    const key = 'attempt-double-click';
    const first = recordProcess(ledger, session(), processInput(key, `proc-${key}`));
    const second = recordProcess(ledger, session(), processInput(key, `proc-${key}`));
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.equal(first.value.id, second.value.id);
    assert.equal(
      ledger.entries.filter((e) => e.kind === 'process_record' && e.idempotencyKey === key).length,
      1,
    );
  });

  it('LOST_RESPONSE_RETRY_DUPLICATE_PROCESS = 0 — retry with stable key does not create a second process', () => {
    const ledger = new ProductionAccessLedger();
    const key = 'attempt-lost-response';
    const first = recordProcess(ledger, session(), processInput(key, `proc-${key}`));
    assert.equal(first.ok, true);
    const retry = recordProcess(ledger, session(), {
      ...processInput(key, `proc-${key}-retry-id-ignored`),
      occurredAt: '2026-09-20T12:00:01.000Z',
      recordedAt: '2026-09-20T12:00:01.000Z',
    });
    assert.equal(retry.ok, true);
    if (!first.ok || !retry.ok) return;
    assert.equal(retry.value.id, first.value.id);
    assert.equal(
      ledger.entries.filter((e) => e.kind === 'process_record' && e.organizationId === ORG).length,
      1,
    );
  });

  it('new key after success creates a distinct logical update', () => {
    const ledger = new ProductionAccessLedger();
    const a = recordProcess(ledger, session(), processInput('attempt-a', 'proc-attempt-a'));
    const b = recordProcess(ledger, session(), processInput('attempt-b', 'proc-attempt-b'));
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    assert.equal(
      ledger.entries.filter((e) => e.kind === 'process_record' && e.organizationId === ORG).length,
      2,
    );
  });

  it('desk keeps attempt key stable until confirmed success', () => {
    const desk = readFileSync(join(ROOT, 'components/production/production-postsale-desk.tsx'), 'utf8');
    assert.match(desk, /attemptKeyRef/);
    assert.match(desk, /crypto\.randomUUID/);
    assert.match(desk, /idempotencyKey,/);
    assert.doesNotMatch(desk, /idempotencyKey:\s*null/);
    assert.match(desk, /attemptKeyRef\.current = null/);
  });
});
