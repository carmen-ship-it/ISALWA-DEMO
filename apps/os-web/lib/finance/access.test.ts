import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import {
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  canConfirmFinance,
  canPostFinanceLedger,
  scopesGrantedByCargoOrTitle,
} from '@isalwa/os-contracts';
import {
  FINANCE_DESK_COPY,
  FINANCE_FORBIDDEN_COPY,
  authorizeFinanceOperationalWrite,
  financeOperationalRecordScope,
  resolveFinancePageAccess,
} from './index';
import {
  MANUAL_PAYMENT_COPY,
  PAYMENT_BOUNDARY,
  createReportedOperationalFact,
  recordReportedOperationalFact,
  reportedFactCopy,
} from '../operations/reported-fact';

const ORG = 'org-isalwa-demo';
const OTHER = 'org-foreign';

function session(over: {
  organizationId?: string | null;
  memberId?: string | null;
  accessStatus?: string | null;
  grantedScopes?: readonly string[] | null;
  cargo?: string | null;
  title?: string | null;
} = {}) {
  return {
    organizationId: ORG,
    memberId: 'mem-contabilidad',
    accessStatus: 'active',
    actorLabel: 'Contabilidad',
    grantedScopes: [FINANCE_OPERATIONAL_RECORD_SCOPE] as readonly string[] | null,
    cargo: null,
    title: null,
    ...over,
  };
}

function joinedDeskCopy(): string {
  return [
    FINANCE_DESK_COPY.kicker,
    FINANCE_DESK_COPY.title,
    FINANCE_DESK_COPY.intro,
    FINANCE_DESK_COPY.boundaryOfficial,
    FINANCE_DESK_COPY.boundaryConfirm,
    FINANCE_DESK_COPY.boundaryManual,
    FINANCE_DESK_COPY.noIngresos,
    FINANCE_DESK_COPY.permissionTitle,
    FINANCE_DESK_COPY.permissionRole,
    MANUAL_PAYMENT_COPY.title,
    MANUAL_PAYMENT_COPY.intro,
    MANUAL_PAYMENT_COPY.boundary,
    PAYMENT_BOUNDARY,
  ].join('\n');
}

