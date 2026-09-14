import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { GUIDE_CHROME } from './copy';
import { handleGuideEscape, restoreHeadingFocus, type GuideDoc, type GuideFocusable } from './focus';
import {
  GUIDE_ROUTES_IN_BRANCH,
  JOURNEYS,
  continueHref,
  journeysForViewer,
  nowAnswer,
} from './journeys';
import {
  GUIDE_STORAGE_KEY,
  LEGACY_WALKTHROUGH_STORAGE_KEY,
  loadGuide,
  resumeTooltipOverlay,
  saveGuide,
  type KeyValueStore,
} from './persistence';
import {
  collectGuideCopy,
  continueGuide,
  dismissGuide,
  initialGuideRecord,
  replayFromAyuda,
  resetGuide,
  resumeGuide,
  revealGuide,
} from './progress';

const here = dirname(fileURLToPath(import.meta.url));

function memoryStore(seed: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const data = { ...seed };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] ?? null : null;
    },
    setItem(key, value) {
      data[key] = value;
    },
    dump() {
      return { ...data };
    },
  };
}

function headingDoc(options: { heading?: boolean; bodyFocus?: () => void } = {}): {
  doc: GuideDoc;
  heading: GuideFocusable & { focused: boolean };
  bodyFocused: () => boolean;
} {
  let bodyHits = 0;
  const heading: GuideFocusable & { focused: boolean } = {
    focused: false,
    focus() {
      this.focused = true;
    },
    closest() {
      return null;
    },
    getAttribute() {
      return null;
    },
    setAttribute() {},
  };
  const panelHeading: GuideFocusable = {
    focus() {
      throw new Error('focused the panel heading');
    },
    closest(selector: string) {
      return selector === '[data-guide-panel]' ? {} : null;
    },
  };
  const body = {
    focus() {
      bodyHits += 1;
      options.bodyFocus?.();
    },
  };
  const doc: GuideDoc = {
    body,
    activeElement: body,
    querySelector(selector: string) {
      if (selector === '[role="dialog"][aria-modal="true"]') return null;
      return null;
    },
    querySelectorAll() {
      if (!options.heading && options.heading !== undefined) return [];
      return [panelHeading, heading];
    },
  };
  return {
    doc,
    heading,
    bodyFocused: () => bodyHits > 0,
  };
}

