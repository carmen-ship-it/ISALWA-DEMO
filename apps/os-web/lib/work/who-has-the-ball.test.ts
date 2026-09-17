import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { whoHasTheBallView, WHO_HAS_THE_BALL_COPY } from './who-has-the-ball';

describe('whoHasTheBallView', () => {
  it('shows commercial owner and pending approver without inventing helpers', () => {
    const view = whoHasTheBallView({
      commercialOwner: {
        memberId: 'm1',
        displayName: 'YUSELKA JUSTINIANO DURAN',
        businessRoleLabel: 'Asesor de Venta',
      },
      temporarySupport: null,
      pendingApproval: {
        approvalRequestId: 'apr-1',
        status: 'pending',
        approver: {
          memberId: 'm2',
          displayName: 'EDWIN YAMIL CALERO VALDEZ',
          businessRoleLabel: 'Jefe Comercial',
        },
        requesterDisplayName: 'YUSELKA JUSTINIANO DURAN',
      },
      nextStepStatement: null,
      nextStepHrefLabel: null,
    });
    assert.match(view.principalLine, /YUSELKA JUSTINIANO DURAN · Asesor de Venta/);
    assert.equal(view.temporarySupportLine, null);
    assert.match(view.waitingLine ?? '', /EDWIN YAMIL CALERO VALDEZ · Jefe Comercial/);
    assert.equal(view.nextSafeLine, 'Esperar decisión');
    assert.equal(view.requestLabel, 'Ver solicitud');
  });

  it('shows unowned client without picking an advisor', () => {
    const view = whoHasTheBallView({
      commercialOwner: null,
      temporarySupport: null,
      pendingApproval: null,
      nextStepStatement: 'Prepare una cotización',
      nextStepHrefLabel: 'Crear cotización',
    });
    assert.equal(view.principalLine, WHO_HAS_THE_BALL_COPY.noOwner);
    assert.match(view.nextSafeLine ?? '', /Crear cotización/);
  });

  it('surfaces temporary support only when evidenced', () => {
    const view = whoHasTheBallView({
      commercialOwner: {
        memberId: 'm1',
        displayName: 'YUSELKA JUSTINIANO DURAN',
        businessRoleLabel: 'Asesor de Venta',
      },
      temporarySupport: {
        memberId: 'm3',
        displayName: 'JOSE LUIS VARGAS ALMANZA',
        businessRoleLabel: 'Asesor de Venta',
      },
      pendingApproval: null,
      nextStepStatement: 'Continúe',
      nextStepHrefLabel: null,
    });
    assert.match(view.temporarySupportLine ?? '', /JOSE LUIS VARGAS ALMANZA/);
    assert.match(view.temporarySupportLine ?? '', /Apoyo temporal/);
  });
});
