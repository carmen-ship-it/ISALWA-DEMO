import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('admin commercial continuity (member detail)', () => {
  it('wires CommercialContinuityPanel and AssignOpportunityOwner action on member page', () => {
    const page = read('app/(app)/administracion/equipo/[memberId]/page.tsx');
    assert.match(page, /CommercialContinuityPanel/);
    assert.match(page, /listOpportunities\(\{ status: 'open', ownerMemberId: memberId/);
    const continuity = read('components/admin/commercial-continuity-panel.tsx');
    assert.match(continuity, /id="continuidad-comercial"/);
  });

  it('uses Spanish copy and existing command only', () => {
    const panel = read('components/admin/reassign-opportunities-panel.tsx');
    assert.match(panel, /Oportunidades abiertas/);
    assert.match(panel, /Reasignar oportunidades/);
    assert.match(panel, /reassignOpportunitiesAction/);
    assert.doesNotMatch(panel, /AssignQuoteOwner|AssignOrderOwner/);

    const action = read('lib/commercial/reassign-opportunities-action.ts');
    assert.match(action, /AssignOpportunityOwner/);
    assert.doesNotMatch(action, /prisma|updateQuote|updateOrder/i);
  });

  it('documents quote and order gaps without inventing commands', () => {
    const wrapper = read('components/admin/commercial-continuity-panel.tsx');
    assert.match(wrapper, /Cotizaciones activas/);
    assert.match(wrapper, /Pedidos abiertos/);
    assert.match(wrapper, /No hay reasignación de cotizaciones/);
    assert.match(wrapper, /No hay reasignación de pedidos/);
    assert.doesNotMatch(wrapper, /AssignQuoteOwner|AssignOrderOwner|capability|roleKey/);
  });

  it('explains commercial account needs separate commercial authority', () => {
    const wrapper = read('components/admin/commercial-continuity-panel.tsx');
    assert.match(wrapper, /permiso comercial[\s\S]*distinto/);
    const impact = read('components/admin/termination-impact-panel.tsx');
    assert.match(impact, /permiso comercial distinto/);
    assert.match(impact, /continuidad-comercial/);
    assert.match(impact, /\/aprobaciones/);
    assert.doesNotMatch(impact, /people\.admin|commercial\.account\.reassign|capability/);
  });

  it('surfaces customer coverage blockers without inventing coverage commands', () => {
    const impact = read('components/admin/termination-impact-panel.tsx');
    assert.match(impact, /primary_customer_coverage/);
    assert.match(impact, /acting_customer_coverage/);
    assert.match(impact, /cobertura de clientes|cobertura temporal/i);
    assert.match(impact, /quien administra la cobertura comercial/);
    assert.doesNotMatch(impact, /GrantCustomerCoverage|RevokeCustomerCoverage|ReplacePrimary/);

    const wrapper = read('components/admin/commercial-continuity-panel.tsx');
    assert.match(wrapper, /Clientes bajo su responsabilidad/);
    assert.match(wrapper, /Cobertura temporal activa/);
    assert.doesNotMatch(wrapper, /GrantCustomerCoverage|OsCustomerCoverageGrant|capability/);
  });
});
