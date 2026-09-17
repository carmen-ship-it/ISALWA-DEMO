import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatListAge,
  formatOpportunityStatus,
  formatQuoteStatus,
  formatRecordStatus,
  formatTimestamp,
} from '@/lib/commercial/labels';
import {
  inicioEmptyCtas,
  isInicioCommerciallyEmpty,
  shouldShowInicioApprovalsSection,
} from '@/lib/commercial/inicio-home';
import {
  cotizacionesHref,
  parseQuoteListStatus,
  quoteStatusFilterOptions,
  QUOTE_LIST_STATUSES,
} from '@/lib/commercial/list-filters';
import {
  opportunityHref,
  quoteHref,
} from '@/lib/commercial/navigation';
import { COMMERCIAL_NEXT_STEP_LABEL, quoteNextStep } from '@/lib/commercial/next-step';
import { sampleOpportunity, sampleQuote } from '@/lib/commercial/fixtures';
import {
  filterNavByAccess,
  HIDDEN_PRIMARY_NAV_IDS,
  PRIMARY_NAV,
  primaryNavIds,
  FUTURE_NAV,
} from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';

describe('commercial-first primary nav', () => {
  it('exposes the commercial-first primary items in order', () => {
    assert.deepEqual(
      PRIMARY_NAV.map((item) => item.id),
      [
        'inicio',
        'clientes',
        'oportunidades',
        'cotizaciones',
        'pedidos',
        'mapa',
        'trabajo',
        'conversaciones',
        'aprobaciones',
        'incidencias',
        'compromisos',
        'produccion',
        'almacen',
        'compras',
        'entregas',
        'finanzas',
        'salud-datos',
        'auditoria',
        'productos',
        'coordinacion',
        'memoria-decisiones',
        'administracion',
        'ayuda',
      ],
    );
  });

  it('shows Administración only for admin probe', () => {
    assert.deepEqual(primaryNavIds({ showAdmin: true }), [
      'inicio',
      'clientes',
      'oportunidades',
      'cotizaciones',
      'pedidos',
      'mapa',
      'trabajo',
      'conversaciones',
      'aprobaciones',
      'incidencias',
      'compromisos',
      'produccion',
      'almacen',
      'compras',
      'entregas',
      'finanzas',
      'salud-datos',
      'auditoria',
      'productos',
      'coordinacion',
      'memoria-decisiones',
      'administracion',
      'ayuda',
    ]);
    assert.deepEqual(primaryNavIds({ showAdmin: false }), [
      'inicio',
      'clientes',
      'oportunidades',
      'cotizaciones',
      'pedidos',
      'mapa',
      'trabajo',
      'conversaciones',
      'aprobaciones',
      'incidencias',
      'compromisos',
      'produccion',
      'almacen',
      'compras',
      'entregas',
      'finanzas',
      'salud-datos',
      'productos',
      'coordinacion',
      'memoria-decisiones',
      'ayuda',
    ]);
    assert.equal(
      filterNavByAccess(PRIMARY_NAV, { showAdmin: false }).some(
        (item) => item.id === 'administracion',
      ),
      false,
    );
  });

  it('keeps Mensajes out of primary nav; Conversaciones is under Trabajo', () => {
    const primaryIds = new Set(PRIMARY_NAV.map((item) => item.id));
    assert.equal(primaryIds.has('finanzas'), true);
    assert.equal(primaryIds.has('mensajes'), false);
    assert.equal(primaryIds.has('conversaciones'), true);
    for (const id of HIDDEN_PRIMARY_NAV_IDS) {
      assert.equal(primaryIds.has(id), false);
    }
    assert.deepEqual(
      FUTURE_NAV.map((item) => item.id),
      ['mensajes'],
    );
  });

  it('labels primary items in Spanish', () => {
    assert.equal(t('nav.oportunidades'), 'Oportunidades');
    assert.equal(t('nav.cotizaciones'), 'Cotizaciones');
    assert.equal(t('nav.mapa'), 'Mapa');
    assert.equal(t('nav.finanzas'), 'Finanzas');
    assert.equal(t('nav.mensajes'), 'Mensajes');
    assert.equal(t('nav.conversaciones'), 'Conversaciones');
  });
});

describe('oportunidades list contract', () => {
  it('deep-links to Cliente 360 opportunity detail', () => {
    assert.equal(
      opportunityHref(sampleOpportunity.partyId, sampleOpportunity.opportunityId),
      '/clientes/party-1/oportunidades/opp-1',
    );
  });

  it('uses open status vocabulary for empty state', () => {
    assert.equal(t('states.emptyOportunidades'), 'Sin oportunidades abiertas');
    assert.equal(t('states.goToClientes'), 'Ir a Clientes');
    assert.equal(sampleOpportunity.status, 'open');
  });
});

