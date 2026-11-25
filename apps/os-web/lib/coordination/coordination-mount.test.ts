import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  emptyCoordinationLedger,
  recordCoordinationDecision,
} from '@isalwa/os-contracts';

const root = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Coordinación mount', () => {
  it('mounts durable API record/resolve actions and no longer hard-disables canRecord', () => {
    const page = read('app/(app)/coordinacion/page.tsx');
    const panel = read('components/coordination/coordination-panel.tsx');
    const card = read('components/coordination/coordination-item-card.tsx');
    const form = read('components/coordination/coordination-decision-form.tsx');
    const load = read('lib/coordination/load.ts');
    const actions = read('lib/coordination/actions.ts');
    const client = read('lib/api/os-api-client.ts');

    assert.match(page, /Registro durable/);
    assert.doesNotMatch(page, /Aún no disponible/);
    assert.match(panel, /canRecord=\{model\.canRecord\}/);
    assert.doesNotMatch(panel, /canRecord=\{false\}/);
    assert.match(panel, /CoordinationDecisionForm/);
    assert.match(card, /CoordinationDecisionForm/);
    assert.match(form, /recordCoordinationDecisionAction/);
    assert.match(form, /resolveCoordinationDecisionAction/);
    assert.match(load, /listCoordinationDecisions/);
    assert.match(actions, /client\.recordCoordinationDecision/);
    assert.match(actions, /liveWrite: 'PROVEN'/);
    assert.match(client, /\/coordination\/decisions/);
    assert.doesNotMatch(actions, /mutatedProduction:\s*true|CreatePayment|poNumber/);
  });

  it('keeps contract authority fields closed on a recorded decision', () => {
    const recorded = recordCoordinationDecision({
      session: {
        organizationId: 'org-coord',
        actorMemberId: 'mem-1',
        actorLabel: 'Ana',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      ledger: emptyCoordinationLedger(),
      id: 'dec-1',
      decision: 'Revisar abastecimiento cruzado',
      occurredAt: '2026-11-24T12:00:00.000Z',
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    assert.equal(recorded.value.mutatedProduction, false);
    assert.equal(recorded.value.mutatedPayment, false);
    assert.equal(recorded.value.decision.grantsProductionAuthority, false);
  });
});