describe('modo guiado', () => {
  it('dismiss hides the panel and does not erase progress unless the user resets', () => {
    const advanced = continueGuide(initialGuideRecord());
    const hidden = dismissGuide(advanced.record);
    assert.equal(hidden.panelHidden, true);
    assert.equal(hidden.currentJourneyId, advanced.record.currentJourneyId);
    assert.equal(hidden.stopIndex, advanced.record.stopIndex);
    assert.deepEqual(hidden.completedJourneyIds, advanced.record.completedJourneyIds);

    const shown = revealGuide(hidden);
    assert.equal(shown.panelHidden, false);
    assert.equal(shown.stopIndex, hidden.stopIndex);
    assert.equal(shown.currentJourneyId, hidden.currentJourneyId);

    const cleared = resetGuide();
    assert.equal(cleared.stopIndex, 0);
    assert.deepEqual(cleared.completedJourneyIds, []);
    assert.equal(cleared.panelHidden, false);
  });

  it('Continuar records the next stop and then the next journey on a real route', () => {
    const first = continueGuide(initialGuideRecord());
    assert.equal(first.href, '/clientes');
    assert.equal(first.blocked, null);
    assert.equal(first.record.currentJourneyId, 'vender');
    assert.equal(first.record.stopIndex, 1);

    const second = continueGuide(first.record);
    assert.equal(second.href, '/cotizaciones');
    assert.equal(second.record.currentJourneyId, 'pedido');
    assert.equal(second.record.stopIndex, 0);
    assert.deepEqual(second.record.completedJourneyIds, ['vender']);
  });

  it('Escape restores focus to a heading and does not leave it on document.body', () => {
    const { doc, heading, bodyFocused } = headingDoc({ heading: true });
    assert.equal(handleGuideEscape(doc), 'hidden');
    assert.equal(heading.focused, true);
    assert.equal(bodyFocused(), false);
    assert.equal(restoreHeadingFocus(doc), true);
    assert.equal(bodyFocused(), false);
  });

  it('does not focus document.body when no heading exists either', () => {
    const { doc, bodyFocused } = headingDoc({ heading: false });
    assert.equal(restoreHeadingFocus(doc), false);
    assert.equal(handleGuideEscape(doc), 'hidden');
    assert.equal(bodyFocused(), false);
  });

  it('Continuar opens the operating pages that exist and does not claim they are live', () => {
    const mounted = [
      ['produccion', '/produccion'],
      ['almacen', '/almacen'],
      ['entregar', '/entregas'],
      ['coordinar', '/coordinacion'],
    ] as const;
    for (const [id, href] of mounted) {
      const journey = JOURNEYS.find((item) => item.id === id);
      assert.ok(journey);
      assert.equal(journey.stops[0]?.href, href);
      const outcome = continueGuide({
        ...initialGuideRecord(),
        currentJourneyId: id,
        stopIndex: 0,
      });
      assert.equal(outcome.href, href);
      assert.equal(outcome.blocked, null);
      assert.doesNotMatch(
        `${journey.summary} ${outcome.message ?? ''}`,
        /en vivo|conectad|cargad|disponible|oficial|whatsapp|mapa/i,
      );
    }
  });

  it('a pedido pattern does not invent an order screen', () => {
    const outcome = continueGuide({
      ...initialGuideRecord(),
      currentJourneyId: 'pedido',
      stopIndex: 0,
    });
    assert.equal(outcome.href, null);
    assert.equal(outcome.blocked, 'pattern');
    assert.match(outcome.message ?? '', /ya existe/);
    assert.doesNotMatch(outcome.message ?? '', /#\d|PED-|pedido\s+\d|orderId/i);
  });

  it('a problem points at coordinación or an existing pedido and does not invent a case', () => {
    const first = continueGuide({
      ...initialGuideRecord(),
      currentJourneyId: 'problema',
      stopIndex: 0,
    });
    assert.equal(first.href, '/coordinacion');
    assert.equal(first.blocked, null);
    const second = continueGuide(first.record);
    assert.equal(second.href, null);
    assert.equal(second.blocked, 'pattern');
    assert.match(second.message ?? '', /ya existe/);
    assert.doesNotMatch(`${first.message ?? ''} ${second.message ?? ''}`, /caso\s+\d|#\d|PED-/i);
  });

  it('Continuar refuses a route that is not a page on this branch', () => {
    assert.equal(continueHref('/produccion'), '/produccion');
    assert.equal(continueHref('/clientes/x/pedidos/1'), null);
    assert.equal(continueHref('/no-existe'), null);
    assert.equal(continueHref(null), null);
    for (const href of GUIDE_ROUTES_IN_BRANCH) {
      assert.equal(existsSync(join(here, `../../app/(app)${href}/page.tsx`)), true, href);
    }
  });

  it('refresh resumes the stored journey instead of a chapter from another page', () => {
    const stored = {
      ...initialGuideRecord(),
      currentJourneyId: 'vender',
      stopIndex: 1,
    };
    const resumed = resumeGuide(stored, '/inicio');
    assert.equal(resumed.currentJourneyId, 'vender');
    assert.equal(resumed.stopIndex, 1);
    assert.notEqual(resumed.currentJourneyId, 'gerencia');
  });

  it('replay from the ayuda export exists and does not wipe other progress', () => {
    const ayuda = readFileSync(join(here, '../../app/(app)/ayuda/page.tsx'), 'utf8');
    const panel = readFileSync(
      join(here, '../../components/walkthrough/walkthrough-help-panel.tsx'),
      'utf8',
    );
    assert.match(ayuda, /WalkthroughHelpPanel/);
    assert.match(ayuda, /data-guide-replay/);
    assert.match(panel, /replayFromAyuda/);
    assert.match(panel, /export \{ replayFromAyuda \}/);

    const record = {
      ...initialGuideRecord(),
      currentJourneyId: 'gerencia',
      stopIndex: 0,
      completedJourneyIds: ['vender', 'gerencia'],
      panelHidden: true,
    };
    const replayed = replayFromAyuda(record, 'vender');
    assert.equal(replayed.currentJourneyId, 'vender');
    assert.equal(replayed.stopIndex, 0);
    assert.equal(replayed.panelHidden, false);
    assert.deepEqual(replayed.completedJourneyIds, ['gerencia']);
  });

  it('hides a journey the viewer cannot open', () => {
    const homeOnly = journeysForViewer({ openHrefs: ['/inicio'] }).map((journey) => journey.id);
    assert.equal(homeOnly.includes('vender'), false);
    assert.equal(homeOnly.includes('pedido'), false);
    assert.equal(homeOnly.includes('gerencia'), true);

    const finance = journeysForViewer({ roleKeys: ['finance.admin'] }).map((journey) => journey.id);
    assert.equal(finance.includes('produccion'), false);
    assert.equal(finance.includes('almacen'), false);
    assert.equal(finance.includes('entregar'), false);
    assert.equal(finance.includes('coordinar'), false);
    assert.equal(finance.includes('problema'), false);
    assert.equal(finance.includes('vender'), true);
    assert.equal(finance.includes('gerencia'), true);

    const financeRecord = journeysForViewer({
      roleKeys: ['finance.operational.record'],
      openHrefs: ['/inicio', '/produccion', '/almacen', '/entregas', '/coordinacion', '/clientes'],
    }).map((journey) => journey.id);
    for (const id of ['produccion', 'almacen', 'entregar', 'coordinar']) {
      assert.equal(financeRecord.includes(id), false, id);
    }

    const floor = journeysForViewer({ roleKeys: ['production.operational.record'] }).map(
      (journey) => journey.id,
    );
    assert.equal(floor.includes('produccion'), true);
    assert.equal(floor.includes('almacen'), true);
  });

  it('answers ¿Qué hago ahora? without claiming a capability is live', () => {
    const panel = readFileSync(
      join(here, '../../components/walkthrough/guide-panel.tsx'),
      'utf8',
    );
    assert.match(panel, /nowQuestion/);
    assert.match(GUIDE_CHROME.nowQuestion, /¿Qué hago ahora\?/);

    const entregar = JOURNEYS.find((journey) => journey.id === 'entregar');
    const gerencia = JOURNEYS.find((journey) => journey.id === 'gerencia');
    assert.ok(entregar?.stops[0]);
    assert.ok(gerencia?.stops[0]);
    assert.match(nowAnswer(entregar.stops[0], { roleKeys: ['operations'] }), /No confirme un número/);
    assert.doesNotMatch(nowAnswer(entregar.stops[0], { roleKeys: ['operations'] }), /\d/);
    assert.match(nowAnswer(gerencia.stops[0], { roleKeys: ['finance.admin'] }), /No invente cifras/);
    assert.doesNotMatch(nowAnswer(gerencia.stops[0], { roleKeys: ['org.admin'] }), /\d|Bs\.|USD/);

    const copy = collectGuideCopy().join('\n');
    assert.match(copy, /¿Qué hago ahora\?/);
    assert.doesNotMatch(
      copy,
      /en vivo|conectad|cargad|disponible|oficial|whatsapp|mapa|esta ola|nota de entrega|\blive\b/i,
    );
  });

  it('panel copy contains no organization id and no customer name', () => {
    const copy = collectGuideCopy().join('\n');
    assert.doesNotMatch(copy, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    assert.doesNotMatch(copy, /organizationId|organization_id|x-os-organization-id|org_[A-Za-z0-9]{6,}/);
    assert.doesNotMatch(copy, /Distribuidora La Paz|Comercial Andina|La Paz S\.R\.L|García|Pérez|Ana |Juan |María/);
    assert.doesNotMatch(copy, /\bPED-\d|#\d{2,}|\bpedido\s+\d|\borden\s+\d|orderId/i);
    assert.doesNotMatch(copy, /buscar|busca\b|sugerencia|prueba con|escribe el/i);
    assert.doesNotMatch(copy, /whatsapp|mapa|nota de entrega|lista de precios|conectad|en vivo|\blive\b|número oficial|numero oficial|oficial/i);
    assert.match(copy, new RegExp(GUIDE_CHROME.title));
  });

  it('keeps progress in local UI state and does not resume the old tooltip overlay', () => {
    const store = memoryStore({
      [LEGACY_WALKTHROUGH_STORAGE_KEY]: JSON.stringify({
        version: 2,
        runState: 'DISMISSED',
        learningMode: false,
        chapterId: 'global',
        stepId: 'home-attention',
        organizationId: 'org_should_not_load',
      }),
    });
    const loaded = loadGuide(store);
    assert.equal(loaded.panelHidden, false);
    assert.equal(resumeTooltipOverlay(store.getItem(LEGACY_WALKTHROUGH_STORAGE_KEY)), null);
    assert.equal(store.getItem(GUIDE_STORAGE_KEY), null);

    const advanced = continueGuide(initialGuideRecord());
    saveGuide(store, dismissGuide(advanced.record));
    const saved = JSON.parse(store.getItem(GUIDE_STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    assert.equal(saved.panelHidden, true);
    assert.equal(saved.currentJourneyId, advanced.record.currentJourneyId);
    assert.equal(saved.stopIndex, advanced.record.stopIndex);
    assert.equal('organizationId' in saved, false);
    assert.equal('customerName' in saved, false);
    assert.equal('orderNumber' in saved, false);
    assert.equal('learningMode' in saved, false);

    const persistence = readFileSync(join(here, 'persistence.ts'), 'utf8');
    assert.doesNotMatch(persistence, /fetch\(|organizationId|supabase/);
    const shell = readFileSync(join(here, '../../components/walkthrough/walkthrough-shell.tsx'), 'utf8');
    assert.doesNotMatch(shell, /WalkthroughPopover|walkthrough-popover|aria-modal/);
  });
});
