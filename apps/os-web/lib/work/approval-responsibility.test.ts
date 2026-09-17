import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPROVAL_RESPONSIBILITY_COPY,
  approvalResponsibilityView,
} from './approval-responsibility';

describe('approvalResponsibilityView', () => {
  it('shows pending person and role without inventing authority', () => {
    const view = approvalResponsibilityView({
      status: 'pending',
      approvalRequestId: 'apr-1',
      approver: {
        memberId: 'm1',
        displayName: 'Ana López',
        businessRoleLabel: 'Comercial',
      },
      requesterDisplayName: 'Carmen',
    });
    assert.equal(view.headline, 'Pendiente de aprobación de Ana López · Comercial');
    assert.match(view.detailLines.join(' '), /Solicitado por Carmen/);
    assert.match(view.detailLines.join(' '), /no crea un pedido/i);
    assert.equal(view.requestHref, '/aprobaciones/apr-1');
    assert.equal(view.requestLabel, APPROVAL_RESPONSIBILITY_COPY.seeRequest);
    assert.equal(view.missingApprover, false);
  });

  it('shows configuration gap when no approver person is assigned', () => {
    const view = approvalResponsibilityView({
      status: 'pending',
      approvalRequestId: null,
      approver: null,
    });
    assert.equal(view.headline, APPROVAL_RESPONSIBILITY_COPY.missingApproverConfig);
    assert.equal(view.missingApprover, true);
    assert.match(view.detailLines.join(' '), /pendiente de definir/i);
  });

  it('shows role with person-pending when only role label is known', () => {
    const view = approvalResponsibilityView({
      status: 'pending',
      approvalRequestId: 'apr-2',
      approver: {
        memberId: null,
        displayName: null,
        businessRoleLabel: 'Jefe Comercial',
      },
    });
    assert.match(view.headline, /Jefe Comercial/);
    assert.match(view.headline, /Persona pendiente de asignar/);
  });

  it('records approved-by without auto-pedido claim', () => {
    const view = approvalResponsibilityView({
      status: 'approved',
      approvalRequestId: 'apr-3',
      approver: { memberId: 'm2', displayName: 'María Pérez', businessRoleLabel: null },
      decidedByDisplayName: 'María Pérez',
    });
    assert.equal(view.headline, 'Aprobado por María Pérez');
    assert.match(view.detailLines.join(' '), /no crea un pedido/i);
  });

  it('never exposes capability codes in user copy', () => {
    const view = approvalResponsibilityView({
      status: 'pending',
      approvalRequestId: 'apr-4',
      approver: {
        memberId: 'm3',
        displayName: 'Ana',
        businessRoleLabel: 'Comercial',
      },
    });
    const blob = `${view.headline} ${view.detailLines.join(' ')}`;
    assert.doesNotMatch(blob, /commercial\.|approval\.act|BUSINESS_CONFIGURATION_REQUIRED/);
  });
});
