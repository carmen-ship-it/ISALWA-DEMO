import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  SUGGESTION_CARD_COPY,
  SUGGESTION_TYPE_LABEL,
  buildRecommendedReplyView,
  demoRecommendedReplyFor,
  demoSuggestionRuleIds,
  draftContainsOverpromise,
  matchDemoSuggestionRules,
  nextMondayIso,
} from './smart-context';

const here = dirname(fileURLToPath(import.meta.url));

describe('deterministic demo suggestion rules', () => {
  it('matches quantity 20 opportunity phrase and marks demo', () => {
    const hits = matchDemoSuggestionRules({
      messageText: 'Necesito cotizar 20 unidades para una obra nueva.',
    });
    assert.equal(hits.length, 1);
    assert.equal(hits[0]?.type, 'possible_opportunity');
    assert.equal(hits[0]?.isDemo, true);
    assert.equal(hits[0]?.primaryActionLabel, 'Crear oportunidad');
    assert.match(hits[0]?.explanation ?? '', /posible compra/);
  });

  it('matches Q-DEMO-001 acceptance without auto-convert', () => {
    const hits = matchDemoSuggestionRules({
      messageText: 'Perfecto, aceptamos la cotización Q-DEMO-001.',
    });
    assert.equal(hits[0]?.type, 'possible_acceptance');
    assert.equal(hits[0]?.relatedLabel, 'Q-DEMO-001');
    assert.equal(hits[0]?.primaryActionLabel, 'Revisar cotización');
    assert.equal(hits[0]?.isDemo, true);
  });

  it('matches 3 piezas quebradas as possible issue', () => {
    const hits = matchDemoSuggestionRules({
      messageText: 'Nos llegaron 3 piezas quebradas.',
    });
    assert.equal(hits[0]?.type, 'possible_issue');
    assert.ok(hits[0]?.detected.some((d) => d.includes('3')));
  });

  it('matches Llámame el lunes follow-up with next Monday proposal', () => {
    const hits = matchDemoSuggestionRules({
      messageText: 'Llámame el lunes.',
      messageAt: '2026-09-16T15:00:00.000Z', // Wednesday
    });
    assert.equal(hits[0]?.type, 'possible_follow_up');
    assert.equal(nextMondayIso('2026-09-16T15:00:00.000Z'), '2026-09-21');
    assert.match(hits[0]?.relatedLabel ?? '', /2026-09-21/);
  });

  it('matches commitment and product/delivery questions', () => {
    assert.equal(
      matchDemoSuggestionRules({ messageText: 'Yo les confirmo mañana.' })[0]?.type,
      'possible_commitment',
    );
    assert.equal(
      matchDemoSuggestionRules({ messageText: '¿Tienen este producto en 6 mm?' })[0]?.type,
      'product_question',
    );
    assert.equal(
      matchDemoSuggestionRules({ messageText: '¿Cuándo llega nuestro pedido?' })[0]?.type,
      'delivery_question',
    );
  });

  it('covers owned demo rule ids', () => {
    const ids = demoSuggestionRuleIds();
    assert.ok(ids.includes('demo-opportunity-qty-20'));
    assert.ok(ids.includes('demo-acceptance-q-demo-001'));
    assert.ok(ids.includes('demo-issue-broken-pieces'));
    assert.ok(ids.includes('demo-followup-llamame-lunes'));
    assert.ok(ids.includes('demo-followup-estado-pedido'));
  });

  it('matches MADERAS-style pedido follow-up without delivery-when phrasing', () => {
    const hits = matchDemoSuggestionRules({
      messageText: 'Buenos días. Confirmamos el pedido de sanitarios para el depósito Oriente. Gracias.',
    });
    assert.equal(hits[0]?.type, 'possible_follow_up');
    assert.equal(hits[0]?.id, 'demo-followup-estado-pedido');
  });
});

describe('suggestion card structure', () => {
  it('keeps SUGERENCIA / Revisar / Ignorar and type labels', () => {
    assert.equal(SUGGESTION_CARD_COPY.kicker, 'SUGERENCIA');
    assert.equal(SUGGESTION_CARD_COPY.review, 'Revisar');
    assert.equal(SUGGESTION_CARD_COPY.ignore, 'Ignorar');
    assert.equal(SUGGESTION_TYPE_LABEL.possible_opportunity, 'POSIBLE OPORTUNIDAD');
    assert.equal(SUGGESTION_TYPE_LABEL.possible_acceptance, 'POSIBLE ACEPTACIÓN');
    assert.equal(SUGGESTION_TYPE_LABEL.possible_issue, 'POSIBLE INCIDENCIA');

    const card = readFileSync(join(here, '../../components/conversations/suggestion-card.tsx'), 'utf8');
    assert.match(card, /SUGGESTION_CARD_COPY\.kicker/);
    assert.match(card, /onReview/);
    assert.match(card, /onIgnore/);
    assert.doesNotMatch(card, /auto-?execute|autoExecute/i);
  });
});

describe('recommended reply panel', () => {
  it('builds RESPUESTA SUGERIDA with copy CTA and never auto-send', () => {
    const view = buildRecommendedReplyView({
      body: 'Déjeme confirmar disponibilidad actual antes de ofrecérsela.',
      badges: ['pending'],
      allowRecordSent: true,
    });
    assert.equal(view.title, 'RESPUESTA SUGERIDA');
    assert.equal(view.copyLabel, 'Copiar respuesta');
    assert.equal(view.recordSentLabel, 'Registrar como enviada');
    assert.match(view.neverAutoSend, /no envía WhatsApp automáticamente/i);

    const panel = readFileSync(
      join(here, '../../components/conversations/recommended-reply-panel.tsx'),
      'utf8',
    );
    assert.match(panel, /data-auto-send="never"/);
    assert.match(panel, /view\.copyLabel/);
    assert.match(panel, /RECOMMENDED_REPLY_COPY/);
    assert.doesNotMatch(panel, /sendWhatsApp|autoSend/);
  });

  it('blocks overpromise drafts and provides courteous demo replies', () => {
    assert.equal(draftContainsOverpromise('mañana llega seguro'), true);
    assert.equal(draftContainsOverpromise('Voy a confirmar la fecha.'), false);
    const product = demoRecommendedReplyFor('product_6mm_catalog_no_stock');
    assert.match(product.body, /Déjeme confirmar disponibilidad/);
    assert.equal(product.certainty, 'pending');
  });
});
