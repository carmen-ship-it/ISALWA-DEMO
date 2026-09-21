import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

describe('product-wide visual hierarchy completion', () => {
  it('Inicio counters stay restrained and compact summaries skip desk headers', () => {
    const cards = read('components/inicio/inicio-summary-cards.tsx');
    const bands = read('components/inicio/inicio-visual-band.tsx');
    const tabs = read('components/inicio/inicio-lens-tabs.tsx');
    const opp = read('components/commercial/opportunity-org-list.tsx');
    assert.match(cards, /function cardSurface/);
    assert.match(cards, /nonzero \? 'text-\[var\(--isalwa-danger\)\]'/);
    assert.doesNotMatch(cards, /CARD_SURFACE/);
    assert.match(bands, /bg-\[var\(--isalwa-status-amber-bg\)\]/);
    assert.match(bands, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(tabs, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(opp, /compact = false/);
    assert.match(opp, /data-opportunity-list-layout="summary"/);
  });

  it('quote presented state makes send primary and Enviada is not green', () => {
    const actions = read('components/commercial/quote-document-actions.tsx');
    assert.match(actions, /allowRegister \?[\s\S]{0,80}variant="primary"/);
    assert.match(actions, /downloadVariant=\{allowRegister \? 'secondary' : 'primary'\}/);
    assert.match(actions, /tone="in_progress">Enviada/);
    assert.doesNotMatch(actions, /tone="success">Enviada/);
  });

  it('Cliente 360 documents stack and commercial subsections are distinct', () => {
    const docs = read('components/cliente/cliente-360-documentos.tsx');
    const page = read('app/(app)/clientes/[partyId]/page.tsx');
    const now = read('components/party/cliente-360-now.tsx');
    assert.match(docs, /data-cliente360-documentos-layout="scan"/);
    assert.doesNotMatch(docs, /<table/);
    assert.match(page, /border-l-\[var\(--isalwa-glaze\)\][\s\S]{0,200}Oportunidades/);
    assert.match(page, /border-l-\[var\(--isalwa-sky\)\][\s\S]{0,200}Cotizaciones/);
    assert.match(page, /border-l-\[var\(--isalwa-kiln\)\][\s\S]{0,200}Pedidos/);
    assert.match(page, /bg-\[var\(--isalwa-teal-100\)\]/);
    assert.match(page, /data-section-tone="active"/);
    assert.match(now, /status-red-bg/);
  });

  it('search selection, salud partial, memoria status, and pagination stay', () => {
    const search = read('components/shell/command-palette.tsx');
    const salud = read('app/(app)/salud-datos/page.tsx');
    const memoria = read('app/(app)/memoria-decisiones/page.tsx');
    const compromisos = read('app/(app)/compromisos/page.tsx');
    assert.match(search, /selected \? 'bg-\[var\(--isalwa-teal-100\)\]'/);
    assert.match(salud, /25 clientes activos visibles/);
    assert.match(salud, /--isalwa-sky/);
    assert.match(memoria, /tone=\{item\.status === 'approved' \? 'approved' : 'rejected'\}/);
    assert.match(memoria, /ListPageNav/);
    assert.match(compromisos, /ListPageNav/);
  });

  it('accepted ops hierarchy from f757130 is still present', () => {
    const handoff = read('components/postsale/pedido-handoff-panel.tsx');
    const delivery = read('components/delivery/delivery-documents-panel.tsx');
    const review = read('components/purchasing/pending-supply-review-card.tsx');
    assert.match(handoff, /labelVisibility=\{fieldOnly \? 'visible' : 'sr-only'\}/);
    assert.match(delivery, /Próxima acción/);
    assert.match(review, /variant="primary"/);
  });
});
