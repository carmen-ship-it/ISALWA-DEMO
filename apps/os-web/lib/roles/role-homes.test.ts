import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildCustomerCoverageGrant, scopesGrantedByCargoOrTitle } from '@isalwa/os-contracts';
import { managementCommandCenter } from '@/lib/management/command-center';
import { decideAttention } from '@/lib/roles/attention';
import {
  businessHomeHasSystemControls,
  composeOperatingHomes,
  homeById,
  type PaymentExceptionRecord,
  type QueueRecord,
} from '@/lib/roles/homes';
import { NO_RECORD } from '@/lib/roles/queues';
import type { RoleSession } from '@/lib/roles/access';
import { roleNavigationRequests } from '@/lib/navigation/requests/roles';
import { authorizedOpsSearchHits, decideOpsSearch, type OpsSearchCandidate } from '@/lib/shell/ops-search';

const ORG = 'org-a';
const OTHER = 'org-b';
const ACTOR = 'mem-asesor';
const PEER = 'mem-peer';
const AS_OF = new Date('2026-06-15T12:00:00.000Z');

const FORBIDDEN =
  /revenue|ingreso|margen|margin|\bcosto\b|\bcost\b|stock oficial|kpi|valor de pedidos|centavos|Bs\.\s*0|\b0,00\b/i;

function session(
  grantedScopes: readonly string[],
  organizationId: string | null = ORG,
  actorMemberId: string | null = ACTOR,
): RoleSession {
  return { organizationId, actorMemberId, grantedScopes, asOf: AS_OF, coverageGrants: [] };
}

function row(overrides: Partial<QueueRecord> = {}): QueueRecord {
  return {
    id: 'rec-1',
    organizationId: ORG,
    ownerMemberId: ACTOR,
    partyId: 'party-1',
    visibility: 'own',
    kind: 'follow-up',
    subject: 'Llamar a Ana',
    href: '/trabajo/w-1',
    ...overrides,
  };
}

function searchRow(overrides: Partial<OpsSearchCandidate> = {}): OpsSearchCandidate {
  return {
    kind: 'client',
    id: 'party-1',
    organizationId: ORG,
    label: 'Ana',
    partyId: 'party-1',
    ownerMemberId: ACTOR,
    visibility: 'org',
    href: '/clientes/party-1',
    ...overrides,
  };
}

const FOREIGN_SEARCH: OpsSearchCandidate[] = [
  searchRow({ kind: 'client', id: 'party-foreign', organizationId: OTHER, partyId: 'party-foreign', label: 'Otro' }),
  searchRow({
    kind: 'quote',
    id: 'quote-foreign',
    organizationId: OTHER,
    partyId: 'party-foreign',
    label: 'COT-9',
    href: '/clientes/party-foreign/cotizaciones/quote-foreign',
  }),
  searchRow({
    kind: 'order',
    id: 'order-foreign',
    organizationId: OTHER,
    partyId: 'party-foreign',
    label: 'PED-9',
    href: '/clientes/party-foreign/pedidos/order-foreign',
  }),
  searchRow({ kind: 'product', id: 'prod-foreign', organizationId: OTHER, label: 'Capri ajeno' }),
];

const LOCAL_SEARCH: OpsSearchCandidate[] = [
  searchRow(),
  searchRow({ kind: 'quote', id: 'quote-1', label: 'COT-1', href: '/clientes/party-1/cotizaciones/quote-1' }),
  searchRow({ kind: 'order', id: 'order-1', label: 'PED-1', href: '/clientes/party-1/pedidos/order-1' }),
  searchRow({ kind: 'product', id: 'prod-1', label: 'Capri' }),
];

