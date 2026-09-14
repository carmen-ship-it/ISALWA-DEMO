import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildClassificationRecord,
  buildConsumptionRecord,
  buildFinishedGoodsReceipt,
  buildLossRecord,
  buildProcessRecord,
  buildQuema,
  buildQuemaProductLink,
} from '@isalwa/os-contracts';
import {
  PRODUCTION_ENTRY_SCOPE,
  PRODUCTION_REVIEW_SCOPE,
  ProductionAccessLedger,
  aggregateProduction,
  officialInputStock,
  openQuema,
  qualityRatioForProduct,
  quemaProductList,
  recordConsumption,
  recordLoss,
  recordProcess,
  recordReceipt,
  searchProduction,
  type ProductionRecordKind,
  type ProductionSession,
} from './access';

const at = '2026-09-14T14:00:00.000Z';
const recordedAt = '2026-09-14T15:00:00.000Z';
const ORG = 'org-a';
const OTHER = 'org-b';
const PRODUCT = 'prod-shared';
const FOREIGN_PRODUCT = 'prod-foreign-only';

const KINDS = [
  'process_record',
  'quema',
  'loss',
  'consumption',
  'finished_goods_receipt',
] as const satisfies readonly ProductionRecordKind[];

function provenance(organizationId: string, id: string) {
  return {
    id,
    organizationId,
    actorMemberId: `member-${organizationId}`,
    actorLabel: 'Operador de prueba',
    source: 'manual' as const,
    occurredAt: at,
    recordedAt,
    evidence: { reference: null, note: null },
    correctsEntryId: null,
    correctionReason: null,
    idempotencyKey: null,
  };
}

function allowed(organizationId = ORG): ProductionSession {
  return {
    organizationId,
    memberId: `member-${organizationId}`,
    grantedScopes: [PRODUCTION_ENTRY_SCOPE],
    actorLabel: 'Operación de planta',
  };
}

function unauthorized(): ProductionSession {
  return {
    organizationId: ORG,
    memberId: 'member-cargo',
    grantedScopes: [],
    actorLabel: 'Operación de planta',
    cargo: 'encargado de producción',
    title: 'El encargado de producción',
  };
}

function reviewOnly(): ProductionSession {
  return {
    organizationId: ORG,
    memberId: 'member-review',
    grantedScopes: [PRODUCTION_REVIEW_SCOPE],
    actorLabel: 'Revisión de planta',
  };
}

function noOrg(): ProductionSession {
  return {
    organizationId: null,
    memberId: 'member-direct',
    grantedScopes: [PRODUCTION_ENTRY_SCOPE],
    actorLabel: 'Operación de planta',
  };
}

