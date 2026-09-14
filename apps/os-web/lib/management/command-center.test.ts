import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { exceptionCountForSession, managementCommandCenter } from '@/lib/management/command-center';
import type { RoleSession } from '@/lib/roles/access';

const ORG = 'org-a';
const OTHER = 'org-b';

function session(
  grantedScopes: readonly string[],
  organizationId: string | null = ORG,
): RoleSession {
  return { organizationId, actorMemberId: 'mem-gerente', grantedScopes };
}

const records = [
  {
    id: 'ex-local',
    organizationId: ORG,
    exceptionId: 'orders-awaiting-allocation' as const,
    subject: 'Pedido local',
    href: '/trabajo/w-1',
  },
  {
    id: 'ex-foreign',
    organizationId: OTHER,
    exceptionId: 'orders-awaiting-allocation' as const,
    subject: 'Pedido ajeno',
    href: '/trabajo/w-9',
  },
];

describe('management command center tenant boundary', () => {
  it('allows a same-tenant exception and links a mounted record', () => {
    const result = managementCommandCenter({
      session: session(['commercial.org.read']),
      records,
    });
    assert.equal(result.allowed, true);
    assert.equal(result.denial, null);
    assert.equal(result.count, 1);
    assert.equal(result.items[0]?.id, 'ex-local');
    assert.equal(result.items[0]?.href, '/trabajo/w-1');
    assert.equal(result.items[0]?.organizationId, ORG);
  });

  it('denies the same tenant when the role is not granted', () => {
    const result = managementCommandCenter({
      session: session(['people.admin', 'system.admin', 'Gerente']),
      records,
    });
    assert.equal(result.denial, 'unauthorized-role');
    assert.equal(result.count, null);
    assert.deepEqual(result.items, []);
  });

  it('denies another tenant and ignores it in the count', () => {
    const onlyForeign = managementCommandCenter({
      session: session(['management.org.read']),
      records: [records[1]!],
    });
    assert.equal(onlyForeign.allowed, true);
    assert.equal(onlyForeign.count, 0);
    assert.deepEqual(onlyForeign.items, []);
    assert.equal(exceptionCountForSession({ session: session(['management.org.read']), records }), 1);
  });

  it('denies a direct call without a session organization', () => {
    const result = managementCommandCenter({
      session: session(['management.org.read'], ''),
      records,
    });
    assert.equal(result.denial, 'missing-organization');
    assert.equal(result.count, null);
    assert.deepEqual(result.items, []);
    assert.equal(managementCommandCenter({ session: null, records }).count, null);
  });

  it('does not leak a foreign client, quote, order, or product through the exception queue', () => {
    const result = managementCommandCenter({
      session: session(['management.org.read']),
      records: [
        ...records,
        {
          id: 'quote-foreign',
          organizationId: OTHER,
          exceptionId: 'customer-not-informed',
          subject: 'Cotización ajena',
          href: '/clientes/party-x/cotizaciones/quote-x',
        },
      ],
    });
    assert.equal(result.items.some((item) => item.organizationId !== ORG), false);
    assert.equal(result.items.some((item) => item.id.includes('foreign')), false);
    assert.equal(result.count, 1);
  });

  it('does not render an unmounted record as a link', () => {
    const result = managementCommandCenter({
      session: session(['management.org.read']),
      records: [
        {
          id: 'ex-open',
          organizationId: ORG,
          exceptionId: 'active-quemas',
          subject: 'Quema activa',
          href: null,
        },
      ],
    });
    assert.equal(result.items[0]?.href, null);
    assert.equal(result.items[0]?.unmounted, 'El registro no está montado.');
  });
});
