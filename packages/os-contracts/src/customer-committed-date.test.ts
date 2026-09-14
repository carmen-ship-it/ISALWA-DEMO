import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import {
  CUSTOMER_COMMITTED_DATE_LABEL,
  CUSTOMER_DATE_EARLY_WARNING_LABEL,
  CUSTOMER_DATE_RISK_FLAG_LABEL,
  CUSTOMER_DATE_SOURCE,
  CUSTOMER_INFORMED_LABEL,
  CUSTOMER_NOT_INFORMED_LABEL,
  PRODUCTION_DATE_SOURCE,
  PRODUCTION_INTERNAL_TARGET_LABEL,
  customerDateAttentionItems,
  customerDateEarlyWarning,
  customerDateHasSeparateProductionTarget,
  customerDatePredictsDelay,
  customerNotifiedState,
  establishCustomerCommittedDate,
  establishProductionInternalTargetDate,
  issueTriggerIsAi,
  managementDateDivergence,
  recordCustomerInformed,
  recordProductionIssue,
  recordedDateDivergence,
  reviseCustomerCommittedDate,
  reviseProductionInternalTargetDate,
  type CustomerCommittedDate,
  type CustomerDateViewer,
  type ProductionInternalTargetDate,
  type ProductionIssue,
} from './customer-committed-date';

const setAt = '2026-09-10T15:00:00.000Z';
const revisedAt = '2026-09-12T15:00:00.000Z';
const laterAt = '2026-09-13T15:00:00.000Z';
const observedAfterMiss = '2026-09-21';

