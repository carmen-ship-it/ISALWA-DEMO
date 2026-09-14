import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  COORDINATION_DECISION_LIVE_WRITE_PROOF,
  coordinationCapabilityFromCargoOrTitle,
  coordinationDecisionTargetMatchesSession,
  emptyCoordinationLedger,
  hasCoordinationDecisionCapability,
  recordCoordinationDecision,
  resolveCoordinationDecision,
  type CoordinationLedger,
  type CoordinationSession,
} from './coordination-decision';

const SESSION = 'org-session-alpha';
const OTHER = 'org-other-zeta';
const SECRET = 'ZetaOtherDecisionSecret';
const occurredAt = '2026-09-16T15:00:00.000Z';

function session(overrides: Partial<CoordinationSession> = {}): CoordinationSession {
  return {
    organizationId: SESSION,
    actorMemberId: 'member-1',
    actorLabel: 'Ana',
    grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
    cargo: null,
    title: null,
    ...overrides,
  };
}

function recordForeign(): CoordinationLedger {
  const recorded = recordCoordinationDecision({
    session: session({ organizationId: OTHER }),
    ledger: emptyCoordinationLedger(),
    id: 'dec-zeta',
    decision: SECRET,
    occurredAt,
    organizationId: OTHER,
  });
  assert.equal(recorded.ok, true);
  if (!recorded.ok) return emptyCoordinationLedger();
  return recorded.value.ledger;
}

function assertNoForeign(serialized: string): void {
  assert.equal(serialized.includes(OTHER), false);
  assert.equal(serialized.includes(SECRET), false);
  assert.equal(serialized.includes('dec-zeta'), false);
  assert.equal(serialized.includes('Zeta'), false);
}

describe('coordination decision record tenant target', () => {
  it('same tenant + exact capability records without mutating another organization', () => {
    const foreign = recordForeign();
    const before = structuredClone(foreign);
    const recorded = recordCoordinationDecision({
      session: session(),
      ledger: foreign,
      id: 'dec-alpha',
      decision: 'Mover la fecha interna',
      occurredAt,
      organizationId: SESSION,
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    assert.equal(recorded.value.decision.organizationId, SESSION);
    assert.equal(recorded.value.decision.kind, 'recorded');
    assert.deepEqual(foreign.decisions, before.decisions);
    assert.equal(recorded.value.decision.decision, 'Mover la fecha interna');
    assert.equal(JSON.stringify(recorded.value.decision).includes(SECRET), false);
    assert.equal(recorded.value.ledger.decisions.at(-1)?.id, 'dec-alpha');
  });

  it('claimed foreign organization does not record, append, or leak the foreign decision', () => {
    const foreign = recordForeign();
    const denied = recordCoordinationDecision({
      session: session(),
      ledger: foreign,
      id: 'dec-cross',
      decision: 'Escribir en otra planta',
      occurredAt,
      organizationId: OTHER,
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.reason, 'cross_tenant');
    assert.equal('value' in denied, false);
    assert.equal(foreign.decisions.length, 1);
    assert.equal(foreign.decisions[0]?.decision, SECRET);
    assertNoForeign(JSON.stringify(denied));
  });

  it('foreign resolve id is the same as missing: no mutation, no success event, no existence leak', () => {
    const foreign = recordForeign();
    const before = structuredClone(foreign.decisions);
    const resolvedForeign = resolveCoordinationDecision({
      session: session(),
      ledger: foreign,
      id: 'dec-res',
      resolvesDecisionId: 'dec-zeta',
      decision: 'Cerrar la decisión ajena',
      occurredAt,
    });
    const resolvedMissing = resolveCoordinationDecision({
      session: session(),
      ledger: foreign,
      id: 'dec-res',
      resolvesDecisionId: 'dec-missing',
      decision: 'Cerrar la decisión ajena',
      occurredAt,
    });
    assert.equal(resolvedForeign.ok, false);
    assert.equal(resolvedMissing.ok, false);
    if (resolvedForeign.ok || resolvedMissing.ok) return;
    assert.equal(resolvedForeign.reason, 'not_found');
    assert.equal(resolvedMissing.reason, 'not_found');
    assert.equal('value' in resolvedForeign, false);
    assert.equal('value' in resolvedMissing, false);
    assert.deepEqual(foreign.decisions, before);
    assertNoForeign(JSON.stringify(resolvedForeign));
    assertNoForeign(JSON.stringify(resolvedMissing));
  });

  it('does not grant coordination.decision.record from Auxiliar or operations.coordinator.record', () => {
    const auxiliar = session({
      cargo: 'Auxiliar',
      title: 'Auxiliar',
      grantedCapabilities: ['operations.coordinator.record', 'purchasing.operational.record'],
    });
    assert.deepEqual(coordinationCapabilityFromCargoOrTitle('Auxiliar', 'Auxiliar'), []);
    assert.equal(hasCoordinationDecisionCapability(auxiliar.grantedCapabilities), false);
    assert.equal(hasCoordinationDecisionCapability(['operations.coordinator.record']), false);
    assert.equal(hasCoordinationDecisionCapability([COORDINATION_DECISION_CAPABILITY]), true);
    assert.equal(COORDINATION_DECISION_CAPABILITY, 'coordination.decision.record');

    const ledger = emptyCoordinationLedger();
    const recorded = recordCoordinationDecision({
      session: auxiliar,
      ledger,
      id: 'dec-aux',
      decision: 'El auxiliar decide',
      occurredAt,
    });
    assert.equal(recorded.ok, false);
    if (!recorded.ok) assert.equal(recorded.reason, 'unauthorized_role');
    assert.equal(ledger.decisions.length, 0);
    assert.equal('value' in recorded, false);

    const resolved = resolveCoordinationDecision({
      session: auxiliar,
      ledger: recordForeign(),
      id: 'dec-aux-res',
      resolvesDecisionId: 'dec-zeta',
      decision: 'El auxiliar resuelve',
      occurredAt,
    });
    assert.equal(resolved.ok, false);
    if (!resolved.ok) assert.equal(resolved.reason, 'unauthorized_role');
    assert.equal('value' in resolved, false);
  });

  it('proves target organization equals the trusted session organization before mutation', () => {
    const matched = coordinationDecisionTargetMatchesSession(session(), SESSION);
    assert.equal(matched.ok, true);
    if (!matched.ok) return;
    assert.equal(matched.value.organizationId, SESSION);

    const omitted = coordinationDecisionTargetMatchesSession(session(), null);
    assert.equal(omitted.ok, true);
    if (!omitted.ok) return;
    assert.equal(omitted.value.organizationId, SESSION);

    const foreign = coordinationDecisionTargetMatchesSession(session(), OTHER);
    assert.equal(foreign.ok, false);
    if (!foreign.ok) assert.equal(foreign.reason, 'cross_tenant');
    assertNoForeign(JSON.stringify(foreign));

    const missing = coordinationDecisionTargetMatchesSession(session({ organizationId: '   ' }), SESSION);
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, 'missing_session_org');
  });

  it('marks live writes UNPROVEN and does not invent a Prisma writer or a read scope', () => {
    assert.equal(COORDINATION_DECISION_LIVE_WRITE_PROOF, 'UNPROVEN');
    const source = readFileSync(join(__dirname, 'coordination-decision.ts'), 'utf8');
    assert.doesNotMatch(source, /@prisma\/client|PrismaClient/);
    assert.doesNotMatch(source, /coordination\.decision\.read/);
    assert.match(source, /coordinationDecisionTargetMatchesSession/);
    assert.match(source, /UNPROVEN/);
  });
});