describe('role homes', () => {
  it('does not grant a home or an exception from cargo or title', () => {
    for (const [cargo, title] of [
      ['asesor', 'Asesor comercial'],
      ['JEFE COMERCIAL', 'Jefe'],
      ['gerencia', 'Gerente'],
    ] as const) {
      const granted = scopesGrantedByCargoOrTitle(cargo, title);
      const model = composeOperatingHomes({ session: session(granted) });
      assert.equal(model.businessHomes.length, 0, cargo);
      assert.equal(model.systemControls, null);
      assert.equal(roleNavigationRequests(granted, cargo, title).length, 0);
    }
  });

  it('hides the asesor home without an own-work scope and blocks another customer without coverage', () => {
    const foreign = row({
      id: 'other-work',
      ownerMemberId: PEER,
      partyId: 'party-2',
      subject: 'Cliente ajeno',
    });
    const own = row();
    const denied = composeOperatingHomes({
      session: session(['people.admin', 'asesor']),
      records: [own, foreign],
    });
    assert.equal(homeById(denied, 'asesor'), null);

    const home = composeOperatingHomes({
      session: session(['commercial.customer.create']),
      records: [own, foreign],
    });
    const asesor = homeById(home, 'asesor');
    assert.ok(asesor);
    assert.notEqual(asesor.title, homeById(composeOperatingHomes({
      session: session(['commercial.team.read']),
      records: [row({ visibility: 'team' })],
    }), 'jefe')?.title);
    const visible = asesor.queues.flatMap((queue) => queue.items.map((item) => item.id));
    assert.deepEqual(visible, ['rec-1']);
    assert.equal(visible.includes('other-work'), false);

    const grant = buildCustomerCoverageGrant({
      organizationId: ORG,
      customerPartyId: 'party-2',
      primaryOwnerMemberId: PEER,
      actingAdvisorMemberId: ACTOR,
      startsAt: new Date('2026-06-01T00:00:00.000Z'),
    });
    assert.ok(grant);
    const covered = composeOperatingHomes({
      session: { ...session(['commercial.quote.convert.own']), coverageGrants: [grant] },
      records: [foreign],
    });
    const coveredIds = homeById(covered, 'asesor')?.queues.flatMap((queue) =>
      queue.items.map((item) => item.id),
    );
    assert.deepEqual(coveredIds, ['other-work']);
  });

  it('keeps system controls off the gerente home and off a title', () => {
    const model = composeOperatingHomes({
      session: session(['management.org.read', 'system.admin', 'Gerente']),
    });
    const gerente = homeById(model, 'gerente');
    assert.ok(gerente);
    assert.equal(businessHomeHasSystemControls(gerente), false);
    assert.equal(gerente.description.includes('infraestructura'), true);
    assert.equal(JSON.stringify(gerente).includes('integration'), false);
    assert.equal(model.systemControls?.separateFromBusinessHome, true);
    assert.equal(model.systemControls?.includesIntegrationHealth, false);
    assert.equal(model.systemControls?.href, '/sistema');
    assert.equal(homeById(composeOperatingHomes({ session: session(['system.admin']) }), 'gerente'), null);
    assert.equal(homeById(composeOperatingHomes({ session: session(['people.admin']) }), 'jefe'), null);
    assert.equal(
      homeById(composeOperatingHomes({ session: session(['commercial.org.read']) }), 'gerente')?.id,
      'gerente',
    );
  });

  it('gives a queue item a real href or says the record is not mounted', () => {
    const model = composeOperatingHomes({
      session: session(['commercial.customer.create']),
      records: [row(), row({ id: 'loose', href: '/no-existe/x', subject: 'Sin mesa' })],
    });
    const items = homeById(model, 'asesor')?.queues.flatMap((queue) => queue.items) ?? [];
    const linked = items.find((item) => item.id === 'rec-1');
    const unmounted = items.find((item) => item.id === 'loose');
    assert.equal(linked?.href, '/trabajo/w-1');
    assert.equal(unmounted?.href, null);
    assert.equal(unmounted?.unmounted, 'El registro no está montado.');
    const component = readFileSync(
      resolve(__dirname, '../../components/management/operating-homes.tsx'),
      'utf8',
    );
    assert.match(component, /href=\{item\.href \?\? undefined\}/);
    assert.doesNotMatch(component, /href="#"/);
  });

  it('does not use a revenue string or a zero-money empty state', () => {
    const model = composeOperatingHomes({
      session: session([
        'commercial.customer.create',
        'commercial.team.read',
        'management.org.read',
        'commercial.exception.authorize',
        'finance.operational.record',
        'production.entry.member',
      ]),
      payments: [{ id: 'pay-1', organizationId: ORG, subject: 'Excepción registrada', href: null }],
    });
    const copy = [
      NO_RECORD,
      ...model.businessHomes.flatMap((home) => [
        home.title,
        home.question,
        home.description,
        ...home.queues.flatMap((queue) => [queue.title, queue.empty, ...queue.items.map((item) => item.subject)]),
      ]),
    ].join('\n');
    assert.match(copy, /¿Qué necesita mi atención\?/);
    assert.match(copy, /Sin registro/);
    assert.doesNotMatch(copy, FORBIDDEN);
    assert.equal(homeById(model, 'contabilidad')?.description.includes('libro'), true);
    assert.equal(homeById(model, 'asesor')?.title === homeById(model, 'jefe')?.title, false);
  });

  it('requires a tenant filter on every commercial queue', () => {
    const model = composeOperatingHomes({
      session: session(['commercial.customer.create', 'commercial.team.read', 'management.org.read']),
      records: [row({ id: 'foreign', organizationId: OTHER, visibility: 'team', subject: 'Ajeno' })],
      exceptions: [
        {
          id: 'ex-foreign',
          organizationId: OTHER,
          exceptionId: 'missing-evidence',
          subject: 'Evidencia ajena',
          href: '/trabajo/w-9',
        },
      ],
    });
    const ids = model.businessHomes.flatMap((home) =>
      home.queues.flatMap((queue) => queue.items.map((item) => item.id)),
    );
    assert.deepEqual(ids, []);
  });
});

