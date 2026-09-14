import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import type {
  AttentionItemReadModel,
  OpportunitySummaryReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import {
  composeExecutiveCommand,
  EXECUTIVE_LEAD,
  EXECUTIVE_PARTIAL_NOTE,
  EXECUTIVE_QUOTE_AGE_NOTE,
  submittedQuoteAttentionLine,
  visibleExecutiveSlice,
} from '@/lib/executive/command-center';

const AS_OF = new Date('2026-09-14T16:00:00.000Z');
const appRoot = resolve(__dirname, '../..');

function readApp(path: string): string {
  return readFileSync(resolve(appRoot, path), 'utf8');
}

function work(overrides: Partial<WorkSummaryReadModel> = {}): WorkSummaryReadModel {
  return {
    workItemId: 'work-1',
    organizationId: 'org-1',
    title: 'Confirmar entrega',
    description: null,
    status: 'open',
    priority: 'normal',
    ownerMemberId: 'mem-ana',
    createdByMemberId: 'mem-ana',
    subjectType: 'party',
    subjectId: 'party-1',
    dueAt: '2026-09-20T15:00:00.000Z',
    completedAt: null,
    cancelledAt: null,
    pendingApprovalId: null,
    approvalStatus: 'none',
    ownershipChangeCount: 0,
    lastOwnershipChangeAt: null,
    ...overrides,
  };
}

function quote(overrides: Partial<QuoteSummaryReadModel> = {}): QuoteSummaryReadModel {
  return {
    quoteId: 'quote-1',
    organizationId: 'org-1',
    partyId: 'party-1',
    commercialAccountId: null,
    opportunityId: null,
    ownerMemberId: 'mem-ana',
    quoteNumber: 'COT-14',
    status: 'submitted',
    currency: 'BOB',
    subtotalCentavos: '1000',
    headerDiscountCentavos: '0',
    totalCentavos: '1000',
    revisionNumber: 1,
    notes: null,
    submittedAt: '2026-09-11T16:00:00.000Z',
    cancelledAt: null,
    createdAt: '2026-09-01T16:00:00.000Z',
    ...overrides,
  };
}

function opportunity(): OpportunitySummaryReadModel {
  return {
    opportunityId: 'opp-1',
    organizationId: 'org-1',
    partyId: 'party-1',
    commercialAccountId: null,
    ownerMemberId: 'mem-ana',
    title: 'Reposición de vidrio',
    stage: 'proposal',
    status: 'open',
    expectedValueCentavos: '5000',
    closedAt: null,
    createdAt: '2026-08-01T16:00:00.000Z',
  };
}

function attention(overrides: Partial<AttentionItemReadModel> = {}): AttentionItemReadModel {
  return {
    attentionKey: 'approval:approver:appr-9',
    organizationId: 'org-1',
    memberId: 'mem-luz',
    attentionType: 'pending_approval',
    reasonCode: 'approval.pending.for_you',
    reasonDetail: { title: 'Aprobar cambio de pedido' },
    resourceType: 'approval_request',
    resourceId: 'appr-9',
    workItemId: null,
    approvalRequestId: 'appr-9',
    subjectType: 'party',
    subjectId: 'party-2',
    isActive: true,
    ...overrides,
  };
}

const labels = {
  members: new Map([
    ['mem-ana', 'Ana Rojas'],
    ['mem-luz', 'Luz Vargas'],
  ]),
  parties: new Map([
    ['party-1', 'Vidriería Norte'],
    ['party-2', 'Casa Sur'],
  ]),
};

describe('executive command center', () => {
  it('stays empty when the loaded records have no exceptions', () => {
    const model = composeExecutiveCommand({
      opportunities: [opportunity()],
      quotesDraft: [quote({ status: 'draft', submittedAt: null, quoteNumber: 'COT-1' })],
      quotesSubmitted: [],
      openWork: [work({ dueAt: '2026-01-01T10:00:00.000Z' })],
      overdueWork: [],
      followUps: [work({ workItemId: 'follow-1', title: 'Llamar al cliente' })],
      asOf: AS_OF,
      memberLabels: labels.members,
      partyLabels: labels.parties,
    });

    assert.equal(model.empty, true);
    assert.equal(model.overdue.length, 0);
    assert.equal(model.pendingDecisions.length, 0);
    assert.equal(model.quoteWaiting.length, 0);
    assert.equal(model.bottlenecks.length, 0);
    assert.equal(model.lead, EXECUTIVE_LEAD);
    assert.equal(JSON.stringify(model).includes('centavos'), false);
    assert.equal(JSON.stringify(model).includes('5000'), false);
  });

  it('uses the overdue list as the fact and does not reclassify a past due date', () => {
    const pastDueOnly = work({
      workItemId: 'dated-open',
      title: 'Fecha pasada sin clasificación',
      dueAt: '2026-01-01T10:00:00.000Z',
    });
    const derived = work({
      workItemId: 'derived-overdue',
      title: 'Entrega ya vencida',
      dueAt: '2026-09-01T10:00:00.000Z',
      ownerMemberId: 'mem-ana',
    });
    const model = composeExecutiveCommand({
      openWork: [pastDueOnly, derived],
      overdueWork: [derived],
      asOf: AS_OF,
      memberLabels: labels.members,
      partyLabels: labels.parties,
    });

    assert.deepEqual(
      model.overdue.map((item) => item.title),
      ['Entrega ya vencida · Vidriería Norte'],
    );
    assert.match(model.overdue[0]?.detail ?? '', /Vencido/);
    assert.equal(model.overdue.some((item) => item.title.includes('Fecha pasada')), false);
  });

  it('treats a stored pending approval as a decision and not a new rule', () => {
    const pending = work({
      workItemId: 'needs-decision',
      title: 'Confirmar descuento',
      approvalStatus: 'pending',
      pendingApprovalId: 'appr-1',
      ownerMemberId: 'mem-luz',
      subjectId: 'party-2',
    });
    const closed = work({
      ...pending,
      workItemId: 'closed-pending',
      status: 'completed',
      title: 'Ya cerrado',
    });
    const model = composeExecutiveCommand({
      openWork: [pending, closed],
      overdueWork: [],
      asOf: AS_OF,
      memberLabels: labels.members,
      partyLabels: labels.parties,
    });

    assert.equal(model.pendingDecisions.length, 1);
    assert.equal(model.pendingDecisions[0]?.detail, 'Aprobación pendiente.');
    assert.equal(model.pendingDecisions[0]?.href, '/trabajo/needs-decision');
    assert.equal(model.pendingDecisions.some((item) => item.title.includes('Ya cerrado')), false);
  });

  it('ages submitted quotes from the stored send instant and does not invent a deadline', () => {
    const older = quote({
      quoteId: 'older',
      quoteNumber: 'COT-2',
      submittedAt: '2026-09-10T16:00:00.000Z',
    });
    const newer = quote({
      quoteId: 'newer',
      quoteNumber: 'COT-9',
      submittedAt: '2026-09-13T16:00:00.000Z',
      partyId: 'party-2',
      ownerMemberId: 'mem-luz',
    });
    const model = composeExecutiveCommand({
      quotesSubmitted: [
        newer,
        older,
        quote({ status: 'accepted', quoteNumber: 'COT-OK' }),
        quote({ submittedAt: null, quoteNumber: 'COT-NO-DATE' }),
        quote({ quoteNumber: 'CC3ORD-1', notes: 'synthetic (staging)' }),
      ],
      asOf: AS_OF,
      memberLabels: labels.members,
      partyLabels: labels.parties,
    });

    assert.deepEqual(
      model.quoteWaiting.map((item) => item.title),
      ['COT-2 · Vidriería Norte', 'COT-9 · Casa Sur'],
    );
    assert.equal(model.quoteWaiting[0]?.agePhrase, 'hace 4 días');
    assert.match(EXECUTIVE_QUOTE_AGE_NOTE, /No es un plazo incumplido/);
    assert.equal(
      submittedQuoteAttentionLine(2, model.quoteWaiting[0]?.agePhrase ?? null),
      '2 cotizaciones enviadas. La más antigua, hace 4 días. No es un plazo incumplido.',
    );
    assert.equal(model.quoteWaiting.some((item) => item.title.includes('CC3')), false);
    assert.equal(
      composeExecutiveCommand({
        quotesSubmitted: [quote({ partyId: 'party-fixture', quoteNumber: 'COT-FIX' })],
        overdueWork: [
          work({
            workItemId: 'fixture-work',
            title: 'Entrega de prueba',
            subjectId: 'party-fixture',
          }),
        ],
        partyLabels: new Map([['party-fixture', 'Cliente Step17 Norte']]),
        asOf: AS_OF,
      }).empty,
      true,
    );
  });

  it('groups exceptions by responsible person and customer without a score', () => {
    const overdue = work({
      workItemId: 'overdue-ana',
      title: 'Visita vencida',
      ownerMemberId: 'mem-ana',
      subjectId: 'party-1',
    });
    const pending = work({
      workItemId: 'pending-luz',
      title: 'Autorizar cambio',
      ownerMemberId: 'mem-luz',
      subjectId: 'party-2',
      approvalStatus: 'pending',
      pendingApprovalId: 'appr-2',
    });
    const model = composeExecutiveCommand({
      overdueWork: [overdue],
      openWork: [pending],
      quotesSubmitted: [
        quote({ ownerMemberId: 'mem-ana', partyId: 'party-1' }),
        quote({
          quoteId: 'quote-luz',
          quoteNumber: 'COT-20',
          ownerMemberId: 'mem-luz',
          partyId: 'party-2',
        }),
      ],
      asOf: AS_OF,
      memberLabels: labels.members,
      partyLabels: labels.parties,
    });

    assert.deepEqual(
      model.bottlenecks.map((group) => group.label),
      ['Ana Rojas', 'Luz Vargas'],
    );
    assert.equal(
      model.bottlenecks.every((group) =>
        group.exceptions.every((item) => item.kind !== 'submitted_quote'),
      ),
      true,
    );
    assert.deepEqual(
      model.byResponsible.map((group) => group.label),
      ['Ana Rojas', 'Luz Vargas'],
    );
    assert.equal(model.byResponsible[0]?.exceptions.some((item) => item.kind === 'submitted_quote'), true);
    assert.deepEqual(
      model.byCustomer.map((group) => group.label),
      ['Vidriería Norte', 'Casa Sur'],
    );
    assert.equal(model.byCustomer[0]?.href, '/clientes/party-1');
    assert.equal('score' in model, false);
    assert.equal(JSON.stringify(model).includes('"score"'), false);
  });

  it('omits person and customer groups when names were not loaded', () => {
    const model = composeExecutiveCommand({
      overdueWork: [work({ title: 'Entrega vencida' })],
      identity: 'omit',
      asOf: AS_OF,
    });
    assert.equal(model.overdue.length, 1);
    assert.equal(model.bottlenecks.length, 0);
    assert.equal(model.byResponsible.length, 0);
    assert.equal(model.byCustomer.length, 0);
  });

  it('consumes attention groups and does not promote ordinary open work', () => {
    const model = composeExecutiveCommand({
      attentionItems: [
        attention(),
        attention({
          attentionKey: 'work:owner:work-open',
          attentionType: 'open_work_assigned',
          reasonCode: 'work.open.owned',
          reasonDetail: { title: 'Trabajo abierto cualquiera' },
          resourceType: 'work_item',
          resourceId: 'work-open',
          workItemId: 'work-open',
          approvalRequestId: null,
          memberId: 'mem-ana',
        }),
        attention({
          attentionKey: 'work:overdue:work-att',
          attentionType: 'overdue_work',
          reasonCode: 'work.open.overdue',
          reasonDetail: { title: 'Cobro interno vencido', dueAt: '2026-09-01T10:00:00.000Z' },
          resourceType: 'work_item',
          resourceId: 'work-att',
          workItemId: 'work-att',
          approvalRequestId: null,
          memberId: 'mem-ana',
          subjectId: 'party-1',
        }),
      ],
      memberLabels: labels.members,
      partyLabels: labels.parties,
      asOf: AS_OF,
    });

    assert.equal(model.pendingDecisions.length, 1);
    assert.equal(model.pendingDecisions[0]?.href, '/aprobaciones/appr-9');
    assert.equal(model.overdue.length, 1);
    assert.match(model.overdue[0]?.title ?? '', /Cobro interno vencido/);
    assert.equal(model.overdue.some((item) => item.title.includes('Trabajo abierto cualquiera')), false);
    assert.equal(model.pendingDecisions.some((item) => item.title.includes('Trabajo abierto cualquiera')), false);
  });

  it('does not duplicate a decision already present on the work record', () => {
    const pending = work({
      workItemId: 'work-shared',
      title: 'Misma decisión',
      approvalStatus: 'pending',
      pendingApprovalId: 'appr-shared',
    });
    const model = composeExecutiveCommand({
      openWork: [pending],
      attentionItems: [
        attention({
          workItemId: 'work-shared',
          approvalRequestId: 'appr-shared',
          resourceId: 'appr-shared',
          reasonDetail: { title: 'Misma decisión' },
        }),
      ],
      memberLabels: labels.members,
      partyLabels: labels.parties,
      asOf: AS_OF,
    });
    assert.equal(model.pendingDecisions.length, 1);
    assert.equal(model.pendingDecisions[0]?.id, 'decision:work-shared');
  });

  it('marks a partial page and never presents it as a company total', () => {
    const model = composeExecutiveCommand({ partial: true, asOf: AS_OF });
    assert.equal(model.partial, true);
    assert.equal(model.partialNote, EXECUTIVE_PARTIAL_NOTE);
    assert.match(model.partialNote ?? '', /No es el total/);
  });

  it('slices a long exception list without dropping the hidden count', () => {
    const sliced = visibleExecutiveSlice([1, 2, 3, 4, 5], 2);
    assert.deepEqual(sliced.items, [1, 2]);
    assert.equal(sliced.hidden, 3);
  });
});

describe('executive surfaces stay honest', () => {
  it('keeps the commercial labels and does not invent collected revenue', () => {
    const lens = readApp('components/commercial/executive-lens.tsx');
    const panel = readApp('components/executive/command-center-panel.tsx');
    const logic = readApp('lib/executive/command-center.ts');
    const demo = readApp('components/commercial/demo-preview-cards.tsx');

    assert.match(lens, /Valor cotizado/);
    assert.match(lens, /Valor de pedidos/);
    assert.match(lens, /Oportunidades activas/);
    assert.doesNotMatch(lens, /Ingresos|Revenue|Ventas cobradas/);
    assert.doesNotMatch(`${lens}\n${panel}\n${logic}`, /MetricCard|StatGroup|walkthrough/i);
    assert.doesNotMatch(`${panel}\n${logic}`, /INGRESOS COBRADOS|COBRANZA|DESPACHOS/);
    assert.match(demo, /Vista demo/);
    assert.match(demo, /INGRESOS COBRADOS/);
    assert.doesNotMatch(logic, /commitment/i);
  });

  it('keeps leadership lists read-only and leads with the exception composition', () => {
    const section = readApp('components/commercial/inicio-leadership-section.tsx');
    assert.match(section, /showAmount=\{false\}/);
    assert.match(section, /showApproval=\{false\}/);
    assert.match(section, /ExecutiveCommandCenter/);
    assert.match(section, /overdueWork: data\.overdueWork/);
    assert.doesNotMatch(section, /revenue|ranking|quota|forecast|score|kpi|ReassignWork|people\.admin/i);
  });
});
