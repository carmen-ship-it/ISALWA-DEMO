import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvalListActionLabel,
  approvalListPageDescription,
} from './approval-action-label.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('approvalListActionLabel', () => {
  it('A: assigned approver with canDecide → Decidir', () => {
    assert.equal(
      approvalListActionLabel({ status: 'pending', canDecide: true }),
      'Decidir',
    );
  });

  it('B: non-approver → Ver solicitud', () => {
    assert.equal(
      approvalListActionLabel({ status: 'pending', canDecide: false }),
      'Ver solicitud',
    );
  });

  it('C: evaluation → Ver contexto even if would otherwise decide', () => {
    assert.equal(
      approvalListActionLabel({ status: 'pending', canDecide: true, evaluationMode: true }),
      'Ver contexto',
    );
  });

  it('shows Ver registro for decided rows', () => {
    assert.equal(
      approvalListActionLabel({ status: 'approved', canDecide: false }),
      'Ver registro',
    );
  });
});

describe('approvalListPageDescription', () => {
  it('D: evaluation subtitle does not imply su decisión', () => {
    const copy = approvalListPageDescription({
      evaluationMode: true,
      pendingCount: 3,
      decidableCount: 0,
    });
    assert.match(copy, /Solicitudes pendientes de aprobación/);
    assert.doesNotMatch(copy, /su decisión/);
    assert.match(copy, /La decisión no crea un pedido/);
  });

  it('uses su decisión only when every pending row is decidable', () => {
    assert.match(
      approvalListPageDescription({
        evaluationMode: false,
        pendingCount: 2,
        decidableCount: 2,
      }),
      /su decisión/,
    );
    assert.doesNotMatch(
      approvalListPageDescription({
        evaluationMode: false,
        pendingCount: 2,
        decidableCount: 0,
      }),
      /su decisión/,
    );
  });
});

describe('aprobaciones list wiring', () => {
  it('passes authoritative canDecide map and evaluation mode into the desk panel', () => {
    const page = read('app/(app)/aprobaciones/page.tsx');
    const panel = read('components/work/approval-desk-panel.tsx');
    assert.match(page, /resolveApprovalListCanDecide/);
    assert.match(page, /canDecideById=\{canDecideById\}/);
    assert.match(page, /evaluationMode=\{evaluation\.active\}/);
    assert.match(page, /approvalListPageDescription/);
    assert.doesNotMatch(page, /pendingForMe\.length === pending\.length/);
    assert.match(panel, /canDecideById/);
    assert.match(panel, /approvalListActionLabel/);
  });
});
