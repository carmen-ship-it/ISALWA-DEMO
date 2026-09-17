/**
 * RC3 View As / desk narrowing for Orders (web layer).
 * API capability matrix lives in packages/os-query order-owner-eval-read.test.ts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluationAllowsDesk,
  evaluationBlocksDirectParty,
  evaluationIsOpsPersona,
} from './evaluation-resource-access';
import { commercialListQueryFromProjection } from './commercial-list-query';
import type { EvaluationProjection } from './evaluation-projection';

const ASESOR_A = 'mem-asesor-a';
const ASESOR_B = 'mem-asesor-b';

function projection(
  partial: Partial<EvaluationProjection> & Pick<EvaluationProjection, 'persona' | 'active'>,
): EvaluationProjection {
  return {
    subjectMemberId: null,
    readOnly: partial.active,
    commercialVisibility: null,
    presentationScopes: [],
    ...partial,
  };
}

describe('RC3 View As order narrowing (web)', () => {
  it('Owner Evaluation inactive → does not block Pedido by owner', () => {
    assert.equal(
      evaluationBlocksDirectParty(projection({ active: false, persona: null }), ASESOR_A),
      false,
    );
  });

  it('View As Asesor B → Maderas (owner A) Pedido blocked', () => {
    const asesorB = projection({
      active: true,
      persona: 'asesor',
      subjectMemberId: ASESOR_B,
      commercialVisibility: 'own',
    });
    assert.equal(evaluationBlocksDirectParty(asesorB, ASESOR_A), true);
    assert.deepEqual(commercialListQueryFromProjection(asesorB), {
      visibility: 'org',
      ownerMemberId: ASESOR_B,
    });
  });

  it('View As Asesor A → own Pedido allowed', () => {
    const asesorA = projection({
      active: true,
      persona: 'asesor',
      subjectMemberId: ASESOR_A,
      commercialVisibility: 'own',
    });
    assert.equal(evaluationBlocksDirectParty(asesorA, ASESOR_A), false);
  });

  it('G–K: Ops View As excludes commercial Quote desk', () => {
    for (const persona of ['produccion', 'almacen', 'compras', 'entregas', 'finanzas'] as const) {
      const p = projection({ active: true, persona });
      assert.equal(evaluationIsOpsPersona(persona), true);
      assert.equal(evaluationAllowsDesk(p, 'commercial'), false);
    }
  });

  it('Pedido detail + Quote detail + Cliente360 wire View As narrowing', () => {
    const root = process.cwd();
    const orderPage = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx'),
      'utf8',
    );
    const quotePage = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx'),
      'utf8',
    );
    const partyPage = readFileSync(
      resolve(root, 'app/(app)/clientes/[partyId]/page.tsx'),
      'utf8',
    );
    assert.match(orderPage, /evaluationBlocksDirectParty\(evaluation, order\.ownerMemberId\)/);
    assert.match(quotePage, /evaluationAllowsDesk\(evaluation, 'commercial'\)/);
    assert.match(quotePage, /EvaluationDeskExcluded/);
    assert.match(partyPage, /commercialListQueryFromProjection\(evaluation\)/);
    assert.match(partyPage, /suppressCommercialNegotiation:\s*evaluationIsOpsPersona/);
  });
});