function seedLedger() {
  const ownProcess = buildProcessRecord({
    ...provenance(ORG, 'proc-own'),
    productId: PRODUCT,
    stepKey: 'colaje',
    quemaId: null,
    note: null,
  });
  const foreignProcess = buildProcessRecord({
    ...provenance(OTHER, 'proc-foreign'),
    productId: FOREIGN_PRODUCT,
    stepKey: 'colaje',
    quemaId: null,
    note: null,
  });
  const ownLoss = buildLossRecord({
    ...provenance(ORG, 'loss-own'),
    productId: PRODUCT,
    stepKey: 'secado',
    quantityLost: '2',
    percentageLost: '10',
    reason: 'grieta',
  });
  const foreignLoss = buildLossRecord({
    ...provenance(OTHER, 'loss-foreign'),
    productId: FOREIGN_PRODUCT,
    stepKey: 'secado',
    quantityLost: '9',
    percentageLost: '90',
    reason: 'otra planta',
  });
  const ownConsumption = buildConsumptionRecord({
    ...provenance(ORG, 'cons-own'),
    stepKey: 'horno',
    category: 'fuel',
    description: 'gas propio',
    reference: 'gas',
    quantity: '3',
    unit: 'kg',
  });
  const foreignConsumption = buildConsumptionRecord({
    ...provenance(OTHER, 'cons-foreign'),
    stepKey: 'horno',
    category: 'fuel',
    description: 'gas ajeno',
    reference: 'gas',
    quantity: '40',
    unit: 'kg',
  });
  const ownReceipt = buildFinishedGoodsReceipt({
    ...provenance(ORG, 'rcpt-own'),
    productId: PRODUCT,
    quantity: '4',
  });
  const foreignReceipt = buildFinishedGoodsReceipt({
    ...provenance(OTHER, 'rcpt-foreign'),
    productId: FOREIGN_PRODUCT,
    quantity: '11',
  });
  const ownQuema = buildQuema({
    id: 'quema-shared',
    organizationId: ORG,
    actorMemberId: `member-${ORG}`,
    actorLabel: 'Operador de prueba',
    source: 'manual',
    recordedAt,
    evidence: { reference: null, note: null },
    idempotencyKey: null,
    startedAt: at,
  });
  const foreignQuema = buildQuema({
    id: 'quema-shared',
    organizationId: OTHER,
    actorMemberId: `member-${OTHER}`,
    actorLabel: 'Operador de prueba',
    source: 'manual',
    recordedAt,
    evidence: { reference: null, note: null },
    idempotencyKey: null,
    startedAt: at,
  });
  const ownLink = buildQuemaProductLink({
    id: 'link-own',
    organizationId: ORG,
    quemaId: 'quema-shared',
    productId: PRODUCT,
    quantity: null,
    unit: null,
    actorMemberId: `member-${ORG}`,
    actorLabel: 'Operador de prueba',
    source: 'manual',
    occurredAt: at,
    recordedAt,
    evidence: { reference: null, note: null },
    correctsLinkId: null,
    correctionReason: null,
  });
  const foreignLink = buildQuemaProductLink({
    id: 'link-foreign',
    organizationId: OTHER,
    quemaId: 'quema-shared',
    productId: FOREIGN_PRODUCT,
    quantity: '8',
    unit: 'pza',
    actorMemberId: `member-${OTHER}`,
    actorLabel: 'Operador de prueba',
    source: 'manual',
    occurredAt: at,
    recordedAt,
    evidence: { reference: null, note: null },
    correctsLinkId: null,
    correctionReason: null,
  });
  const ownClass = buildClassificationRecord({
    ...provenance(ORG, 'class-own'),
    productId: PRODUCT,
    goodCount: 8,
    lostCount: 2,
  });
  const foreignClass = buildClassificationRecord({
    ...provenance(OTHER, 'class-foreign'),
    productId: PRODUCT,
    goodCount: 1,
    lostCount: 9,
  });
  return new ProductionAccessLedger({
    entries: [
      ownProcess,
      foreignProcess,
      ownLoss,
      foreignLoss,
      ownConsumption,
      foreignConsumption,
      ownReceipt,
      foreignReceipt,
      ownClass,
      foreignClass,
    ],
    quemas: [ownQuema.quema, foreignQuema.quema],
    times: [ownQuema.start, foreignQuema.start],
    links: [ownLink, foreignLink],
  });
}

function payload(kind: ProductionRecordKind, organizationId: string) {
  const id = `${kind}-new`;
  const common = { ...provenance(organizationId, id) };
  if (kind === 'process_record') {
    return { ...common, productId: PRODUCT, stepKey: 'pulido', quemaId: null, note: null };
  }
  if (kind === 'quema') {
    return {
      id: 'quema-new',
      organizationId,
      actorMemberId: `member-${organizationId}`,
      actorLabel: 'Operador de prueba',
      source: 'manual',
      recordedAt,
      evidence: { reference: null, note: null },
      idempotencyKey: null,
      startedAt: at,
    };
  }
  if (kind === 'loss') {
    return { ...common, productId: PRODUCT, stepKey: 'resane', quantityLost: '1', percentageLost: '5', reason: 'borde' };
  }
  if (kind === 'consumption') {
    return {
      ...common,
      stepKey: 'horno',
      category: 'supply',
      description: 'esmalte',
      reference: null,
      quantity: '1',
      unit: 'kg',
    };
  }
  return { ...common, productId: PRODUCT, quantity: '2' };
}

function write(
  kind: ProductionRecordKind,
  ledger: ProductionAccessLedger,
  session: ProductionSession | null,
  input: Record<string, unknown>,
) {
  if (kind === 'process_record') return recordProcess(ledger, session, input);
  if (kind === 'quema') return openQuema(ledger, session, input);
  if (kind === 'loss') return recordLoss(ledger, session, input);
  if (kind === 'consumption') return recordConsumption(ledger, session, input);
  return recordReceipt(ledger, session, input);
}

function countKind(ledger: ProductionAccessLedger, kind: ProductionRecordKind, organizationId: string): number {
  if (kind === 'quema') return ledger.quemas.filter((item) => item.organizationId === organizationId).length;
  return ledger.entries.filter((item) => item.kind === kind && item.organizationId === organizationId).length;
}