describe('cotizaciones list filters', () => {
  it('supports draft and submitted as canonical filters', () => {
    assert.deepEqual([...QUOTE_LIST_STATUSES], ['draft', 'submitted', 'accepted', 'cancelled']);
    assert.equal(parseQuoteListStatus(undefined), 'draft');
    assert.equal(parseQuoteListStatus('draft'), 'draft');
    assert.equal(parseQuoteListStatus('submitted'), 'submitted');
    assert.equal(parseQuoteListStatus('accepted'), 'accepted');
    assert.equal(parseQuoteListStatus('cancelled'), 'cancelled');
    assert.equal(parseQuoteListStatus('won'), 'draft');
  });

  it('builds Spanish filter tabs and list hrefs', () => {
    const options = quoteStatusFilterOptions('draft');
    assert.deepEqual(
      options.map((option) => option.label),
      ['Borrador', 'Enviadas', 'Aceptadas', 'Canceladas'],
    );
    assert.equal(cotizacionesHref('submitted'), '/cotizaciones?status=submitted');
  });

  it('deep-links to existing quote detail', () => {
    assert.equal(
      quoteHref(sampleQuote.partyId, sampleQuote.quoteId),
      '/clientes/party-1/cotizaciones/quote-1',
    );
    assert.equal(t('states.emptyCotizaciones'), 'Sin cotizaciones');
    assert.equal(t('states.viewOpportunities'), 'Ver oportunidades');
  });
});

describe('inicio commercial home', () => {
  it('treats all-zero commercial/work/approvals as empty', () => {
    assert.equal(
      isInicioCommerciallyEmpty({
        opportunities: 0,
        quotesDraft: 0,
        quotesSubmitted: 0,
        work: 0,
        approvals: 0,
      }),
      true,
    );
    assert.equal(
      isInicioCommerciallyEmpty({
        opportunities: 1,
        quotesDraft: 0,
        quotesSubmitted: 0,
        work: 0,
        approvals: 0,
      }),
      false,
    );
  });

  it('hides empty approvals so they do not dominate Inicio', () => {
    assert.equal(
      shouldShowInicioApprovalsSection({
        opportunities: 2,
        quotesDraft: 0,
        quotesSubmitted: 1,
        work: 0,
        approvals: 0,
      }),
      false,
    );
    assert.equal(
      shouldShowInicioApprovalsSection({
        opportunities: 0,
        quotesDraft: 0,
        quotesSubmitted: 0,
        work: 0,
        approvals: 1,
      }),
      true,
    );
  });

  it('exposes commercial empty-state CTAs', () => {
    assert.deepEqual(inicioEmptyCtas(), [
      { href: '/clientes', label: 'Ir a Clientes' },
      { href: '/oportunidades', label: 'Ver oportunidades' },
      { href: '/cotizaciones', label: 'Ver cotizaciones' },
    ]);
    assert.equal(t('states.emptyInicio'), 'Sin actividad comercial todavía');
    assert.match(t('states.emptyInicioHint'), /clientes|oportunidades|cotizaciones/i);
    assert.notEqual(t('states.emptyInicio'), 'No hay pendientes urgentes.');
  });

  it('names commercial Inicio sections in Spanish', () => {
    assert.equal(t('pages.inicio.opportunities'), 'Oportunidades activas');
    assert.equal(t('pages.inicio.quotesDraft'), 'Cotizaciones borrador');
    assert.equal(t('pages.inicio.quotesSubmitted'), 'Cotizaciones enviadas');
    assert.equal(t('pages.inicio.work'), 'Trabajo abierto');
    assert.equal(t('pages.inicio.approvals'), 'Aprobaciones');
  });
});

describe('commercial polish helpers', () => {
  it('keeps status vocabulary consistent across record kinds', () => {
    assert.equal(formatQuoteStatus('submitted'), 'Enviada');
    assert.equal(formatRecordStatus('submitted', 'quote'), 'Enviada');
    assert.equal(formatOpportunityStatus('open'), 'Abierta');
    assert.equal(COMMERCIAL_NEXT_STEP_LABEL, 'Próximo paso');
  });

  it('uses human age on list rows and exact time on detail stamps', () => {
    const asOf = new Date('2026-09-15T18:00:00.000Z');
    const threeHoursAgo = new Date(asOf.getTime() - 3 * 3_600_000).toISOString();
    assert.equal(formatListAge(threeHoursAgo, asOf), 'hace 3 h');
    assert.match(formatTimestamp(threeHoursAgo) ?? '', /\d/);
  });

  it('derives quote next step without inventing a pedido on submit', () => {
    const step = quoteNextStep({
      status: 'submitted',
      partyId: sampleQuote.partyId,
      quoteId: sampleQuote.quoteId,
      canConvertToOrder: false,
      relatedOrderHref: null,
      relatedOrderLabel: null,
      hasPendingApproval: false,
      canRegisterFollowUp: true,
      followUpHref: '/clientes/party-1#trabajo',
    });
    assert.match(step?.statement ?? '', /presentada/i);
    assert.match(step?.statement ?? '', /envío/i);
    assert.doesNotMatch(step?.statement ?? '', /creó un pedido|convertir/i);
  });
});
