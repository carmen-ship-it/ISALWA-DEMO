import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { ENTREGA_PAGE_SECTIONS } from '@/lib/delivery/entrega-sections';
import { buildEntregaChronology } from '@/lib/delivery/chronology';
import { entregaEnabled, entregaGate } from '@/lib/delivery/entrega-gate';
import { ENTREGA_PANEL_COPY } from '@isalwa/os-contracts';
import { presentDeliveryNoteLabel } from '@/lib/commercial/human-facing';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../..');

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf8');
}

describe('Task 7 Entregas restructure', () => {
  it('LOCAL_NAV_LABELS exact order', () => {
    assert.deepEqual(
      ENTREGA_PAGE_SECTIONS.map((s) => s.label),
      ['Pendientes', 'Notas de entrega', 'Salidas', 'Entregas', 'Historial'],
    );
  });

  it('SALIDA_REQUIRES_NOTA = NO; ENTREGA_REQUIRES_SALIDA + RECIBIDO_POR = YES', () => {
    assert.equal(entregaGate({ hasSalida: false, receivedBy: 'Ana' }), 'needs-salida');
    assert.equal(entregaGate({ hasSalida: true, receivedBy: '' }), 'needs-received-by');
    assert.equal(entregaEnabled({ hasSalida: true, receivedBy: 'Ana' }), true);
    // Gate never mentions nota
    assert.equal(entregaGate({ hasSalida: true, receivedBy: 'Ana' }), 'ready');
  });

  it('event labels stay distinct; Nota never implies delivery', () => {
    const items = buildEntregaChronology({
      warehouseExits: [
        {
          id: 'e1',
          exitedAt: '2026-09-14T13:00:00.000Z',
          recordedByLabel: 'Almacén',
          notes: null,
          lines: [{ quantity: 2 }],
        },
      ],
      deliveries: [
        {
          id: 'd1',
          deliveredAt: '2026-09-14T14:00:00.000Z',
          deliveredTo: 'Recepción',
          recordedByLabel: 'Ruta',
          notes: null,
          lines: [{ quantity: 2 }],
        },
      ],
    });
    assert.equal(items[0]?.label, 'Salida registrada');
    assert.equal(items[1]?.label, 'Entrega registrada');
    assert.match(items[1]?.detail ?? '', /Recibido por/);
    assert.equal(items.some((i) => i.label === 'Nota de entrega'), false);
    assert.equal(items.some((i) => /Llegó al cliente/.test(i.detail)), false);
  });

  it('VISIBLE_NE_PILOT_REFERENCES = 0 in UX copy and surfaces', () => {
    assert.doesNotMatch(ENTREGA_PANEL_COPY.numberingUnknown, /NE-PILOT/);
    const label = presentDeliveryNoteLabel({
      internalDocumentRef: 'NE-PILOT-01M2RJRGHD8MRNNCGZ6ZMQRFT0',
      orderNumber: 'O-000042',
    });
    assert.doesNotMatch(label, /NE-PILOT/);
    assert.match(label, /Nota de entrega/);

    const page = read('apps/os-web/app/(app)/entregas/page.tsx');
    const docs = read('apps/os-web/components/delivery/delivery-documents-panel.tsx');
    const panel = read('apps/os-web/components/delivery/entrega-panel.tsx');
    const desk = read('apps/os-web/components/delivery/entrega-operational-write-desk.tsx');
    for (const src of [page, docs, panel, desk]) {
      assert.doesNotMatch(src, /NE-PILOT-[A-Za-z0-9]/);
    }
  });

  it('VISIBLE_LINE_CONTRADICTIONS = 0 — never claim no quote lines while rendering lines', () => {
    const docs = read('apps/os-web/components/delivery/delivery-documents-panel.tsx');
    assert.equal(docs.includes('Esta cotización no tiene líneas guardadas'), false);
    assert.match(docs, /Sin productos guardados en la cotización/);
    assert.match(docs, /data-frozen-quote-context/);
    assert.match(docs, /Cantidades a registrar/);
  });

  it('GENERIC_REGISTRAR_CTA = 0; contextual CTAs present', () => {
    const page = read('apps/os-web/app/(app)/entregas/page.tsx');
    const desk = read('apps/os-web/components/delivery/entrega-operational-write-desk.tsx');
    const docs = read('apps/os-web/components/delivery/delivery-documents-panel.tsx');
    assert.doesNotMatch(page, />\s*Registrar\s*</);
    assert.doesNotMatch(desk, /Registrar aquí/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.createNota/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.recordSalida/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.recordEntrega/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.downloadPdf/);
    assert.match(docs, /data-delivery-pdf-action/);
    assert.equal(ENTREGA_PANEL_COPY.createNota, 'Crear nota de entrega');
    assert.equal(ENTREGA_PANEL_COPY.recordSalida, 'Registrar salida');
    assert.equal(ENTREGA_PANEL_COPY.recordEntrega, 'Registrar entrega');
    assert.equal(ENTREGA_PANEL_COPY.downloadPdf, 'Descargar PDF');
  });

  it('page wires local nav + single policy disclosure', () => {
    const page = read('apps/os-web/app/(app)/entregas/page.tsx');
    assert.match(page, /EntregaSectionNav/);
    assert.match(page, /EntregaPageDisclaimer/);
    const disclaimer = read('apps/os-web/components/delivery/entrega-page-disclaimer.tsx');
    assert.match(disclaimer, /no es factura/i);
    assert.match(disclaimer, /no significa que el pedido/i);
  });

  it('section targets exist for nav jumps', () => {
    const docs = read('apps/os-web/components/delivery/delivery-documents-panel.tsx');
    const panel = read('apps/os-web/components/delivery/entrega-panel.tsx');
    assert.match(docs, /id="entregas-pendientes"/);
    assert.match(docs, /id="entregas-notas"/);
    assert.match(docs, /id="entregas-historial"/);
    assert.match(panel, /id="entregas-salidas"/);
    assert.match(panel, /id="entregas-entregas"/);
  });
});