describe('tenant boundary for search, attention, and exception counts', () => {
  const gerente = session(['management.org.read']);
  const catalog = [...LOCAL_SEARCH, ...FOREIGN_SEARCH];

  it('allows the same tenant', () => {
    const hits = authorizedOpsSearchHits(gerente, catalog);
    assert.equal(hits.length, LOCAL_SEARCH.length);
    assert.equal(hits.every((hit) => hit.organizationId === ORG), true);
    const attention = decideAttention(
      gerente,
      [
        {
          id: 'att-1',
          organizationId: ORG,
          ownerMemberId: PEER,
          partyId: 'party-1',
          visibility: 'org',
          subject: 'Aprobación local',
          href: '/aprobaciones/ap-1',
        },
      ],
      'gerente',
    );
    assert.equal(attention.allowed, true);
    assert.equal(attention.items[0]?.href, '/aprobaciones/ap-1');
  });

  it('denies the same tenant when the role is not granted', () => {
    const denied = session(['people.admin', 'Jefe']);
    assert.equal(decideOpsSearch(denied, catalog).denial, 'unauthorized-role');
    assert.deepEqual(authorizedOpsSearchHits(denied, catalog), []);
    assert.equal(decideAttention(denied, [
      {
        id: 'att-1',
        organizationId: ORG,
        ownerMemberId: ACTOR,
        partyId: 'party-1',
        visibility: 'own',
        subject: 'Local',
        href: '/trabajo/w-1',
      },
    ], 'asesor').denial, 'unauthorized-role');
    const payments: PaymentExceptionRecord[] = [
      { id: 'pay-1', organizationId: ORG, subject: 'Excepción', href: '/aprobaciones/ap-1' },
    ];
    const jefe = composeOperatingHomes({
      session: session(['commercial.team.read']),
      payments,
    });
    assert.equal(
      homeById(jefe, 'jefe')?.queues.some((queue) => queue.id === 'jefe-exception'),
      false,
    );
  });

  it('denies another tenant', () => {
    const hits = authorizedOpsSearchHits(gerente, catalog);
    assert.equal(hits.some((hit) => hit.organizationId === OTHER), false);
    assert.equal(hits.some((hit) => /foreign|ajeno/i.test(hit.label)), false);
    const attention = decideAttention(
      gerente,
      [
        {
          id: 'att-foreign',
          organizationId: OTHER,
          ownerMemberId: ACTOR,
          partyId: 'party-x',
          visibility: 'org',
          subject: 'Ajeno',
          href: '/trabajo/w-9',
        },
      ],
      'gerente',
    );
    assert.deepEqual(attention.items, []);
  });

  it('denies a direct call without a session organization', () => {
    assert.equal(decideOpsSearch(session(['management.org.read'], ''), catalog).denial, 'missing-organization');
    assert.deepEqual(authorizedOpsSearchHits(null, catalog), []);
    assert.deepEqual(authorizedOpsSearchHits(session(['commercial.org.read'], null), catalog), []);
    assert.equal(
      decideAttention(session(['commercial.customer.create'], '  '), [
        {
          id: 'att-1',
          organizationId: ORG,
          ownerMemberId: ACTOR,
          partyId: 'party-1',
          visibility: 'own',
          subject: 'Local',
          href: '/trabajo/w-1',
        },
      ], 'asesor').denial,
      'missing-organization',
    );
    assert.equal(composeOperatingHomes({ session: session(['management.org.read'], null) }).denial, 'missing-organization');
  });

  it('does not leak another tenant in a command-palette suggestion', () => {
    const hits = authorizedOpsSearchHits(gerente, catalog);
    const leaked = hits.filter(
      (hit) =>
        hit.organizationId !== ORG ||
        hit.id.includes('foreign') ||
        ['party-foreign', 'quote-foreign', 'order-foreign', 'prod-foreign'].includes(hit.id),
    );
    assert.deepEqual(leaked, []);
    assert.equal(hits.some((hit) => hit.kind === 'product' && hit.id === 'prod-1'), true);
    assert.equal(hits.find((hit) => hit.kind === 'client')?.href, '/clientes/party-1');
  });

  it('does not leak another tenant in an exception count', () => {
    const counted = managementCommandCenter({
      session: gerente,
      records: [
        {
          id: 'ex-local',
          organizationId: ORG,
          exceptionId: 'missing-evidence',
          subject: 'Falta una nota',
          href: '/trabajo/w-1',
        },
        {
          id: 'ex-foreign',
          organizationId: OTHER,
          exceptionId: 'missing-evidence',
          subject: 'Nota ajena',
          href: '/trabajo/w-9',
        },
        {
          id: 'ex-foreign-2',
          organizationId: OTHER,
          exceptionId: 'active-quemas',
          subject: 'Quema ajena',
          href: null,
        },
      ],
    });
    assert.equal(counted.allowed, true);
    assert.equal(counted.count, 1);
    assert.deepEqual(counted.items.map((item) => item.id), ['ex-local']);
    const deniedCount = managementCommandCenter({
      session: session(['people.admin']),
      records: [
        {
          id: 'ex-local',
          organizationId: ORG,
          exceptionId: 'missing-evidence',
          subject: 'Falta una nota',
        },
      ],
    });
    assert.equal(deniedCount.count, null);
    assert.deepEqual(deniedCount.items, []);
  });
});