describe('finance operational desk access', () => {
  it('Contabilidad with finance.operational.record unlocks the operational surface only', () => {
    const access = resolveFinancePageAccess({
      session: session(),
      grantedScopes: [FINANCE_OPERATIONAL_RECORD_SCOPE],
    });
    assert.equal(access.status, 'ready');
    if (access.status !== 'ready') return;
    assert.equal(access.organizationId, ORG);
    assert.equal(access.canRecord, true);
    assert.equal(access.canConfirm, false);
    assert.equal(access.canPostLedger, false);
    assert.equal(financeOperationalRecordScope(), FINANCE_OPERATIONAL_RECORD_SCOPE);
    assert.equal(canConfirmFinance(access.grantedScopes), false);
    assert.equal(canPostFinanceLedger(access.grantedScopes), false);
  });

  it('unauthorized roles cannot open or write the desk', () => {
    for (const scopes of [
      [],
      ['commercial.team.read'],
      ['people.admin'],
      ['purchasing.operational.record'],
      ['management.org.read'],
    ]) {
      const access = resolveFinancePageAccess({
        session: session({ grantedScopes: scopes }),
        grantedScopes: scopes,
      });
      assert.equal(access.status, 'denied');
      if (access.status !== 'denied') return;
      assert.equal(access.reason, 'unauthorized_role');
      assert.equal(access.canRecord, false);

      const write = authorizeFinanceOperationalWrite({
        session: session({ grantedScopes: scopes }),
        organizationId: ORG,
      });
      assert.equal(write.ok, false);
      if (write.ok) return;
      assert.equal(write.reason, 'unauthorized_role');
    }
  });

  it('title or cargo Contabilidad never grants access', () => {
    assert.deepEqual(scopesGrantedByCargoOrTitle('Contabilidad', 'Contabilidad'), []);
    const access = resolveFinancePageAccess({
      session: session({
        grantedScopes: [],
        cargo: 'Contabilidad',
        title: 'Contabilidad / Caja',
      }),
      grantedScopes: [],
    });
    assert.equal(access.status, 'denied');
    if (access.status !== 'denied') return;
    assert.equal(access.reason, 'unauthorized_role');

    const write = authorizeFinanceOperationalWrite({
      session: session({
        grantedScopes: [],
        cargo: 'Contabilidad',
        title: 'Jefe de Contabilidad',
      }),
      organizationId: ORG,
    });
    assert.equal(write.ok, false);
  });

  it('missing scope list is permission_unconfirmed, not an empty allow', () => {
    const access = resolveFinancePageAccess({
      session: session({ grantedScopes: null }),
      grantedScopes: null,
    });
    assert.equal(access.status, 'denied');
    if (access.status !== 'denied') return;
    assert.equal(access.reason, 'permission_unconfirmed');
  });

  it('tenant isolation denies foreign organization writes', () => {
    const write = authorizeFinanceOperationalWrite({
      session: session(),
      organizationId: OTHER,
    });
    assert.equal(write.ok, false);
    if (write.ok) return;
    assert.equal(write.reason, 'cross_tenant');

    const missing = authorizeFinanceOperationalWrite({
      session: session({ organizationId: null }),
      organizationId: ORG,
    });
    assert.equal(missing.ok, false);
    if (missing.ok) return;
    assert.equal(missing.reason, 'no_session_org');
  });

  it('manual payment remains visibly non-authoritative and non-fiscal', () => {
    const fact = createReportedOperationalFact({
      id: 'rof-desk-1',
      organizationId: ORG,
      subjectType: 'order',
      subjectId: 'order-1',
      reportedAt: '2026-09-15T15:00:00.000Z',
      reportedByLabel: 'Contabilidad',
      kind: 'payment',
      amountCentavos: '250000',
      method: 'transferencia',
    });
    const copy = reportedFactCopy(fact);
    assert.equal(fact.source, 'manual');
    assert.equal(fact.confirmation, 'pending');
    assert.equal(copy.confirmation, 'Pendiente de confirmar');
    assert.match(copy.source, /manual/i);
    assert.equal(recordReportedOperationalFact({
      id: 'rof-desk-2',
      organizationId: ORG,
      subjectType: 'order',
      subjectId: 'order-1',
      reportedAt: '2026-09-15T15:00:00.000Z',
      reportedByLabel: 'Contabilidad',
      kind: 'payment',
      amountCentavos: '1000',
    }).persisted, false);

    const text = `${joinedDeskCopy()}\n${JSON.stringify(copy)}`;
    for (const pattern of FINANCE_FORBIDDEN_COPY) {
      assert.equal(pattern.test(text), false, String(pattern));
    }
    for (const pattern of [/\bcobrado\b/i, /\bpagado\b/i, /pago confirmado/i]) {
      assert.equal(pattern.test(text), false, String(pattern));
    }
    // "Ingreso" as confirmed revenue must not appear; the denial label is allowed.
    assert.equal(/\bingreso confirmado\b/i.test(text), false);
    assert.match(FINANCE_DESK_COPY.boundaryOfficial, /no reemplaza la contabilidad oficial/i);
    assert.match(FINANCE_DESK_COPY.boundaryConfirm, /no confirma la cobranza/i);
    assert.match(FINANCE_DESK_COPY.noIngresos, /No hay panel de Ingresos/i);
  });

  it('page and nav wire operational desk without activating product finance', () => {
    const page = readFileSync(resolve(__dirname, '../../app/(app)/finanzas/page.tsx'), 'utf8');
    const presentation = readFileSync(
      resolve(__dirname, '../capabilities/presentation.ts'),
      'utf8',
    );
    const nav = readFileSync(resolve(__dirname, '../navigation/nav-config.ts'), 'utf8');
    const access = readFileSync(resolve(__dirname, '../roles/access.ts'), 'utf8');
    const queues = readFileSync(resolve(__dirname, '../roles/queues.ts'), 'utf8');
    const caps = readFileSync(resolve(__dirname, '../auth/member-capabilities.ts'), 'utf8');

    assert.match(page, /resolveFinancePageAccess/);
    assert.match(page, /FinanceOperationalDesk/);
    assert.doesNotMatch(page, /CapabilityLockedState/);
    assert.match(nav, /id: 'finanzas'/);
    assert.match(nav, /href: '\/finanzas'/);
    assert.doesNotMatch(nav, /HIDDEN_PRIMARY_NAV_IDS = \['finanzas'/);
    assert.match(access, /href: '\/finanzas'/);
    assert.match(access, /FINANCE_OPERATIONAL_RECORD_SCOPE/);
    assert.match(queues, /'\/finanzas'/);
    assert.match(caps, /finance\.operational\.record/);
    assert.match(presentation, /capabilityKey: 'finance'|finance:/);
    assert.doesNotMatch(
      presentation,
      /finance:\s*\{[^}]*route:\s*'\/finanzas'/s,
    );
  });
});
