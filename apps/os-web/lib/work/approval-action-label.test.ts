import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approvalListActionLabel } from './approval-action-label.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('approvalListActionLabel', () => {
  it('shows Decidir only for the assigned approver on pending', () => {
    assert.equal(
      approvalListActionLabel({
        status: 'pending',
        approverMemberId: 'mem-a',
        currentMemberId: 'mem-a',
      }),
      'Decidir',
    );
  });

  it('shows Ver solicitud for non-approver pending', () => {
    assert.equal(
      approvalListActionLabel({
        status: 'pending',
        approverMemberId: 'mem-a',
        currentMemberId: 'mem-b',
      }),
      'Ver solicitud',
    );
  });

  it('shows Ver contexto in evaluation mode', () => {
    assert.equal(
      approvalListActionLabel({
        status: 'pending',
        approverMemberId: 'mem-a',
        currentMemberId: 'mem-a',
        evaluationMode: true,
      }),
      'Ver contexto',
    );
  });

  it('shows Ver registro for decided rows', () => {
    assert.equal(
      approvalListActionLabel({
        status: 'approved',
        approverMemberId: 'mem-a',
        currentMemberId: 'mem-a',
      }),
      'Ver registro',
    );
  });
});

describe('permission-aware CTA surfaces', () => {
  it('gates Crear cliente on nueva oportunidad with actorCanMutateMasterData', () => {
    const page = read('app/(app)/oportunidades/nueva/page.tsx');
    assert.match(page, /actorCanMutateMasterData/);
    assert.match(page, /canCreateCustomer \?/);
    assert.match(
      page,
      /Solicite a una persona autorizada que lo registre/,
    );
    assert.match(page, /Vista de evaluación: solo lectura/);
  });

  it('passes member and evaluation into ApprovalDeskPanel', () => {
    const page = read('app/(app)/aprobaciones/page.tsx');
    const panel = read('components/work/approval-desk-panel.tsx');
    const labels = read('lib/work/approval-action-label.ts');
    assert.match(page, /currentMemberId=\{session\.memberId\}/);
    assert.match(page, /evaluationMode=\{evaluation\.active\}/);
    assert.match(panel, /approvalListActionLabel/);
    assert.match(labels, /Decidir/);
    assert.match(labels, /Ver solicitud/);
    assert.match(labels, /Ver contexto/);
  });

  it('locks decide on approval detail when evaluation is active', () => {
    const detail = read('app/(app)/aprobaciones/[approvalRequestId]/page.tsx');
    assert.match(detail, /evaluation\.active \? false : await resolveCanDecide/);
    assert.match(detail, /Solo el aprobador asignado puede decidir/);
  });
});
