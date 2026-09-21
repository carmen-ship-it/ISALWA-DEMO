import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { quantityWithUnit, unitWord } from "./quantity-unit";
import { mapLocationCountLabel } from "../map/build-view-model";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel: string) => readFileSync(join(root, rel), "utf8");

describe("visual acceptance repair", () => {
  it("keeps Almacén status and actions in separate columns", () => {
    const page = read("app/(app)/almacen/page.tsx");
    assert.match(page, /label: 'Acciones'/);
    assert.match(page, /label: 'Estado'/);
    assert.match(page, /primaryAction=\{reviewAction\}/);
    assert.match(page, /actionLabel="Ver pedido"/);
    assert.match(page, /row\.warehouseReviewWorkId \?/);
    assert.doesNotMatch(page, /secondaryActions=\{reviewAction\}/);
    assert.match(page, /Registrar ingreso/);
    assert.doesNotMatch(page, /\+ Registrar ingreso/);
  });

  it("uses the editable field class and singular or plural units", () => {
    const docs = read("components/delivery/delivery-documents-panel.tsx");
    const warehouse = read("components/warehouse/warehouse-postsale-desk.tsx");
    assert.match(docs, /className="isalwa-field/);
    assert.match(warehouse, /isalwa-field/);
    assert.equal(unitWord("unidad", 1), "unidad");
    assert.equal(unitWord("unidad", 2), "unidades");
    assert.equal(quantityWithUnit(2, "unidad"), "2 unidades");
    assert.equal(quantityWithUnit(1, "unidades"), "1 unidad");
    assert.doesNotMatch(docs, /de \{line\.quantity\}/);
  });

  it("matches nota actions to the single correction command", () => {
    const docs = read("components/delivery/delivery-documents-panel.tsx");
    assert.match(docs, /actionPrimaryClass/);
    assert.match(docs, /ENTREGA_PANEL_COPY\.downloadPdf/);
    assert.match(docs, /Corregir o anular/);
    assert.match(docs, /variant="danger"/);
    assert.match(docs, /Anular nota/);
    assert.match(docs, /correctDeliveryDocumentAction/);
    assert.doesNotMatch(docs, /Corregir \/ anular/);
  });

  it("keeps one recorrido entry and white attention surfaces", () => {
    const inicio = read("app/(app)/inicio/page.tsx");
    const shell = read("components/shell/app-shell.tsx");
    const queues = read("components/inicio/inicio-command-queue-sections.tsx");
    const bands = read("components/inicio/inicio-visual-band.tsx");
    assert.match(shell, /VerEjemploCompletoButton/);
    assert.doesNotMatch(inicio, /InicioOwnerDemoCard/);
    assert.doesNotMatch(inicio, /Abrir con enlace/);
    assert.match(queues, /pendientes: 'ops'/);
    assert.match(queues, /bg-white/);
    assert.match(bands, /border-\[var\(--isalwa-status-amber-2\)\] bg-white/);
  });

  it("uses customer map language and hides unsupported layers", () => {
    const controls = read("components/map/map-layer-controls.tsx");
    const banner = read("components/map/map-coverage-banner.tsx");
    const experience = read("components/map/map-experience.tsx");
    const lens = read("lib/map/commercial-lens.ts");
    const lists = read("components/map/map-customer-lists.tsx");
    const i18n = read("lib/i18n/es.ts");
    const layers = read("lib/map/layers.ts");
    assert.match(i18n, /Consulta clientes y oportunidades por ubicación\./);
    assert.match(banner, /Con ubicación/);
    assert.match(banner, /Sin ubicación confirmada/);
    assert.match(banner, /Clientes revisados/);
    assert.match(banner, /Mostramos únicamente clientes con una ubicación confirmada\./);
    assert.match(experience, /Resumen comercial/);
    assert.match(experience, /MAP_COMMERCIAL_VALUE_DISCLAIMER/);
    assert.match(lens, /no representan ingresos contables/i);
    assert.match(lists, /Sin ubicación confirmada/);
    assert.doesNotMatch(lists, /No se inventan|geocodific|solo un enlace/i);
    assert.doesNotMatch(controls, /Cobranza|Despacho|Stock|Equipo|manual|próx/);
    assert.match(controls, /availableMapLayers/);
    assert.match(layers, /id: 'clientes'/);
    assert.match(layers, /id: 'cobranza'/);
    assert.equal(mapLocationCountLabel(5), "5 clientes con ubicación en el mapa");
    assert.equal(mapLocationCountLabel(1), "1 cliente con ubicación en el mapa");
    for (const file of [controls, banner, experience, lists]) {
      assert.doesNotMatch(file, /canónico|canónica|cobertura honesta|Lente geográfica|No inventa|CARTERA LEÍDA/i);
    }
  });
});
