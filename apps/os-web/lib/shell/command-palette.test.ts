import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import {
  applyPick,
  commitmentPaletteItem,
  contextualPaletteActions,
  customerPaletteItem,
  groupPaletteItems,
  isFollowUpSubject,
  issuePaletteItem,
  paletteActions,
  paletteNav,
  parseRecents,
  quotePaletteItem,
} from './command-palette';
import { safeInternalPath } from './safe-next';

describe('command palette authorization', () => {
  it('hides customer create and invite unless those scopes are already held', () => {
    const plain = paletteActions({ canCreateCustomer: false, canInvite: false }).map((item) => item.label);
    assert.deepEqual(plain, [
      'Nueva oportunidad',
      'Crear cotización',
      'Registrar seguimiento',
      'Reportar problema',
      'Cómo trabajamos',
    ]);
    assert.equal(plain.includes('Agregar cliente'), false);
    assert.equal(plain.includes('Invitar empleado'), false);

    const admin = paletteActions({ canCreateCustomer: true, canInvite: true }).map((item) => item.label);
    assert.equal(admin.includes('Agregar cliente'), true);
    assert.equal(admin.includes('Invitar empleado'), true);
    assert.equal(admin.includes('Reportar problema'), true);
  });

  it('includes Reportar problema action for all users', () => {
    const plain = paletteActions({ canCreateCustomer: false, canInvite: false });
    const reportIssue = plain.find((item) => item.label === 'Reportar problema');
    assert.ok(reportIssue, 'Reportar problema action should be available');
    assert.equal(reportIssue?.href, '/incidencias/reportar');
  });

  it('hides Administración from navigation without people.admin', () => {
    assert.equal(
      paletteNav(false).some((item) => item.href === '/administracion'),
      false,
    );
    assert.equal(
      paletteNav(true).some((item) => item.href === '/administracion'),
      true,
    );
  });

  it('does not use a raw id as the customer or quote label', () => {
    const customer = customerPaletteItem({
      partyId: 'pty_secret',
      displayName: 'Casa Demo',
      legalName: null,
      status: 'active',
    });
    assert.equal(customer.label, 'Casa Demo');
    assert.equal(customer.label.includes('pty_secret'), false);
    assert.equal(customer.partyId, 'pty_secret');

    const quote = quotePaletteItem({
      quoteId: 'quo_1',
      partyId: 'pty_secret',
      quoteNumber: 'COT-12',
      status: 'submitted',
      totalCentavos: '150000',
      currency: 'BOB',
    });
    assert.equal(quote.label, 'COT-12');
    assert.equal(quote.label.includes('quo_1'), false);
  });

  it('routes pick actions onto existing pages', () => {
    const customer = customerPaletteItem({
      partyId: 'pty 1',
      displayName: 'Casa Demo',
      legalName: null,
      status: 'active',
    });
    const opportunity = applyPick(customer, 'customer-opportunity');
    assert.equal(opportunity?.href, '/clientes/pty%201/oportunidades/nueva');
    const followUp = applyPick(customer, 'customer-follow-up');
    assert.equal(followUp?.href, '/clientes/pty%201#trabajo');
    assert.equal(applyPick(customer, 'opportunity-quote'), null);
  });

  it('treats party follow-up subjects as follow-ups, not generic work', () => {
    assert.equal(isFollowUpSubject('party'), true);
    assert.equal(isFollowUpSubject('commercial_account'), true);
    assert.equal(isFollowUpSubject('quote'), false);
  });

  it('groups results without inventing an empty section', () => {
    const groups = groupPaletteItems([
      customerPaletteItem({
        partyId: 'pty_1',
        displayName: 'Casa Demo',
        legalName: null,
        status: 'deactivated',
      }),
    ]);
    assert.deepEqual(
      groups.map((group) => group.id),
      ['customer'],
    );
    assert.match(groups[0]?.items[0]?.detail ?? '', /Inactiva/);
  });

  it('rejects recents that are not internal links', () => {
    const items = parseRecents(
      JSON.stringify([
        { key: 'ok', label: 'Casa', href: '/clientes/1' },
        { key: 'bad', label: 'Fuera', href: 'https://example.com' },
        { key: 'bad2', label: 'Relativo', href: '//evil' },
      ]),
    );
    assert.equal(items.length, 1);
    assert.equal(items[0]?.href, '/clientes/1');
  });
});

