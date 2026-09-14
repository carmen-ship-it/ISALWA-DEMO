import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  OPERATIONAL_CASE_FACT_COLUMNS,
  OPERATIONAL_RELEASE_COLUMNS,
  emptyOperationalCaseLedger,
  listOperationalCaseFactsForOrder,
  listOperationalReleasesForOrder,
  messageMayConfirmOperationalCase,
  openOperationalCase,
  operationalCaseFactMayConfirmDelivery,
  operationalCaseFactMayConfirmPayment,
  operationalCaseFactMayConfirmStock,
  operationalReleaseRequiresConfirmedPayment,
  recordOperationalCaseFact,
  recordOperationalReleaseDecision,
  releaseDecisionMayConfirmPayment,
  reverseOperationalCaseFact,
  reverseOperationalReleaseDecision,
  type OperationalCaseLedger,
} from './operational-case';

const openedAt = '2026-09-14T14:00:00.000Z';
const occurredAt = '2026-09-14T14:30:00.000Z';
const recordedAt = '2026-09-14T15:00:00.000Z';
const createdAt = '2026-09-14T15:00:01.000Z';

function open(ledger: OperationalCaseLedger = emptyOperationalCaseLedger(), organizationId = 'org-a') {
  const opened = openOperationalCase(ledger, {
    id: organizationId === 'org-a' ? 'case-1' : 'case-b',
    organizationId,
    orderId: 'order-opaque-1',
    openedAt,
    openedBy: { label: 'Operador de prueba', memberId: 'member-1' },
    createdAt,
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) throw new Error('case did not open');
  return opened;
}

function paymentClaim(patch: Record<string, unknown> = {}) {
  return {
    id: 'fact-1',
    organizationId: 'org-a',
    caseId: 'case-1',
    orderId: 'order-opaque-1',
    kind: 'payment_report' as const,
    source: 'customer_message' as const,
    actor: { label: 'Operador de prueba', memberId: 'member-1' },
    occurredAt,
    recordedAt,
    evidence: { text: 'El cliente dice: ya pagué', reference: 'msg-opaque-1' },
    createdAt,
    ...patch,
  };
}

function agreementRelease(patch: Record<string, unknown> = {}) {
  return {
    id: 'release-1',
    organizationId: 'org-a',
    caseId: 'case-1',
    orderId: 'order-opaque-1',
    state: 'released' as const,
    basis: 'commercial_agreement' as const,
    reason: 'Distribuidor con acuerdo vigente',
    source: 'manual' as const,
    actor: { label: 'Operador de prueba', memberId: 'member-1' },
    decidedAt: recordedAt,
    recordedAt,
    evidence: { text: 'Acuerdo comercial autorizado', reference: 'agreement-opaque-1' },
    createdAt,
    ...patch,
  };
}

describe('operational case', () => {
  it('requires provenance even when the source is manual', () => {
    const opened = open();
    const missingEvidence = recordOperationalCaseFact(opened.ledger, {
      ...paymentClaim(),
      source: 'manual',
      evidence: { text: '   ' },
    });
    const missingActor = recordOperationalCaseFact(opened.ledger, {
      ...paymentClaim(),
      source: 'manual',
      actor: { label: ' ', memberId: null },
    });
    const missingTimes = recordOperationalCaseFact(opened.ledger, {
      ...paymentClaim(),
      source: 'manual',
      occurredAt: '',
      recordedAt: '',
    });
    const missingSource = recordOperationalCaseFact(opened.ledger, {
      ...paymentClaim(),
      source: undefined,
    } as never);

    assert.equal(missingEvidence.ok, false);
    assert.equal(missingActor.ok, false);
    assert.equal(missingTimes.ok, false);
    assert.equal(missingSource.ok, false);
    if (!missingEvidence.ok) assert.equal(missingEvidence.reason, 'provenance_required');
    if (!missingActor.ok) assert.equal(missingActor.reason, 'provenance_required');
    if (!missingTimes.ok) assert.equal(missingTimes.reason, 'provenance_required');
    if (!missingSource.ok) assert.equal(missingSource.reason, 'provenance_required');
    assert.equal(opened.ledger.facts.length, 0);
  });

  it('keeps the original fact when a reversal is appended', () => {
    const opened = open();
    const recorded = recordOperationalCaseFact(opened.ledger, paymentClaim());
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    const original = recorded.value;

    const reversed = reverseOperationalCaseFact(recorded.ledger, {
      id: 'rev-1',
      factId: original.id,
      organizationId: original.organization_id,
      reason: 'Se anotó de más',
      actor: { label: 'Operador de prueba', memberId: 'member-1' },
      recordedAt,
      createdAt,
    });
    assert.equal(reversed.ok, true);
    if (!reversed.ok) return;

    const stored = reversed.ledger.facts.find((item) => item.id === original.id);
    assert.equal(stored, original);
    assert.equal(stored?.evidence_text, 'El cliente dice: ya pagué');
    assert.equal(stored?.confirmation, 'pending');
    assert.equal(reversed.ledger.reversals.length, 1);
    assert.equal(reversed.value.reason, 'Se anotó de más');

    const history = listOperationalCaseFactsForOrder(reversed.ledger, {
      organizationId: 'org-a',
      orderId: 'order-opaque-1',
    });
    assert.equal(history.length, 1);
    assert.equal(history[0]?.fact.evidence_text, original.evidence_text);
    assert.equal(history[0]?.reversal?.reason, 'Se anotó de más');

    const again = reverseOperationalCaseFact(reversed.ledger, {
      id: 'rev-2',
      factId: original.id,
      organizationId: original.organization_id,
      reason: 'otra vez',
      actor: { label: 'Operador de prueba', memberId: null },
      recordedAt,
      createdAt,
    });
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.reason, 'already_reversed');
    assert.equal(reversed.ledger.facts.length, 1);
    assert.equal(reversed.ledger.reversals.length, 1);
  });

  it('does not read or reverse another organization', () => {
    const opened = open();
    const recorded = recordOperationalCaseFact(opened.ledger, paymentClaim({ orderLineId: 'line-opaque-1' }));
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;

    const otherOpen = open(recorded.ledger, 'org-b');
    assert.equal(otherOpen.ok, true);
    if (!otherOpen.ok) return;
    const otherFact = recordOperationalCaseFact(otherOpen.ledger, {
      ...paymentClaim(),
      id: 'fact-other',
      organizationId: 'org-b',
      caseId: 'case-b',
      idempotencyKey: 'same-key',
    });
    assert.equal(otherFact.ok, true);
    if (!otherFact.ok) return;

    const crossRecord = recordOperationalCaseFact(otherFact.ledger, {
      ...paymentClaim(),
      id: 'fact-cross',
      organizationId: 'org-b',
      caseId: 'case-1',
    });
    assert.equal(crossRecord.ok, false);
    if (!crossRecord.ok) assert.equal(crossRecord.reason, 'tenant_mismatch');

    const crossReverse = reverseOperationalCaseFact(otherFact.ledger, {
      id: 'rev-cross',
      factId: 'fact-1',
      organizationId: 'org-b',
      reason: 'no es de este local',
      actor: { label: 'Otro operador', memberId: null },
      recordedAt,
      createdAt,
    });
    assert.equal(crossReverse.ok, false);
    if (!crossReverse.ok) assert.equal(crossReverse.reason, 'tenant_mismatch');
    assert.equal(otherFact.ledger.reversals.length, 0);

    assert.deepEqual(
      listOperationalCaseFactsForOrder(otherFact.ledger, {
        organizationId: 'org-a',
        orderId: 'order-opaque-1',
      }).map((item) => item.fact.id),
      ['fact-1'],
    );
    assert.deepEqual(
      listOperationalCaseFactsForOrder(otherFact.ledger, {
        organizationId: 'org-b',
        orderId: 'order-opaque-1',
      }).map((item) => item.fact.id),
      ['fact-other'],
    );
    assert.equal(otherFact.value.order_line_id, null);
    assert.equal(recorded.value.order_line_id, 'line-opaque-1');
  });

  it('does not confirm payment or delivery from a message', () => {
    const opened = open();
    const paid = recordOperationalCaseFact(opened.ledger, paymentClaim());
    assert.equal(paid.ok, true);
    if (!paid.ok) return;
    const delivered = recordOperationalCaseFact(paid.ledger, {
      ...paymentClaim(),
      id: 'fact-2',
      kind: 'delivery_report',
      evidence: { text: 'El cliente dice: ya llegó', reference: 'msg-opaque-2' },
    });
    assert.equal(delivered.ok, true);
    if (!delivered.ok) return;

    assert.equal(paid.value.confirmation, 'pending');
    assert.equal(delivered.value.confirmation, 'pending');
    assert.equal(paid.value.canonical_effect, 'none');
    assert.equal(delivered.value.canonical_effect, 'none');
    assert.equal(paid.value.source, 'customer_message');
    assert.equal(delivered.value.source, 'customer_message');
    assert.equal('paid_at' in paid.value, false);
    assert.equal('delivered_at' in delivered.value, false);
    assert.equal('confirmed_at' in paid.value, false);
    assert.equal('paymentConfirmed' in paid.value, false);
    assert.equal(operationalCaseFactMayConfirmPayment(), false);
    assert.equal(operationalCaseFactMayConfirmDelivery(), false);
    assert.equal(operationalCaseFactMayConfirmStock(), false);
    assert.equal(messageMayConfirmOperationalCase(), false);

    const confirmPaid = recordOperationalCaseFact(delivered.ledger, {
      ...paymentClaim(),
      id: 'fact-3',
      confirmation: 'confirmed',
      paidAt: recordedAt,
    } as never);
    const confirmDelivered = recordOperationalCaseFact(delivered.ledger, {
      ...paymentClaim(),
      id: 'fact-4',
      kind: 'delivery_report',
      deliveredAt: recordedAt,
    } as never);
    assert.equal(confirmPaid.ok, false);
    assert.equal(confirmDelivered.ok, false);
    if (!confirmPaid.ok) assert.equal(confirmPaid.reason, 'confirmation_refused');
    if (!confirmDelivered.ok) assert.equal(confirmDelivered.reason, 'confirmation_refused');
    assert.equal(delivered.ledger.facts.length, 2);
  });

  it('releases a pedido on a commercial agreement without a confirmed payment', () => {
    const opened = open();
    const released = recordOperationalReleaseDecision(opened.ledger, agreementRelease());
    assert.equal(released.ok, true);
    if (!released.ok) return;

    assert.equal(released.value.state, 'released');
    assert.equal(released.value.basis, 'commercial_agreement');
    assert.equal(released.value.source, 'manual');
    assert.equal(released.value.canonical_effect, 'none');
    assert.equal('paymentConfirmed' in released.value, false);
    assert.equal(operationalReleaseRequiresConfirmedPayment(), false);
    assert.equal(releaseDecisionMayConfirmPayment(), false);
    assert.equal(opened.ledger.facts.length, 0);
    assert.equal(released.ledger.facts.length, 0);
  });

  it('does not confirm a reported payment when the release cites a reviewed payment', () => {
    const opened = open();
    const reported = recordOperationalCaseFact(opened.ledger, paymentClaim());
    assert.equal(reported.ok, true);
    if (!reported.ok) return;
    const original = reported.value;

    const released = recordOperationalReleaseDecision(reported.ledger, {
      ...agreementRelease(),
      basis: 'payment_verified',
      reason: 'Se revisó el comprobante en mano',
      evidence: { text: 'Comprobante visto por el operador', reference: 'ref-opaque-1' },
    });
    assert.equal(released.ok, true);
    if (!released.ok) return;

    const stored = released.ledger.facts.find((item) => item.id === original.id);
    assert.equal(stored, original);
    assert.equal(stored?.confirmation, 'pending');
    assert.equal(released.value.state, 'released');
    assert.equal(released.value.basis, 'payment_verified');
    assert.equal('paymentConfirmed' in released.value, false);
    assert.equal(releaseDecisionMayConfirmPayment(), false);

    const gated = recordOperationalReleaseDecision(released.ledger, {
      ...agreementRelease(),
      id: 'release-gated',
      paymentConfirmed: true,
    } as never);
    assert.equal(gated.ok, false);
    if (!gated.ok) assert.equal(gated.reason, 'confirmation_refused');
    assert.equal(released.ledger.releases.length, 1);
  });

  it('refuses a customer message as a release and keeps release history on reversal', () => {
    const opened = open();
    const fromMessage = recordOperationalReleaseDecision(opened.ledger, {
      ...agreementRelease(),
      source: 'customer_message',
    } as never);
    assert.equal(fromMessage.ok, false);
    if (!fromMessage.ok) assert.equal(fromMessage.reason, 'source_not_authorized');

    const missing = recordOperationalReleaseDecision(opened.ledger, {
      ...agreementRelease(),
      evidence: { text: ' ' },
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.reason, 'provenance_required');

    const released = recordOperationalReleaseDecision(opened.ledger, agreementRelease());
    assert.equal(released.ok, true);
    if (!released.ok) return;
    const original = released.value;

    const reversed = reverseOperationalReleaseDecision(released.ledger, {
      id: 'release-rev-1',
      decisionId: original.id,
      organizationId: original.organization_id,
      reason: 'El acuerdo no era de este pedido',
      actor: { label: 'Operador de prueba', memberId: 'member-1' },
      recordedAt,
      createdAt,
    });
    assert.equal(reversed.ok, true);
    if (!reversed.ok) return;
    assert.equal(reversed.ledger.releases.find((item) => item.id === original.id), original);
    assert.equal(original.state, 'released');
    assert.equal('paymentConfirmed' in original, false);

    const history = listOperationalReleasesForOrder(reversed.ledger, {
      organizationId: 'org-a',
      orderId: 'order-opaque-1',
    });
    assert.equal(history.length, 1);
    assert.equal(history[0]?.decision.reason, 'Distribuidor con acuerdo vigente');
    assert.equal(history[0]?.reversal?.reason, 'El acuerdo no era de este pedido');

    const other = reverseOperationalReleaseDecision(reversed.ledger, {
      id: 'release-rev-cross',
      decisionId: original.id,
      organizationId: 'org-b',
      reason: 'otro local',
      actor: { label: 'Otro', memberId: null },
      recordedAt,
      createdAt,
    });
    assert.equal(other.ok, false);
    if (!other.ok) assert.equal(other.reason, 'tenant_mismatch');
    assert.equal(
      listOperationalReleasesForOrder(reversed.ledger, {
        organizationId: 'org-b',
        orderId: 'order-opaque-1',
      }).length,
      0,
    );
  });

  it('adds case tables without rewriting commercial tables or storing confirmation', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        '../os-database/prisma/migrations/20260915120000_os_operational_case/migration.sql',
      ),
      'utf8',
    );
    const columnLines = sql.split('\n').filter((line) => /^\s+[a-z_]+ /.test(line));

    assert.match(sql, /CREATE TABLE os_operational_cases/);
    assert.match(sql, /CREATE TABLE os_operational_case_facts/);
    assert.match(sql, /CREATE TABLE os_operational_case_fact_reversals/);
    assert.match(sql, /CREATE TABLE os_operational_release_decisions/);
    assert.match(sql, /CHECK \(confirmation = 'pending'\)/);
    assert.match(sql, /CHECK \(source IN \('manual', 'customer_message'\)\)/);
    assert.match(sql, /CHECK \(source = 'manual'\)/);
    assert.match(sql, /commercial_agreement/);
    assert.match(sql, /No foreign key to os_orders/);
    assert.match(sql, /does not confirm a payment/);
    assert.match(sql, /not a gate/i);
    assert.doesNotMatch(sql, /(^|\n)\s*UPDATE\b/i);
    assert.doesNotMatch(sql, /ALTER TABLE os_(?!operational_)/);
    assert.doesNotMatch(sql, /delivery_note|nota_de_entrega|numbering/i);
    for (const forbidden of [
      'confirmed_at',
      'paid_at',
      'delivered_at',
      'payment_confirmed',
      'ledger_entry_id',
      'inventory_movement_id',
    ]) {
      assert.equal(
        columnLines.some((line) => line.includes(forbidden)),
        false,
        forbidden,
      );
    }
    for (const column of OPERATIONAL_CASE_FACT_COLUMNS) {
      assert.match(sql, new RegExp(`\\b${column}\\b`));
    }
    for (const column of OPERATIONAL_RELEASE_COLUMNS) {
      assert.match(sql, new RegExp(`\\b${column}\\b`));
    }
  });
});