describe('production tenant isolation', () => {
  for (const kind of KINDS) {
    it(`${kind} allows the same tenant with production.entry.member`, () => {
      const ledger = seedLedger();
      const before = countKind(ledger, kind, ORG);
      const result = write(kind, ledger, allowed(), payload(kind, ORG));
      assert.equal(result.ok, true, kind);
      if (!result.ok) return;
      assert.equal(countKind(ledger, kind, ORG), before + 1);
      assert.equal(Object.hasOwn(result.value, 'orderId'), false);
      const search = searchProduction(ledger, allowed(), { text: kind === 'quema' ? 'quema-new' : `${kind}-new`, kind });
      assert.equal(search.ok, true);
      if (!search.ok) return;
      assert.equal(search.value.every((hit) => hit.organizationId === ORG), true);
      assert.equal(search.value.some((hit) => hit.kind === kind), true);
      const aggregate = aggregateProduction(ledger, allowed(), { kind });
      assert.equal(aggregate.ok, true);
      if (!aggregate.ok) return;
      assert.equal(aggregate.value.organizationId, ORG);
      assert.equal(aggregate.value.officialStock, null);
    });

    it(`${kind} denies a same-tenant role that is only cargo or review`, () => {
      const ledger = seedLedger();
      const beforeOwn = countKind(ledger, kind, ORG);
      const beforeOther = countKind(ledger, kind, OTHER);
      const cargo = write(kind, ledger, unauthorized(), payload(kind, ORG));
      assert.equal(cargo.ok, false);
      if (cargo.ok) return;
      assert.equal(cargo.denial, 'unauthorized_role');
      const review = write(kind, ledger, reviewOnly(), payload(kind, ORG));
      assert.equal(review.ok, false);
      if (review.ok) return;
      assert.equal(review.denial, 'unauthorized_role');
      const search = searchProduction(ledger, unauthorized(), { text: FOREIGN_PRODUCT, kind });
      assert.equal(search.ok, false);
      if (search.ok) return;
      assert.equal(search.denial, 'unauthorized_role');
      const aggregate = aggregateProduction(ledger, unauthorized(), { kind });
      assert.equal(aggregate.ok, false);
      if (aggregate.ok) return;
      assert.equal(aggregate.denial, 'unauthorized_role');
      assert.equal(countKind(ledger, kind, ORG), beforeOwn);
      assert.equal(countKind(ledger, kind, OTHER), beforeOther);
    });

    it(`${kind} denies a cross-tenant write and read`, () => {
      const ledger = seedLedger();
      const beforeOther = countKind(ledger, kind, OTHER);
      const result = write(kind, ledger, allowed(), payload(kind, OTHER));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.denial, 'cross_tenant');
      assert.equal(countKind(ledger, kind, OTHER), beforeOther);
      const search = searchProduction(ledger, allowed(), { text: FOREIGN_PRODUCT, organizationId: OTHER, kind });
      assert.equal(search.ok, false);
      if (search.ok) return;
      assert.equal(search.denial, 'search_leakage');
    });

    it(`${kind} denies a direct call without a session organization`, () => {
      const ledger = seedLedger();
      const before = ledger.entries.length + ledger.quemas.length;
      const result = write(kind, ledger, noOrg(), payload(kind, ORG));
      assert.equal(result.ok, false);
      if (result.ok) return;
      assert.equal(result.denial, 'session_org_required');
      const missing = write(kind, ledger, null, payload(kind, OTHER));
      assert.equal(missing.ok, false);
      if (missing.ok) return;
      assert.equal(missing.denial, 'session_org_required');
      const search = searchProduction(ledger, noOrg(), { text: FOREIGN_PRODUCT, organizationId: OTHER, kind });
      assert.equal(search.ok, false);
      if (search.ok) return;
      assert.equal(search.denial, 'session_org_required');
      assert.equal(ledger.entries.length + ledger.quemas.length, before);
    });

    it(`${kind} denies search leakage of the other tenant`, () => {
      const ledger = seedLedger();
      const leaked = searchProduction(ledger, allowed(), {
        text: FOREIGN_PRODUCT,
        organizationId: OTHER,
        kind,
      });
      assert.equal(leaked.ok, false);
      if (leaked.ok) return;
      assert.equal(leaked.denial, 'search_leakage');
      const quiet = searchProduction(ledger, allowed(), { text: FOREIGN_PRODUCT, kind });
      assert.equal(quiet.ok, true);
      if (!quiet.ok) return;
      assert.equal(quiet.value.length, 0);
      assert.equal(quiet.value.some((hit) => hit.organizationId === OTHER), false);
      assert.equal(quiet.value.some((hit) => hit.productId === FOREIGN_PRODUCT), false);
    });

    it(`${kind} denies aggregate leakage and does not invent the other tenant as zero stock`, () => {
      const ledger = seedLedger();
      const leaked = aggregateProduction(ledger, allowed(), { organizationId: OTHER, kind });
      assert.equal(leaked.ok, false);
      if (leaked.ok) return;
      assert.equal(leaked.denial, 'aggregate_leakage');
      assert.equal('value' in leaked, false);
      const own = aggregateProduction(ledger, allowed(), { kind });
      assert.equal(own.ok, true);
      if (!own.ok) return;
      assert.equal(own.value.organizationId, ORG);
      assert.equal(own.value.officialStock, null);
      assert.equal(own.value.stockOfficial, false);
      if (kind === 'loss') assert.equal(own.value.losses, 1);
      if (kind === 'consumption') assert.equal(own.value.consumptions, 1);
      if (kind === 'finished_goods_receipt') assert.equal(own.value.receipts, 1);
      if (kind === 'process_record') assert.equal(own.value.processRecords, 1);
      if (kind === 'quema') assert.equal(own.value.quemas, 1);
      assert.notEqual(own.value.losses, 2);
      assert.notEqual(own.value.consumptions, 2);
    });
  }

  it('does not include another tenant in the good or lost ratio', () => {
    const ledger = seedLedger();
    const ratio = qualityRatioForProduct(ledger, allowed(), PRODUCT);
    assert.equal(ratio.ok, true);
    if (!ratio.ok || !ratio.value) return;
    assert.equal(ratio.value.goodPercent, '80');
    assert.equal(ratio.value.lostPercent, '20');
    assert.equal(ratio.value.denominator, 10);
    assert.notEqual(ratio.value.lostPercent, '90');
    const missing = qualityRatioForProduct(ledger, allowed(), FOREIGN_PRODUCT);
    assert.equal(missing.ok, true);
    if (!missing.ok) return;
    assert.equal(missing.value, null);
    const denied = qualityRatioForProduct(ledger, noOrg(), PRODUCT);
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.denial, 'session_org_required');
  });

  it('does not include another tenant in a quema product list', () => {
    const ledger = seedLedger();
    const products = quemaProductList(ledger, allowed(), 'quema-shared');
    assert.equal(products.ok, true);
    if (!products.ok) return;
    assert.deepEqual(
      products.value.map((item) => item.productId),
      [PRODUCT],
    );
    assert.equal(products.value.some((item) => item.productId === FOREIGN_PRODUCT), false);
    assert.equal(products.value[0]?.quantity, null);
    const empty = quemaProductList(ledger, allowed(), 'quema-does-not-exist');
    assert.equal(empty.ok, true);
    if (!empty.ok) return;
    assert.deepEqual(empty.value, []);
    const cross = quemaProductList(ledger, { ...allowed(), organizationId: OTHER }, 'quema-shared');
    assert.equal(cross.ok, true);
    if (!cross.ok) return;
    assert.deepEqual(
      cross.value.map((item) => item.productId),
      [FOREIGN_PRODUCT],
    );
  });

  it('does not invent zero stock from an empty result or the other tenant', () => {
    const ledger = seedLedger();
    const search = searchProduction(ledger, allowed(), { text: 'gas-ajeno-inexistente', kind: 'consumption' });
    assert.equal(search.ok, true);
    if (!search.ok) return;
    assert.equal(search.value.length, 0);
    const stock = officialInputStock(ledger, allowed(), 'gas');
    assert.equal(stock.ok, true);
    if (!stock.ok) return;
    assert.equal(stock.value.quantity, null);
    assert.equal(stock.value.official, false);
    assert.equal(stock.value.emptyIsZeroStock, false);
    assert.notEqual(stock.value.quantity, 0);
    assert.equal(search.value.length === 0 && stock.value.quantity === 0, false);
    const denied = officialInputStock(ledger, unauthorized(), 'gas');
    assert.equal(denied.ok, false);
    if (denied.ok) return;
    assert.equal(denied.denial, 'unauthorized_role');
    assert.equal('value' in denied && (denied as { value?: { quantity?: number } }).value?.quantity === 0, false);
  });
});