describe('contextual palette actions', () => {
  const staff = { canCreateCustomer: false, canInvite: false };
  const admin = { canCreateCustomer: true, canInvite: true };

  it('keeps the pick step when the path is not a customer or opportunity record', () => {
    const paths = [
      '/inicio',
      '/clientes',
      '/clientes/nuevo',
      '/clientes/pty_1/cotizaciones/quo_1',
      '/clientes/pty_1/oportunidades/nueva',
      '/clientes/pty_1/oportunidades/opp_1/cotizaciones/nueva',
      '/clientes/pty_1/pedidos/ord_1',
      '/clientes/nuevo/oportunidades/opp_1',
    ];
    for (const path of paths) {
      assert.deepEqual(contextualPaletteActions(path, staff), paletteActions(staff));
    }
    const picked = contextualPaletteActions('/clientes/nuevo', staff);
    assert.equal(picked.find((item) => item.label === 'Nueva oportunidad')?.detail, 'Elija el cliente');
    assert.equal(picked.find((item) => item.label === 'Registrar seguimiento')?.detail, 'Elija el cliente');
    assert.equal(picked.find((item) => item.label === 'Crear cotización')?.detail, 'Elija la oportunidad');
  });

  it('opens a new opportunity and follow-up on the customer already open', () => {
    const items = contextualPaletteActions('/clientes/pty_1', staff);
    const opportunity = items.find((item) => item.label === 'Nueva oportunidad');
    const followUp = items.find((item) => item.label === 'Registrar seguimiento');
    const quote = items.find((item) => item.label === 'Crear cotización');

    assert.equal(opportunity?.href, '/clientes/pty_1/oportunidades/nueva');
    assert.equal(opportunity?.pick, undefined);
    assert.equal(opportunity?.detail, undefined);
    assert.equal(opportunity?.label.includes('pty_1'), false);
    assert.equal(followUp?.href, '/clientes/pty_1#trabajo');
    assert.equal(followUp?.pick, undefined);
    assert.equal(quote?.pick, 'opportunity-quote');
    assert.equal(quote?.detail, 'Elija la oportunidad');
    assert.deepEqual(
      items.map((item) => item.label),
      paletteActions(staff).map((item) => item.label),
    );
    assert.equal(items.some((item) => item.label === 'Agregar cliente'), false);
  });

  it('creates a quote from the opportunity already open without inferring commercial fields', () => {
    const items = contextualPaletteActions('/clientes/pty%201/oportunidades/opp%202', admin);
    const quote = items.find((item) => item.label === 'Crear cotización');
    const opportunity = items.find((item) => item.label === 'Nueva oportunidad');
    const followUp = items.find((item) => item.label === 'Registrar seguimiento');

    assert.equal(quote?.href, '/clientes/pty%201/oportunidades/opp%202/cotizaciones/nueva');
    assert.equal(quote?.pick, undefined);
    assert.equal(quote?.label, 'Crear cotización');
    assert.equal(quote?.label.includes('pty'), false);
    assert.equal(quote?.label.includes('opp'), false);
    assert.equal(opportunity?.pick, 'customer-opportunity');
    assert.equal(opportunity?.detail, 'Elija el cliente');
    assert.equal(followUp?.pick, 'customer-follow-up');
    assert.equal(items.some((item) => item.label === 'Agregar cliente'), true);
    assert.equal(items.some((item) => item.label === 'Invitar empleado'), true);
  });

  it('accepts a trailing slash and still hides ids from action labels', () => {
    const items = contextualPaletteActions('/clientes/pty%201/', staff);
    const opportunity = items.find((item) => item.key === 'action:opportunity');
    const followUp = items.find((item) => item.key === 'action:follow-up');
    assert.equal(opportunity?.href, '/clientes/pty%201/oportunidades/nueva');
    assert.equal(followUp?.href, '/clientes/pty%201#trabajo');
    assert.equal(opportunity?.label, 'Nueva oportunidad');
    assert.equal(followUp?.label, 'Registrar seguimiento');
  });
});

