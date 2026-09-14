import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  COORDINATION_DECISION_CAPABILITY,
  emptyCoordinationLedger,
  recordCoordinationDecision,
  type CoordinationDecisionRecord,
  type ProductionIssue,
  type PurchaseRequest,
} from '@isalwa/os-contracts';
import { coordinationMattersFromOperatingFacts, unavailableOperatingFacts } from './facts';
import {
  COORDINATION_RECORD_BUTTON,
  buildCoordinationPageModel,
  canRecordCoordinationDecision,
  coordinationCapabilitiesForMember,
} from './page-model';
import { COORDINACION_NAV_REQUEST } from '../navigation/requests/coordinacion';

const occurredAt = '2026-09-16T15:00:00.000Z';
const secretTitle = 'Decisión reservada de planta norte';

describe('coordination page model', () => {
  it('says there is nothing that needs a committee decision when input is empty', () => {
    const model = buildCoordinationPageModel({
      session: { organizationId: 'org-a', actorLabel: 'Ana', grantedCapabilities: [] },
    });
    assert.equal(model.committee.items.length, 0);
    assert.equal(model.committee.meetingRequired, false);
    assert.equal(model.emptyTitle, 'No hay asuntos que requieren decisión conjunta.');
    assert.equal(model.openDecisions.length, 0);
    assert.equal(COORDINATION_RECORD_BUTTON, 'REGISTRAR DECISIÓN');
  });

  it('does not infer the capability from a job title', () => {
    const granted = coordinationCapabilitiesForMember({
      cargo: 'Auxiliar',
      title: 'Auxiliar',
      grantedCapabilities: ['production', 'finance', 'warehouse'],
    });
    assert.deepEqual(granted, []);
    assert.equal(
      canRecordCoordinationDecision({
        organizationId: 'org-a',
        cargo: 'Auxiliar',
        title: 'Coordinador',
        grantedCapabilities: granted,
      }),
      false,
    );
    assert.equal(
      canRecordCoordinationDecision({
        organizationId: 'org-a',
        cargo: 'Auxiliar',
        title: 'Auxiliar',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      }),
      true,
    );
    assert.equal(COORDINACION_NAV_REQUEST.capability, COORDINATION_DECISION_CAPABILITY);
    assert.equal(COORDINACION_NAV_REQUEST.infersCapabilityFromTitle, false);
  });

  it('keeps this tenant empty when another tenant has open decisions', () => {
    const foreign = recordCoordinationDecision({
      session: {
        organizationId: 'org-b',
        actorMemberId: 'member-b',
        actorLabel: 'Norte',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      ledger: emptyCoordinationLedger(),
      id: 'dec-secret',
      decision: secretTitle,
      occurredAt,
      organizationId: 'org-b',
    });
    assert.equal(foreign.ok, true);
    if (!foreign.ok) return;

    const model = buildCoordinationPageModel({
      session: {
        organizationId: 'org-a',
        actorLabel: 'Ana',
        cargo: 'Auxiliar',
        title: 'Auxiliar',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      matters: [
        {
          id: 'foreign-matter',
          organizationId: 'org-b',
          triggers: ['delivery_blocked'],
          cliente: 'Cliente secreto',
          problema: secretTitle,
        },
      ],
      decisions: foreign.value.ledger.decisions,
    });
    assert.equal(model.committee.items.length, 0);
    assert.equal(model.openDecisions.length, 0);
    assert.equal(model.ledger.decisions.length, 0);
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
    assert.equal(JSON.stringify(model).includes('Cliente secreto'), false);
  });

  it('does not show another tenant title when the session organization is missing', () => {
    const foreign = recordCoordinationDecision({
      session: {
        organizationId: 'org-b',
        actorLabel: 'Norte',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      ledger: emptyCoordinationLedger(),
      id: 'dec-secret',
      decision: secretTitle,
      occurredAt,
    });
    assert.equal(foreign.ok, true);
    if (!foreign.ok) return;

    const model = buildCoordinationPageModel({
      session: { organizationId: '   ', title: 'Auxiliar', grantedCapabilities: [COORDINATION_DECISION_CAPABILITY] },
      decisions: foreign.value.ledger.decisions,
    });
    assert.equal(model.organizationId, null);
    assert.equal(model.canRecord, false);
    assert.equal(model.committee.items.length, 0);
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
  });
});

function purchase(overrides: Partial<PurchaseRequest> & Pick<PurchaseRequest, 'id' | 'organizationId' | 'description'>): PurchaseRequest {
  return {
    requestingArea: 'Producción',
    requestedByLabel: 'Ana',
    requestedByMemberId: null,
    quantity: null,
    unit: null,
    productionContextId: null,
    orderId: null,
    reason: 'Falta tela',
    requestedAt: occurredAt,
    status: 'solicitado',
    buyerLabel: null,
    buyerMemberId: null,
    notes: [],
    statusHistory: [],
    actorLabel: 'Ana',
    actorMemberId: null,
    source: 'manual',
    stockAuthority: 'not_official',
    reorderPolicy: 'none',
    claimsOfficialStock: false,
    triggersReorder: false,
    idempotencyKey: null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    ...overrides,
  };
}

function issue(overrides: Partial<ProductionIssue> & Pick<ProductionIssue, 'id' | 'organizationId' | 'note'>): ProductionIssue {
  return {
    subjectType: 'order',
    subjectId: 'PED-1',
    mayAffectProductionCalendar: false,
    mayAffectCustomerDate: true,
    source: 'human_explicit',
    recordedByMemberId: 'member-1',
    recordedAt: occurredAt,
    ...overrides,
  };
}

function recorded(id: string, organizationId: string, decision: string, dueAt: string | null): CoordinationDecisionRecord {
  return {
    id,
    organizationId,
    kind: 'recorded',
    decision,
    ownerLabel: 'María',
    ownerMemberId: null,
    dueAt,
    actorLabel: 'Ana',
    actorMemberId: 'member-1',
    occurredAt,
    linkedCaseId: null,
    notes: null,
    resolvesDecisionId: null,
    recordedAt: occurredAt,
    grantsProductionAuthority: false,
    grantsFinanceAuthority: false,
    grantsWarehouseAuthority: false,
  };
}

describe('coordination live list from operating facts', () => {
  it('leaves every operating fact unproven when no tenant-scoped query exists', () => {
    const facts = coordinationMattersFromOperatingFacts({
      organizationId: 'org-a',
      facts: unavailableOperatingFacts(),
    });
    assert.equal(facts.matters.length, 0);
    for (const proof of Object.values(facts.proofs)) {
      assert.equal(proof.status, 'UNPROVEN');
      assert.equal('itemCount' in proof, false);
    }

    const model = buildCoordinationPageModel({
      session: { organizationId: 'org-a', actorLabel: 'Ana', cargo: 'Auxiliar', title: 'Auxiliar' },
      facts: unavailableOperatingFacts(),
    });
    assert.equal(model.committee.items.length, 0);
    assert.equal(model.emptyTitle, 'No hay asuntos que requieren decisión conjunta.');
    assert.equal(model.canRecord, false);
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
  });

  it('generates only fields that exist and drops another tenant title and count', () => {
    const model = buildCoordinationPageModel({
      session: {
        organizationId: 'org-a',
        actorLabel: 'Ana',
        grantedCapabilities: [COORDINATION_DECISION_CAPABILITY],
      },
      facts: {
        purchases: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            purchase({
              id: 'own-purchase',
              organizationId: 'org-a',
              description: 'Tela para el pedido propio',
              orderId: 'PED-9',
              buyerLabel: 'Compras',
            }),
            purchase({
              id: 'foreign-purchase',
              organizationId: 'org-b',
              description: secretTitle,
              requestingArea: 'Planta norte',
            }),
          ],
        },
        customerDateIssues: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            issue({ id: 'own-issue', organizationId: 'org-a', note: 'La fecha puede moverse', subjectId: 'PED-9' }),
            issue({ id: 'foreign-issue', organizationId: 'org-b', note: secretTitle, subjectId: 'PED-secreto' }),
          ],
        },
        customerDates: { status: 'unavailable' },
        productionDates: { status: 'unavailable' },
        informedRecords: { status: 'unavailable' },
        specialOrders: {
          status: 'scoped',
          organizationId: 'org-b',
          rows: [
            {
              id: 'foreign-special',
              organizationId: 'org-b',
              orderId: 'PED-secreto',
              classification: 'special',
              requiresProductionPlanning: true,
              recordedAt: occurredAt,
            },
          ],
        },
        commercialExceptions: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            {
              id: 'foreign-exception',
              organizationId: 'org-b',
              explicit: true,
              cliente: 'Cliente secreto',
              problema: secretTitle,
            },
          ],
        },
        deliveryBlocked: {
          status: 'scoped',
          organizationId: 'org-b',
          rows: [
            {
              id: 'foreign-delivery',
              organizationId: 'org-b',
              explicit: true,
              blocked: true,
              problema: secretTitle,
            },
          ],
        },
        missingEvidence: { status: 'unavailable' },
        finishedGoods: {
          receipts: {
            status: 'scoped',
            organizationId: 'org-b',
            rows: [
              {
                organizationId: 'org-b',
                productId: 'producto-secreto',
                quantity: '4',
                receiptId: 'rec-secret',
              },
            ],
          },
          allocations: { status: 'scoped', organizationId: 'org-b', rows: [] },
        },
        decisions: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            recorded('own-open', 'org-a', 'Esperar tela', '2026-09-20'),
            recorded('foreign-overdue', 'org-b', secretTitle, '2026-09-01'),
            recorded('foreign-open', 'org-b', 'Otra decisión de planta norte', '2026-09-01'),
          ],
        },
        asOf: '2026-09-16T15:00:00.000Z',
      },
    });

    assert.equal(model.committee.items.length, 2);
    assert.equal(model.factProofs.purchase_pending.status, 'generated');
    if (model.factProofs.purchase_pending.status === 'generated') {
      assert.equal(model.factProofs.purchase_pending.itemCount, 1);
    }
    assert.equal(model.factProofs.customer_date_at_risk.status, 'generated');
    if (model.factProofs.customer_date_at_risk.status === 'generated') {
      assert.equal(model.factProofs.customer_date_at_risk.itemCount, 1);
    }
    assert.equal(model.factProofs.special_order_decision.status, 'UNPROVEN');
    assert.equal(model.factProofs.delivery_blocked.status, 'UNPROVEN');
    assert.equal(model.factProofs.finished_goods_awaiting_allocation.status, 'UNPROVEN');
    assert.equal(model.factProofs.critical_missing_evidence.status, 'UNPROVEN');
    assert.equal(model.factProofs.customer_not_informed.status, 'UNPROVEN');
    assert.equal(model.factProofs.previous_decision_overdue.status, 'generated');
    if (model.factProofs.previous_decision_overdue.status === 'generated') {
      assert.equal(model.factProofs.previous_decision_overdue.itemCount, 0);
    }
    assert.equal(JSON.stringify(model).includes(secretTitle), false);
    assert.equal(JSON.stringify(model).includes('Cliente secreto'), false);
    assert.equal(JSON.stringify(model).includes('PED-secreto'), false);
    assert.equal(JSON.stringify(model).includes('producto-secreto'), false);
    assert.equal(JSON.stringify(model).includes('Planta norte'), false);

    const purchaseItem = model.committee.items.find((item) => item.id === 'purchase:own-purchase');
    assert.ok(purchaseItem);
    assert.equal(purchaseItem.pedido, 'PED-9');
    assert.equal(purchaseItem.problema, 'Tela para el pedido propio');
    assert.equal(purchaseItem.areaResponsable, 'Producción');
    assert.equal(purchaseItem.responsable, 'Compras');
    assert.equal(purchaseItem.cliente, null);
    assert.equal(purchaseItem.productos, null);
    assert.equal(purchaseItem.fechaConElCliente, null);
    assert.equal(purchaseItem.clienteInformado, null);

    const dateItem = model.committee.items.find((item) => item.id === 'issue:own-issue');
    assert.ok(dateItem);
    assert.equal(dateItem.pedido, 'PED-9');
    assert.equal(dateItem.problema, 'La fecha puede moverse');
    assert.equal(dateItem.cliente, null);
    assert.equal(dateItem.fechaConElCliente, null);
    assert.equal(dateItem.clienteInformado, null);
    assert.equal(dateItem.triggers.includes('customer_not_informed'), false);
  });

  it('does not invent a special-order matter from quantity or a title', () => {
    const facts = coordinationMattersFromOperatingFacts({
      organizationId: 'org-a',
      facts: {
        specialOrders: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            {
              id: 'normal',
              organizationId: 'org-a',
              orderId: 'PED-1',
              classification: 'normal',
              requiresProductionPlanning: false,
              recordedAt: occurredAt,
            },
            {
              id: 'special-without-planning',
              organizationId: 'org-a',
              orderId: 'PED-2',
              classification: 'special',
              requiresProductionPlanning: false,
              recordedAt: occurredAt,
            },
          ],
        },
      },
    });
    assert.equal(facts.matters.length, 0);
    assert.equal(facts.proofs.special_order_decision.status, 'generated');
    if (facts.proofs.special_order_decision.status === 'generated') {
      assert.equal(facts.proofs.special_order_decision.itemCount, 0);
    }
  });

  it('generates a planning decision and an overdue decision without the other tenant', () => {
    const facts = coordinationMattersFromOperatingFacts({
      organizationId: 'org-a',
      facts: {
        specialOrders: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            {
              id: 'own-special',
              organizationId: 'org-a',
              orderId: 'PED-4',
              classification: 'special',
              requiresProductionPlanning: true,
              recordedAt: occurredAt,
              previousClassification: 'normal',
            },
            {
              id: 'foreign-special',
              organizationId: 'org-b',
              orderId: 'PED-secreto',
              classification: 'special',
              requiresProductionPlanning: true,
              recordedAt: occurredAt,
            },
          ],
        },
        decisions: {
          status: 'scoped',
          organizationId: 'org-a',
          rows: [
            recorded('own-overdue', 'org-a', 'Avisar al cliente', '2026-09-10'),
            recorded('foreign-overdue', 'org-b', secretTitle, '2026-09-01'),
          ],
        },
        asOf: '2026-09-16T15:00:00.000Z',
      },
    });
    assert.equal(facts.matters.length, 2);
    assert.equal(facts.proofs.special_order_decision.status, 'generated');
    assert.equal(facts.proofs.previous_decision_overdue.status, 'generated');
    if (facts.proofs.special_order_decision.status === 'generated') {
      assert.equal(facts.proofs.special_order_decision.itemCount, 1);
    }
    if (facts.proofs.previous_decision_overdue.status === 'generated') {
      assert.equal(facts.proofs.previous_decision_overdue.itemCount, 1);
    }
    const planning = facts.matters.find((item) => item.id === 'special:PED-4');
    assert.ok(planning);
    assert.equal(planning.pedido, 'PED-4');
    assert.equal(planning.problema, 'Requiere planificación de producción');
    assert.equal(planning.queCambio, 'Clasificación anterior: Pedido normal');
    assert.equal(planning.cliente, null);
    assert.equal(planning.responsable, null);
    const overdue = facts.matters.find((item) => item.id === 'overdue:own-overdue');
    assert.ok(overdue);
    assert.equal(overdue.problema, 'Avisar al cliente');
    assert.equal(overdue.responsable, 'María');
    assert.equal(overdue.fechaConElCliente, null);
    assert.equal(JSON.stringify(facts).includes(secretTitle), false);
    assert.equal(JSON.stringify(facts).includes('PED-secreto'), false);
  });
});
