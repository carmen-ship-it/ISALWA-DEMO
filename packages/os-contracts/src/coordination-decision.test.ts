import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  COORDINATION_EMPTY_COMMITTEE_TITLE,
  aggregateCoordinationDecisions,
  coordinationCapabilityFromCargoOrTitle,
  coordinationCommitteeForSession,
  deriveCoordinationCommittee,
  emptyCoordinationLedger,
  hasCoordinationDecisionCapability,
  readCoordinationDecision,
  recordCoordinationDecision,
  resolveCoordinationDecision,
  searchCoordinationDecisions,
  type CoordinationLedger,
  type CoordinationSession,
} from './coordination-decision';

const occurredAt = '2026-09-16T15:00:00.000Z';
const secretTitle = 'Decisión reservada de planta norte';

function session(overrides: Partial<CoordinationSession> = {}): CoordinationSession {
  return {
    organizationId: 'org-a',
    actorMemberId: 'member-1',
    actorLabel: 'Ana',
    grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
    cargo: null,
    title: null,
    ...overrides,
  };
}

function auxiliarWithoutCapability(): CoordinationSession {
  return session({
    actorMemberId: 'member-aux',
    actorLabel: 'Luis',
    cargo: 'Auxiliar',
    title: 'Auxiliar',
    grantedCapabilities: ['production', 'finance', 'warehouse', 'operations.coordinator.record'],
  });
}

function recordTitle(
  ledger: CoordinationLedger,
  actor: CoordinationSession,
  input: { id: string; decision: string; organizationId?: string },
) {
  return recordCoordinationDecision({
    session: actor,
    ledger,
    id: input.id,
    decision: input.decision,
    occurredAt,
    organizationId: input.organizationId,
  });
}

function ledgerWithSecret(): CoordinationLedger {
  const owner = session({ organizationId: 'org-b', grantedCapabilities: [COORDINATION_DECISION_CAPABILITY] });
  const recorded = recordTitle(emptyCoordinationLedger(), owner, {
    id: 'dec-secret',
    decision: secretTitle,
    organizationId: 'org-b',
  });
  assert.equal(recorded.ok, true);
  if (!recorded.ok) return emptyCoordinationLedger();
  return recorded.value.ledger;
}

describe('coordination committee', () => {
  it('yields an empty committee from empty input and does not require a meeting', () => {
    const committee = deriveCoordinationCommittee();
    assert.deepEqual(committee.items, []);
    assert.equal(committee.meetingRequired, false);
    assert.deepEqual(committee.meetings, []);
    assert.equal(COORDINATION_EMPTY_COMMITTEE_TITLE, 'No hay nada que necesite una decisión de comité.');

    const blank = deriveCoordinationCommittee({ organizationId: 'org-a', matters: [] });
    assert.equal(blank.items.length, 0);
  });

  it('does not invent a trigger, a case, or a name', () => {
    const committee = deriveCoordinationCommittee({
      organizationId: 'org-a',
      matters: [
        {
          id: 'bare',
          organizationId: 'org-a',
          cliente: 'Isa',
          payment: { exception: true },
          productionIssue: true,
        } as never,
        {
          id: 'dated',
          organizationId: 'org-a',
          fechaConElCliente: '2026-09-20',
        },
      ],
    });
    assert.equal(committee.items.length, 0);

    const triggered = deriveCoordinationCommittee({
      organizationId: 'org-a',
      matters: [
        {
          id: 'risk',
          organizationId: 'org-a',
          triggers: ['customer_date_at_risk'],
          pedido: 'PED-12',
        },
      ],
    });
    assert.equal(triggered.items.length, 1);
    const item = triggered.items[0];
    assert.ok(item);
    assert.equal(item.cliente, null);
    assert.equal(item.pedido, 'PED-12');
    assert.equal(item.productos, null);
    assert.equal(item.problema, null);
    assert.equal(item.areaResponsable, null);
    assert.equal(item.responsable, null);
    assert.equal(item.fechaConElCliente, null);
    assert.equal(item.fechaInterna, null);
    assert.equal(item.queCambio, null);
    assert.equal(item.clienteInformado, null);
    assert.equal(item.proximaAccion, null);
    assert.equal(item.linkedCaseId, null);
  });

  it('keeps this tenant committee empty when another tenant has open decisions', () => {
    const foreign = ledgerWithSecret();
    const committee = coordinationCommitteeForSession({
      session: session(),
      matters: [
        {
          id: 'foreign-matter',
          organizationId: 'org-b',
          triggers: ['delivery_blocked'],
          cliente: 'Cliente secreto',
          problema: secretTitle,
        },
      ],
      decisions: foreign.decisions,
    });
    assert.equal(committee.ok, true);
    if (!committee.ok) return;
    assert.equal(committee.value.items.length, 0);
    assert.equal(committee.value.meetingRequired, false);
    assert.equal(JSON.stringify(committee.value).includes(secretTitle), false);
    assert.equal(JSON.stringify(committee.value).includes('Cliente secreto'), false);
  });
});