function customerDate(overrides: { committedOn?: string; reason?: string } = {}): CustomerCommittedDate {
  const created = establishCustomerCommittedDate({
    id: 'cust-date-1',
    organizationId: 'org-a',
    subjectType: 'order',
    subjectId: 'order-1',
    partyId: 'party-1',
    commercialOwnerMemberId: 'mem-comercial',
    committedOn: overrides.committedOn ?? '2026-09-20',
    reason: overrides.reason ?? 'Acordada con el cliente',
    setByMemberId: 'mem-comercial',
    setAt,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected customer date');
  return created.value;
}

function productionDate(overrides: { targetOn?: string } = {}): ProductionInternalTargetDate {
  const created = establishProductionInternalTargetDate({
    id: 'prod-date-1',
    organizationId: 'org-a',
    subjectType: 'order',
    subjectId: 'order-1',
    maintainedByMemberId: 'mem-production',
    targetOn: overrides.targetOn ?? '2026-09-28',
    reason: 'Capacidad del taller',
    setByMemberId: 'mem-production',
    setAt,
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected production date');
  return created.value;
}

function issue(overrides: Partial<{
  id: string;
  mayAffectProductionCalendar: boolean;
  mayAffectCustomerDate: boolean;
  subjectId: string;
  source: string;
}> = {}): ProductionIssue {
  const created = recordProductionIssue({
    id: overrides.id ?? 'issue-1',
    organizationId: 'org-a',
    subjectType: 'order',
    subjectId: overrides.subjectId ?? 'order-1',
    mayAffectProductionCalendar: overrides.mayAffectProductionCalendar ?? false,
    mayAffectCustomerDate: overrides.mayAffectCustomerDate ?? true,
    note: 'Falta materia prima',
    recordedByMemberId: 'mem-production',
    recordedAt: revisedAt,
    ...(overrides.source ? { source: overrides.source } : {}),
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error('expected issue');
  return created.value;
}

function viewers(): CustomerDateViewer[] {
  return [
    { memberId: 'mem-comercial', organizationId: 'org-a', grantedScopes: [] },
    { memberId: 'mem-gerencia', organizationId: 'org-a', grantedScopes: ['commercial.org.read'] },
    { memberId: 'mem-admin', organizationId: 'org-a', grantedScopes: ['people.admin'] },
    { memberId: 'mem-team', organizationId: 'org-a', grantedScopes: ['commercial.team.read'] },
    { memberId: 'mem-other', organizationId: 'org-a', grantedScopes: [] },
    { memberId: 'mem-other-org', organizationId: 'org-b', grantedScopes: ['commercial.org.read'] },
  ];
}

function readOwned(relative: string): string {
  const candidates = [
    join(process.cwd(), relative),
    join(process.cwd(), 'packages', relative),
    join(process.cwd(), '..', relative),
    join(process.cwd(), '../..', relative),
  ];
  const found = candidates.find((path) => existsSync(path));
  if (!found) throw new Error(`missing ${relative}`);
  return readFileSync(found, 'utf8');
}

describe('customer and production dates stay independent', () => {
  it('keeps two dates and two histories', () => {
    assert.equal(customerDateHasSeparateProductionTarget(), true);
    const customer = customerDate();
    const production = productionDate();
    assert.equal(customer.committedOn, '2026-09-20');
    assert.equal(production.targetOn, '2026-09-28');
    assert.equal(customer.source, CUSTOMER_DATE_SOURCE);
    assert.equal(production.source, PRODUCTION_DATE_SOURCE);
    assert.notEqual(customer.source, production.source);

    const customerRevised = reviseCustomerCommittedDate(customer, [], {
      id: 'rev-c1',
      nextCommittedOn: '2026-09-22',
      reason: 'El cliente pidió dos días más',
      actorMemberId: 'mem-comercial',
      revisedAt,
    });
    assert.equal(customerRevised.ok, true);
    if (!customerRevised.ok) return;
    assert.equal(production.targetOn, '2026-09-28');
    assert.equal(customerRevised.value.revisions.length, 1);
    assert.equal(customer.committedOn, '2026-09-20');

    const productionRevised = reviseProductionInternalTargetDate(production, [], {
      id: 'rev-p1',
      nextTargetOn: '2026-10-01',
      reason: 'Turno extra no alcanza',
      actorMemberId: 'mem-production',
      revisedAt: laterAt,
    });
    assert.equal(productionRevised.ok, true);
    if (!productionRevised.ok) return;
    assert.equal(customerRevised.value.date.committedOn, '2026-09-22');
    assert.equal(customerRevised.value.revisions[0]?.source, CUSTOMER_DATE_SOURCE);
    assert.equal(productionRevised.value.revisions[0]?.source, PRODUCTION_DATE_SOURCE);
    assert.equal(productionRevised.value.revisions[0]?.actorMemberId, 'mem-production');
    assert.equal(production.originalTargetOn, '2026-09-28');
  });

  it('refuses to copy one date onto the other', () => {
    const copied = establishProductionInternalTargetDate({
      id: 'prod-copy',
      organizationId: 'org-a',
      subjectType: 'order',
      subjectId: 'order-1',
      maintainedByMemberId: 'mem-production',
      targetOn: '2026-09-20',
      committedOn: '2026-09-20',
      reason: 'La misma',
      setByMemberId: 'mem-production',
      setAt,
    } as Parameters<typeof establishProductionInternalTargetDate>[0]);
    assert.equal(copied.ok, false);
    if (copied.ok) return;
    assert.equal(copied.reason, 'do_not_copy_customer_date');

    const collapsed = establishCustomerCommittedDate({
      id: 'cust-copy',
      organizationId: 'org-a',
      subjectType: 'order',
      subjectId: 'order-1',
      commercialOwnerMemberId: 'mem-comercial',
      committedOn: '2026-09-20',
      targetOn: '2026-09-28',
      reason: 'Acordada',
      setByMemberId: 'mem-comercial',
      setAt,
    } as Parameters<typeof establishCustomerCommittedDate>[0]);
    assert.equal(collapsed.ok, false);
    if (collapsed.ok) return;
    assert.equal(collapsed.reason, 'dates_are_independent');
  });
});

describe('revision history', () => {
  it('retains the original customer date and reason', () => {
    const customer = customerDate({ reason: 'Entrega acordada en visita' });
    const first = reviseCustomerCommittedDate(customer, [], {
      id: 'rev-1',
      nextCommittedOn: '2026-09-22',
      reason: 'Cliente confirmó el 22',
      actorMemberId: 'mem-comercial',
      revisedAt,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    const second = reviseCustomerCommittedDate(first.value.date, first.value.revisions, {
      id: 'rev-2',
      nextCommittedOn: '2026-09-25',
      reason: 'Cliente aceptó el 25',
      actorMemberId: 'mem-comercial',
      revisedAt: laterAt,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(second.value.date.originalCommittedOn, '2026-09-20');
    assert.equal(second.value.date.originalReason, 'Entrega acordada en visita');
    assert.equal(second.value.date.committedOn, '2026-09-25');
    assert.equal(second.value.revisions.length, 2);
    assert.equal(second.value.revisions[0]?.previousCommittedOn, '2026-09-20');
    assert.equal(second.value.revisions[0]?.reason, 'Cliente confirmó el 22');
    assert.equal(second.value.revisions[0]?.actorMemberId, 'mem-comercial');
    assert.equal(second.value.revisions[0]?.source, CUSTOMER_DATE_SOURCE);
    assert.equal(second.value.revisions[0]?.revisedAt, revisedAt);
    assert.equal(second.value.revisions[1]?.previousCommittedOn, '2026-09-22');
    assert.equal(second.value.revisions[1]?.revisedAt, laterAt);
    assert.equal(first.value.revisions[0]?.reason, 'Cliente confirmó el 22');
  });
});

describe('early warning', () => {
  it('surfaces delay risk only to the assigned comercial and authorized gerencia', () => {
    const date = customerDate();
    const recorded = issue();
    const items = customerDateAttentionItems({
      date,
      issues: [recorded],
      informed: [],
      viewers: viewers(),
    });
    assert.equal(items.length, 2);
    assert.deepEqual(
      items.map((item) => item.audience).sort(),
      ['comercial', 'gerencia'],
    );
    assert.equal(items.every((item) => item.label === CUSTOMER_DATE_EARLY_WARNING_LABEL), true);
    assert.equal(items.every((item) => item.predictsDelay === false), true);
    assert.equal(items.find((item) => item.audience === 'comercial')?.memberId, 'mem-comercial');
    assert.equal(items.find((item) => item.audience === 'gerencia')?.memberId, 'mem-gerencia');
    assert.equal(items.some((item) => item.memberId === 'mem-admin'), false);
    assert.equal(items.some((item) => item.memberId === 'mem-team'), false);
    assert.equal(items.some((item) => item.memberId === 'mem-other'), false);
    assert.equal(items.some((item) => item.memberId === 'mem-other-org'), false);
  });

  it('does not warn from a production-calendar flag alone', () => {
    const date = customerDate();
    const calendarOnly = issue({ mayAffectProductionCalendar: true, mayAffectCustomerDate: false });
    assert.equal(calendarOnly.mayAffectProductionCalendar, true);
    assert.equal(
      customerDateEarlyWarning({ date, issues: [calendarOnly], informed: [], observedOn: observedAfterMiss }),
      null,
    );
    assert.deepEqual(
      customerDateAttentionItems({ date, issues: [calendarOnly], informed: [], viewers: viewers() }),
      [],
    );
  });

  it('does not warn without a factual trigger, including a missed date alone', () => {
    const missed = customerDate({ committedOn: '2026-09-01' });
    assert.equal(
      customerDateEarlyWarning({
        date: missed,
        issues: [],
        informed: [],
        observedOn: observedAfterMiss,
      }),
      null,
    );
    assert.equal(customerDatePredictsDelay(), false);
    assert.equal(issueTriggerIsAi(), false);

    const neither = issue({ mayAffectCustomerDate: false, mayAffectProductionCalendar: false });
    assert.equal(customerDateEarlyWarning({ date: missed, issues: [neither], informed: [] }), null);

    const ai = recordProductionIssue({
      id: 'issue-ai',
      organizationId: 'org-a',
      subjectType: 'order',
      subjectId: 'order-1',
      mayAffectProductionCalendar: true,
      mayAffectCustomerDate: true,
      recordedByMemberId: 'mem-production',
      recordedAt: revisedAt,
      source: 'ai',
    });
    assert.equal(ai.ok, false);
    if (ai.ok) return;
    assert.equal(ai.reason, 'ai_not_a_trigger');

    const noDate = customerDateEarlyWarning({
      date: null,
      issues: [issue()],
      informed: [],
      observedOn: observedAfterMiss,
    });
    assert.equal(noDate, null);

    const otherSubject = issue({ id: 'issue-other', subjectId: 'order-9' });
    assert.equal(
      customerDateEarlyWarning({ date: customerDate(), issues: [otherSubject], informed: [] }),
      null,
    );
  });

  it('keeps customer-notified as a separate state and clears only that issue', () => {
    const date = customerDate();
    const first = issue({ id: 'issue-a' });
    const second = issue({ id: 'issue-b' });
    const before = customerNotifiedState(first.id, date.organizationId, []);
    assert.equal(before, 'not_informed');
    assert.equal(CUSTOMER_NOT_INFORMED_LABEL, 'Cliente no informado');

    const informed = recordCustomerInformed(date, [first, second], {
      id: 'informed-1',
      issueId: first.id,
      note: 'Llamé al cliente y expliqué el riesgo',
      recordedByMemberId: 'mem-comercial',
      recordedAt: laterAt,
    });
    assert.equal(informed.ok, true);
    if (!informed.ok) return;

    assert.equal(first.mayAffectCustomerDate, true);
    assert.equal('notified' in first, false);
    assert.equal(customerNotifiedState(first.id, date.organizationId, [informed.value]), 'informed');
    assert.equal(customerNotifiedState(second.id, date.organizationId, [informed.value]), 'not_informed');
    assert.equal(informed.value.notified, true);
    assert.equal(CUSTOMER_INFORMED_LABEL, 'Cliente informado');

    const warning = customerDateEarlyWarning({
      date,
      issues: [first, second],
      informed: [informed.value],
    });
    assert.equal(warning?.openIssueIds.includes(first.id), false);
    assert.deepEqual(warning?.openIssueIds, ['issue-b']);
    assert.equal(warning?.label, CUSTOMER_DATE_EARLY_WARNING_LABEL);

    const gerencia = recordCustomerInformed(date, [second], {
      id: 'informed-gerencia',
      issueId: second.id,
      note: 'Gerencia no habla por Comercial',
      recordedByMemberId: 'mem-gerencia',
      recordedAt: laterAt,
    });
    assert.equal(gerencia.ok, false);
    if (gerencia.ok) return;
    assert.equal(gerencia.reason, 'not_owner');
  });
});

describe('divergence', () => {
  it('is visible to gerencia only when both dates were recorded', () => {
    const customer = customerDate();
    const production = productionDate();
    const gerencia: CustomerDateViewer = {
      memberId: 'mem-gerencia',
      organizationId: 'org-a',
      grantedScopes: ['commercial.org.read'],
    };
    const admin: CustomerDateViewer = {
      memberId: 'mem-admin',
      organizationId: 'org-a',
      grantedScopes: ['people.admin'],
    };

    assert.equal(recordedDateDivergence(customer, null), null);
    assert.equal(recordedDateDivergence(null, production), null);
    assert.equal(managementDateDivergence(customer, null, gerencia), null);
    assert.equal(managementDateDivergence(null, production, gerencia), null);

    const both = recordedDateDivergence(customer, production);
    assert.equal(both?.visibleBecause, 'both_dates_recorded');
    assert.equal(both?.diverges, true);
    assert.equal(both?.customerCommittedOn, '2026-09-20');
    assert.equal(both?.productionInternalTargetOn, '2026-09-28');
    assert.equal(managementDateDivergence(customer, production, gerencia)?.diverges, true);
    assert.equal(managementDateDivergence(customer, production, admin), null);
    assert.equal(
      customerDateEarlyWarning({ date: customer, issues: [], informed: [] }),
      null,
    );
  });
});

describe('spanish copy and schema fragment', () => {
  it('uses the customer-date labels without collapsing the production date', () => {
    assert.equal(CUSTOMER_COMMITTED_DATE_LABEL, 'Fecha con el cliente');
    assert.equal(PRODUCTION_INTERNAL_TARGET_LABEL, 'Fecha interna de producción');
    assert.equal(CUSTOMER_DATE_RISK_FLAG_LABEL, 'Puede afectar la fecha del cliente');
    assert.equal(CUSTOMER_DATE_EARLY_WARNING_LABEL, 'Conviene avisar al cliente');
    assert.notEqual(CUSTOMER_COMMITTED_DATE_LABEL, PRODUCTION_INTERNAL_TARGET_LABEL);
  });

  it('stores both dates, separate histories, explicit flags, and a separate informed record', () => {
    const sql = readOwned(
      'os-database/prisma/migrations/20260915160000_os_customer_committed_date/migration.sql',
    );
    const fragment = readOwned('os-database/prisma/fragments/customer-committed-date.prisma');
    for (const text of [sql, fragment]) {
      assert.match(text, /os_customer_committed_dates/);
      assert.match(text, /os_production_internal_target_dates/);
      assert.match(text, /os_customer_committed_date_revisions/);
      assert.match(text, /os_production_internal_target_date_revisions/);
      assert.match(text, /may_affect_customer_date/);
      assert.match(text, /may_affect_production_calendar/);
      assert.match(text, /os_customer_date_informed_records|CustomerDateInformedRecord/);
      assert.equal(text.includes('sales_customer_coordination'), true);
      assert.equal(text.includes('production_internal'), true);
      assert.equal(text.includes('human_explicit'), true);
    }
    assert.doesNotMatch(sql, /ALTER TABLE/);
    const productionTable = sql.split('CREATE TABLE os_production_internal_target_dates (')[1]?.split(');')[0] ?? '';
    assert.equal(productionTable.includes('os_customer_committed_dates'), false);
    assert.match(sql, /No foreign key to os_customer_committed_dates/);
    assert.match(sql, /No informed column on this table/);
  });
});
