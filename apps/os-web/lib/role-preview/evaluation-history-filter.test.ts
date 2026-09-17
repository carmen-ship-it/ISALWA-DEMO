/**
 * Negative security pack for View As document / history / audit projection.
 * Fail-closed expectations — unit-level; hosted BV still required for RC.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { EvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import {
  evaluationBlocksAuditResource,
  filterAuditItemsForProjection,
  filterDocumentLinksForProjection,
  filterTimelineItemsForProjection,
} from '@/lib/role-preview/evaluation-history-filter';
import { evaluationBlocksDirectParty } from '@/lib/role-preview/evaluation-resource-access';
import { rolePreviewBlocksMutations } from '@/lib/role-preview/access';

function projection(
  persona: EvaluationProjection['persona'],
  subjectMemberId: string | null = null,
): EvaluationProjection {
  return {
    active: true,
    persona,
    subjectMemberId,
    readOnly: true,
    commercialVisibility:
      persona === 'asesor' ? 'own' : persona === 'jefe-comercial' ? 'team' : persona === 'gerencia' ? 'org' : null,
    presentationScopes: [],
  };
}

type Case = {
  name: string;
  actor: string;
  viewAs: string;
  resource: string;
  expected: 'blocked' | 'allowed';
  actual: 'blocked' | 'allowed';
};

function record(c: Omit<Case, 'actual'> & { actual: 'blocked' | 'allowed' }): Case {
  assert.equal(c.actual, c.expected, `${c.name}: expected ${c.expected} got ${c.actual}`);
  return { ...c };
}

describe('document / history / audit View As negatives', () => {
  const asesorA = projection('asesor', 'mem_asesor_a');
  const asesorBParty = 'party_b';
  const allowedA = new Set(['party_a', 'quote_a']);

  it('A–C: Asesor A cannot access Asesor B client document/history/audit', () => {
    const cases: Case[] = [];
    cases.push(
      record({
        name: 'A document other client',
        actor: 'Carmen',
        viewAs: 'Asesor A',
        resource: 'party_b quote_pdf',
        expected: 'blocked',
        actual: evaluationBlocksDirectParty(asesorA, 'mem_asesor_b') ? 'blocked' : 'allowed',
      }),
    );
    cases.push(
      record({
        name: 'B history other client party',
        actor: 'Carmen',
        viewAs: 'Asesor A',
        resource: `historial ${asesorBParty}`,
        expected: 'blocked',
        actual: evaluationBlocksDirectParty(asesorA, 'mem_asesor_b') ? 'blocked' : 'allowed',
      }),
    );
    cases.push(
      record({
        name: 'C audit other client',
        actor: 'Carmen',
        viewAs: 'Asesor A',
        resource: 'audit party party_b',
        expected: 'blocked',
        actual: evaluationBlocksAuditResource(asesorA, 'party', 'party_b', allowedA)
          ? 'blocked'
          : 'allowed',
      }),
    );
    assert.equal(cases.every((c) => c.actual === 'blocked'), true);
  });

  it('D–F: cross-company style — foreign resource ids fail closed for Asesor subject set', () => {
    assert.equal(
      evaluationBlocksAuditResource(asesorA, 'party', 'REAL_OTHER_ORG_PARTY', allowedA),
      true,
    );
    assert.equal(
      evaluationBlocksAuditResource(asesorA, 'quote', 'REAL_OTHER_ORG_QUOTE', allowedA),
      true,
    );
    assert.equal(
      evaluationBlocksAuditResource(asesorA, 'order', 'REAL_OTHER_ORG_ORDER', allowedA),
      true,
    );
  });

  it('G–I: ops View As strips unrelated commercial document/history/audit', () => {
    const produccion = projection('produccion');
    const almacen = projection('almacen');
    const compras = projection('compras');

    const docs = [
      { type: 'quote_pdf' },
      { type: 'delivery_note_pdf' },
    ];
    assert.deepEqual(filterDocumentLinksForProjection(produccion, docs), []);
    assert.deepEqual(
      filterDocumentLinksForProjection(almacen, docs).map((d) => d.type),
      ['delivery_note_pdf'],
    );
    assert.deepEqual(filterDocumentLinksForProjection(compras, docs), []);

    const timeline = [
      { eventType: 'quote.submitted' },
      { eventType: 'order.created' },
      { eventType: 'finished_goods.received' },
    ];
    assert.equal(
      filterTimelineItemsForProjection(produccion, timeline).some((e) => e.eventType.startsWith('quote.')),
      false,
    );
    assert.equal(
      filterAuditItemsForProjection(produccion, [
        { resourceType: 'quote', resourceId: 'q1' },
        { resourceType: 'order', resourceId: 'o1' },
      ]).every((i) => i.resourceType !== 'quote'),
      true,
    );
    assert.equal(
      filterAuditItemsForProjection(almacen, [
        { resourceType: 'quote', resourceId: 'q1' },
        { resourceType: 'delivery_note', resourceId: 'dn1' },
      ]).some((i) => i.resourceType === 'quote'),
      false,
    );
    assert.equal(
      filterAuditItemsForProjection(compras, [
        { resourceType: 'party', resourceId: 'p1' },
        { resourceType: 'order', resourceId: 'o1' },
      ]).some((i) => i.resourceType === 'party'),
      false,
    );
  });

  it('J: View As mutation attempt blocked', () => {
    assert.equal(rolePreviewBlocksMutations('asesor'), true);
    assert.equal(rolePreviewBlocksMutations('produccion'), true);
    assert.equal(rolePreviewBlocksMutations(null), false);
  });

  it('Gerencia retains broader audit types; Asesor keeps commercial set', () => {
    const gerencia = projection('gerencia');
    const items = [
      { resourceType: 'member', resourceId: 'm1' },
      { resourceType: 'quote', resourceId: 'q1' },
    ];
    assert.equal(filterAuditItemsForProjection(gerencia, items).length, 2);
    assert.equal(filterAuditItemsForProjection(asesorA, items, { allowedResourceIds: new Set(['q1']) }).length, 1);
  });
});