describe('coordination decision recording', () => {
  it('does not delete a prior decision when another is recorded or resolved', () => {
    const first = recordCoordinationDecision({
      session: session(),
      ledger: emptyCoordinationLedger(),
      id: 'dec-1',
      decision: 'Esperar tela',
      ownerLabel: 'María',
      dueAt: '2026-09-18',
      occurredAt,
      linkedCaseId: 'case-1',
      notes: 'El área ya avisó',
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const prior = first.value.decision;

    const second = recordCoordinationDecision({
      session: session(),
      ledger: first.value.ledger,
      id: 'dec-2',
      decision: 'Cambiar la fecha interna',
      occurredAt: '2026-09-16T16:00:00.000Z',
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(first.value.ledger.decisions.length, 1);
    assert.equal(second.value.ledger.decisions[0], prior);
    assert.equal(prior.decision, 'Esperar tela');

    const resolved = resolveCoordinationDecision({
      session: session(),
      ledger: second.value.ledger,
      id: 'dec-1-res',
      resolvesDecisionId: 'dec-1',
      decision: 'Cerrada: tela llegó',
      occurredAt: '2026-09-16T18:00:00.000Z',
      notes: 'Resolución, no una reescritura',
    });
    assert.equal(resolved.ok, true);
    if (!resolved.ok) return;
    assert.equal(second.value.ledger.decisions.length, 2);
    assert.equal(resolved.value.ledger.decisions.length, 3);
    assert.equal(resolved.value.ledger.decisions[0], prior);
    assert.equal(prior.decision, 'Esperar tela');
    assert.equal(prior.kind, 'recorded');
    assert.equal(resolved.value.decision.kind, 'resolved');
    assert.equal(resolved.value.decision.resolvesDecisionId, 'dec-1');
    assert.notEqual(resolved.value.decision.id, prior.id);
  });

  it('does not mutate production or payment and does not grant their authority', () => {
    const production = { stage: 'corte', quantity: 10 };
    const payment = { confirmed: false, amount: 100 };
    const productionBefore = structuredClone(production);
    const paymentBefore = structuredClone(payment);
    const granted = [COORDINATION_DECISION_CAPABILITY];

    const recorded = recordCoordinationDecision({
      session: session({ grantedCapabilities: granted }),
      ledger: emptyCoordinationLedger(),
      id: 'dec-1',
      decision: 'Avisar al cliente',
      occurredAt,
      production,
      payment,
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    assert.equal(recorded.value.production, production);
    assert.equal(recorded.value.payment, payment);
    assert.deepEqual(production, productionBefore);
    assert.deepEqual(payment, paymentBefore);
    assert.equal(recorded.value.mutatedProduction, false);
    assert.equal(recorded.value.mutatedPayment, false);
    assert.equal(recorded.value.grantsProductionAuthority, false);
    assert.equal(recorded.value.grantsFinanceAuthority, false);
    assert.equal(recorded.value.grantsWarehouseAuthority, false);
    assert.equal(recorded.value.decision.grantsProductionAuthority, false);
    assert.equal(recorded.value.decision.grantsFinanceAuthority, false);
    assert.equal(recorded.value.decision.grantsWarehouseAuthority, false);
    assert.deepEqual(granted, [COORDINATION_DECISION_CAPABILITY]);
    assert.equal('productionStatus' in recorded.value.decision, false);
    assert.equal('paymentConfirmed' in recorded.value.decision, false);

    const blocked = recordCoordinationDecision({
      session: session(),
      ledger: recorded.value.ledger,
      id: 'dec-2',
      decision: 'No confirmar pago',
      occurredAt,
      production,
      payment,
      paymentConfirmed: true,
    } as never);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.equal(blocked.reason, 'forbidden_payment_mutation');
    assert.deepEqual(payment, paymentBefore);
    assert.equal(recorded.value.ledger.decisions.length, 1);
  });
});

describe('coordination decision isolation', () => {
  it('allows the same tenant when the capability is explicit', () => {
    const actor = session({ cargo: 'Auxiliar', title: 'Auxiliar' });
    const recorded = recordTitle(emptyCoordinationLedger(), actor, {
      id: 'dec-a',
      decision: 'Mover la fecha interna',
      organizationId: 'org-a',
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;

    const read = readCoordinationDecision({
      session: actor,
      ledger: recorded.value.ledger,
      decisionId: 'dec-a',
    });
    assert.equal(read.ok, true);
    if (!read.ok) return;
    assert.equal(read.value.decision, 'Mover la fecha interna');
    assert.equal(read.value.organizationId, 'org-a');
  });

  it('denies the same tenant when the role does not hold the capability', () => {
    const owner = session();
    const recorded = recordTitle(emptyCoordinationLedger(), owner, {
      id: 'dec-a',
      decision: 'Mover la fecha interna',
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;

    const auxiliar = auxiliarWithoutCapability();
    assert.equal(hasCoordinationDecisionCapability(auxiliar.grantedCapabilities), false);
    assert.deepEqual(coordinationCapabilityFromCargoOrTitle(auxiliar.cargo, auxiliar.title), []);

    const read = readCoordinationDecision({
      session: auxiliar,
      ledger: recorded.value.ledger,
      decisionId: 'dec-a',
    });
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.reason, 'unauthorized_role');

    const write = recordTitle(recorded.value.ledger, auxiliar, {
      id: 'dec-aux',
      decision: 'El auxiliar decide',
    });
    assert.equal(write.ok, false);
    if (!write.ok) assert.equal(write.reason, 'unauthorized_role');
    assert.equal(recorded.value.ledger.decisions.length, 1);

    const search = searchCoordinationDecisions({
      session: auxiliar,
      ledger: recorded.value.ledger,
      query: 'fecha',
    });
    assert.equal(search.ok, false);
    if (!search.ok) assert.equal(search.reason, 'unauthorized_role');

    const aggregate = aggregateCoordinationDecisions({
      session: auxiliar,
      ledger: recorded.value.ledger,
    });
    assert.equal(aggregate.ok, false);
    if (!aggregate.ok) assert.equal(aggregate.reason, 'unauthorized_role');
  });

  it('denies a cross-tenant read', () => {
    const foreign = ledgerWithSecret();
    const read = readCoordinationDecision({
      session: session(),
      ledger: foreign,
      decisionId: 'dec-secret',
    });
    assert.equal(read.ok, false);
    if (!read.ok) assert.equal(read.reason, 'cross_tenant');
    assert.equal(JSON.stringify(read).includes(secretTitle), false);
  });

  it('denies a direct call without a session organization', () => {
    const foreign = ledgerWithSecret();
    const missing = [undefined, null, '   '] as const;
    for (const organizationId of missing) {
      const actor = session({ organizationId });
      const read = readCoordinationDecision({
        session: actor,
        ledger: foreign,
        decisionId: 'dec-secret',
      });
      assert.equal(read.ok, false);
      if (!read.ok) assert.equal(read.reason, 'missing_session_org');
      assert.equal(JSON.stringify(read).includes(secretTitle), false);

      const write = recordCoordinationDecision({
        session: actor,
        ledger: foreign,
        id: 'dec-direct',
        decision: 'Sin organización',
        occurredAt,
        organizationId: 'org-b',
      });
      assert.equal(write.ok, false);
      if (!write.ok) assert.equal(write.reason, 'missing_session_org');

      const search = searchCoordinationDecisions({
        session: actor,
        ledger: foreign,
        query: secretTitle,
        organizationId: 'org-b',
      });
      assert.equal(search.ok, false);
      if (!search.ok) assert.equal(search.reason, 'missing_session_org');
      assert.equal(JSON.stringify(search).includes(secretTitle), false);

      const aggregate = aggregateCoordinationDecisions({
        session: actor,
        ledger: foreign,
        organizationId: 'org-b',
      });
      assert.equal(aggregate.ok, false);
      if (!aggregate.ok) assert.equal(aggregate.reason, 'missing_session_org');

      const committee = coordinationCommitteeForSession({
        session: actor,
        decisions: foreign.decisions,
      });
      assert.equal(committee.ok, false);
      if (!committee.ok) assert.equal(committee.reason, 'missing_session_org');
      assert.equal(JSON.stringify(committee).includes(secretTitle), false);
    }
    assert.equal(foreign.decisions.length, 1);
  });

  it('denies search leakage of another tenant decision title', () => {
    const owner = session({ organizationId: 'org-b' });
    const recorded = recordTitle(emptyCoordinationLedger(), owner, {
      id: 'dec-secret',
      decision: secretTitle,
      organizationId: 'org-b',
    });
    assert.equal(recorded.ok, true);
    if (!recorded.ok) return;
    const own = recordTitle(recorded.value.ledger, session(), {
      id: 'dec-own',
      decision: 'Fecha interna de esta planta',
      organizationId: 'org-a',
    });
    assert.equal(own.ok, true);
    if (!own.ok) return;

    const leaked = searchCoordinationDecisions({
      session: session(),
      ledger: own.value.ledger,
      query: secretTitle,
    });
    assert.equal(leaked.ok, true);
    if (!leaked.ok) return;
    assert.equal(leaked.value.items.length, 0);
    assert.equal(JSON.stringify(leaked).includes(secretTitle), false);

    const byOtherOrg = searchCoordinationDecisions({
      session: session(),
      ledger: own.value.ledger,
      query: 'planta',
      organizationId: 'org-b',
    });
    assert.equal(byOtherOrg.ok, false);
    if (!byOtherOrg.ok) assert.equal(byOtherOrg.reason, 'cross_tenant');
    assert.equal(JSON.stringify(byOtherOrg).includes(secretTitle), false);

    const ownSearch = searchCoordinationDecisions({
      session: session(),
      ledger: own.value.ledger,
      query: 'Fecha interna',
    });
    assert.equal(ownSearch.ok, true);
    if (!ownSearch.ok) return;
    assert.equal(ownSearch.value.items.length, 1);
    assert.equal(ownSearch.value.items[0]?.decision, 'Fecha interna de esta planta');
    assert.equal(JSON.stringify(ownSearch.value.items).includes(secretTitle), false);
  });

  it('denies aggregate leakage of another tenant open decisions', () => {
    const foreign = ledgerWithSecret();
    const alsoForeign = recordTitle(foreign, session({ organizationId: 'org-b' }), {
      id: 'dec-secret-2',
      decision: 'Otra decisión de planta norte',
      organizationId: 'org-b',
    });
    assert.equal(alsoForeign.ok, true);
    if (!alsoForeign.ok) return;

    const aggregate = aggregateCoordinationDecisions({
      session: session(),
      ledger: alsoForeign.value.ledger,
    });
    assert.equal(aggregate.ok, true);
    if (!aggregate.ok) return;
    assert.equal(aggregate.value.organizationId, 'org-a');
    assert.equal(aggregate.value.openDecisions, 0);
    assert.equal(aggregate.value.recordedDecisions, 0);
    assert.equal(aggregate.value.resolvedDecisions, 0);
    assert.equal(JSON.stringify(aggregate).includes(secretTitle), false);

    const requested = aggregateCoordinationDecisions({
      session: session(),
      ledger: alsoForeign.value.ledger,
      organizationId: 'org-b',
    });
    assert.equal(requested.ok, false);
    if (!requested.ok) assert.equal(requested.reason, 'cross_tenant');
    assert.equal(JSON.stringify(requested).includes('openDecisions'), false);
    assert.equal(JSON.stringify(requested).includes(secretTitle), false);

    const foreignAggregate = aggregateCoordinationDecisions({
      session: session({ organizationId: 'org-b' }),
      ledger: alsoForeign.value.ledger,
    });
    assert.equal(foreignAggregate.ok, true);
    if (!foreignAggregate.ok) return;
    assert.equal(foreignAggregate.value.openDecisions, 2);
  });
});

describe('coordination capability', () => {
  it('does not grant the capability from cargo or title', () => {
    const titles = ['Auxiliar', 'Encargado de producción', 'Coordinador', 'encargada de compras'];
    for (const title of titles) {
      assert.deepEqual(coordinationCapabilityFromCargoOrTitle(title, title), []);
      assert.equal(
        hasCoordinationDecisionCapability(coordinationCapabilityFromCargoOrTitle(title, title)),
        false,
      );
    }
    assert.equal(hasCoordinationDecisionCapability(['production', 'finance', 'warehouse']), false);
    assert.equal(hasCoordinationDecisionCapability([COORDINATION_DECISION_CAPABILITY]), true);
  });
});