describe('post-login path', () => {
  it('accepts an internal path and rejects login loops and protocol-relative URLs', () => {
    assert.equal(safeInternalPath('/clientes/1'), '/clientes/1');
    assert.equal(safeInternalPath('/login'), null);
    assert.equal(safeInternalPath('//evil.example'), null);
    assert.equal(safeInternalPath('https://evil.example'), null);
    assert.equal(safeInternalPath('/\\evil'), null);
  });
});

describe('palette search stays on the session', () => {
  it('does not accept an organization override', () => {
    const source = readFileSync(new URL('./command-search.ts', import.meta.url), 'utf8');
    assert.match(source, /export async function searchPalette\(query: string\)/);
    assert.doesNotMatch(source, /organizationId\s*[:=]/);
    assert.match(source, /getServerOsAuthContext/);
  });
});

describe('issue and commitment palette items', () => {
  it('creates an issue palette item with correct structure', () => {
    const issue = issuePaletteItem({
      issueId: 'iss_123',
      title: 'Problema con entrega',
      description: 'La entrega no llegó a tiempo',
      status: 'reported',
    });
    assert.equal(issue.kind, 'issue');
    assert.equal(issue.label, 'Problema con entrega');
    assert.equal(issue.detail, 'Reportado');
    assert.equal(issue.href, '/incidencias/iss_123');
    assert.equal(issue.key, 'issue:iss_123');
    assert.equal(issue.label.includes('iss_123'), false);
  });

  it('uses description truncated when title is missing', () => {
    const issue = issuePaletteItem({
      issueId: 'iss_456',
      title: null,
      description: 'La entrega no llegó a tiempo y el cliente está muy molesto',
      status: 'in_progress',
    });
    // Truncated at 50 chars
    assert.equal(issue.label.length, 50);
    assert.ok(issue.label.startsWith('La entrega no llegó'));
    assert.equal(issue.detail, 'En progreso');
  });

  it('creates a commitment palette item linking to party when partyId exists', () => {
    const commitment = commitmentPaletteItem({
      commitmentId: 'cmt_789',
      text: 'Entregar mañana a las 9am',
      state: 'pending',
      partyId: 'pty_abc',
    });
    assert.equal(commitment.kind, 'commitment');
    assert.equal(commitment.label, 'Entregar mañana a las 9am');
    assert.equal(commitment.detail, 'Pendiente');
    assert.equal(commitment.href, '/clientes/pty_abc#compromisos');
    assert.equal(commitment.key, 'commitment:cmt_789');
  });

  it('falls back to /incidencias when no partyId', () => {
    const commitment = commitmentPaletteItem({
      commitmentId: 'cmt_000',
      text: 'Resolver el problema',
      state: 'overdue',
      partyId: null,
    });
    assert.equal(commitment.href, '/incidencias');
    assert.equal(commitment.detail, 'Vencido');
  });

  it('groups issues and commitments correctly', () => {
    const items = [
      issuePaletteItem({
        issueId: 'iss_1',
        title: 'Test issue',
        description: 'desc',
        status: 'reported',
      }),
      commitmentPaletteItem({
        commitmentId: 'cmt_1',
        text: 'Test commitment',
        state: 'pending',
        partyId: null,
      }),
    ];
    const groups = groupPaletteItems(items);
    const issueGroup = groups.find((g) => g.id === 'issue');
    const commitmentGroup = groups.find((g) => g.id === 'commitment');
    assert.ok(issueGroup, 'should have issue group');
    assert.equal(issueGroup?.label, 'Incidencias');
    assert.equal(issueGroup?.items.length, 1);
    assert.ok(commitmentGroup, 'should have commitment group');
    assert.equal(commitmentGroup?.label, 'Compromisos');
    assert.equal(commitmentGroup?.items.length, 1);
  });
});