describe('Task 7 HOSTED_CORRECTIVE', () => {
  it('frozen lines present → no empty quote copy; empty only when load state empty', () => {
    const docs = read('apps/os-web/components/delivery/delivery-documents-panel.tsx');
    assert.match(docs, /frozenState === 'empty'/);
    assert.match(docs, /data-quote-empty/);
    assert.match(docs, /data-order-quantity-rows/);
    assert.match(docs, /Líneas del pedido/);
    // Empty message only under frozenState === 'empty', not as default alongside quantity rows
    assert.match(docs, /frozenState === 'lines'/);
    assert.match(docs, /quoteLoadState/);
  });

  it('local nav uses isalwa-sticky-under-shell (top of shell scrollport)', () => {
    const nav = read('apps/os-web/components/delivery/entrega-section-nav.tsx');
    assert.match(nav, /isalwa-sticky-under-shell/);
    assert.doesNotMatch(nav, /top-\[var\(--isalwa-shell-header-offset/);
    const css = read('apps/os-web/styles/visual-mobile.css');
    assert.match(css, /--isalwa-entrega-sticky-nav-offset/);
    assert.match(css, /\[id\^=['"]entregas-['"]\]/);
  });

  it('recipient fallback is No registrado, not Registro interno', () => {
    const map = read('apps/os-web/lib/delivery/map-fulfillment.ts');
    assert.match(map, /presentRecibidoPorLabel/);
    assert.match(map, /RECIBIDO_POR_ABSENT/);
    assert.doesNotMatch(
      map,
      /deliveredTo: item\.deliveredTo \? presentEntregaAuditLabel\(item\.deliveredTo\)/,
    );
    const panel = read('apps/os-web/components/delivery/entrega-panel.tsx');
    assert.match(panel, /No registrado/);
    assert.match(panel, /data-recibido-por/);
  });
});
