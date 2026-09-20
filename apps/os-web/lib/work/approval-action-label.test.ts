import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approvalDetailDecisionChrome,
  approvalListActionLabel,
  approvalListPageDescription,
} from './approval-action-label.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('approvalListActionLabel', () => {
  it('A: assigned approver with canDecide → Decidir', () => {
    assert.equal(approvalListActionLabel({ status: 'pending', canDecide: true }), 'Decidir');
  });

  it('B: non-approver → Ver solicitud', () => {
    assert.equal(approvalListActionLabel({ status: 'pending', canDecide: false }), 'Ver solicitud');
  });

  it('C: evaluation → Ver contexto even if would otherwise decide', () => {
    assert.equal(
      approvalListActionLabel({ status: 'pending', canDecide: true, evaluationMode: true }),
      'Ver contexto',
    );
  });
});

describe('approvalDetailDecisionChrome', () => {
  it('A: assigned approver → Su decisión / Aprobar o rechazar', () => {
    const chrome = approvalDetailDecisionChrome({ status: 'pending', canDecide: true });
    assert.equal(chrome.kicker, 'Su decisión');
    assert.equal(chrome.title, 'Aprobar o rechazar');
  });

  it('B: non-approver → context wording, not own decision', () => {
    const chrome = approvalDetailDecisionChrome({ status: 'pending', canDecide: false });
    assert.equal(chrome.kicker, 'Contexto de la decisión');
    assert.equal(chrome.title, 'Revisión');
    assert.match(chrome.body, /pendiente de decisión por la persona asignada/);
    assert.doesNotMatch(chrome.kicker, /Su decisión/i);
    assert.doesNotMatch(chrome.title, /Aprobar o rechazar/);
  });

  it('C: evaluation → context/read-only wording', () => {
    const chrome = approvalDetailDecisionChrome({
      status: 'pending',
      canDecide: true,
      evaluationMode: true,
    });
    assert.equal(chrome.kicker, 'Contexto de la decisión');
    assert.equal(chrome.title, 'Revisión');
    assert.doesNotMatch(chrome.title, /Aprobar o rechazar/);
  });
});

describe('approvalListPageDescription', () => {
  it('evaluation subtitle does not imply su decisión', () => {
    const copy = approvalListPageDescription({
      evaluationMode: true,
      pendingCount: 3,
      decidableCount: 0,
    });
    assert.match(copy, /Solicitudes pendientes de aprobación/);
    assert.doesNotMatch(copy, /su decisión/);
  });
});

describe('approval copy wiring', () => {
  it('list panel prefers live View As for Ver contexto', () => {
    const panel = read('components/work/approval-desk-panel.tsx');
    assert.match(panel, /useRolePreview/);
    assert.match(panel, /evaluationModeEffective/);
    assert.match(panel, /Ver contexto|evaluationModeEffective/);
  });

  it('detail uses decision chrome helper and shows decision owner when locked', () => {
    const detail = read('app/(app)/aprobaciones/[approvalRequestId]/page.tsx');
    assert.match(detail, /approvalDetailDecisionChrome/);
    assert.match(detail, /Decisión a cargo de/);
    assert.match(detail, /evaluation\.active \? false : await resolveCanDecide/);
  });
});
