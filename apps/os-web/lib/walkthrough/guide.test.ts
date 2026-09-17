import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { GUIDE_CHROME, INTRO_COPY, LEARNING_MODE_COPY, PAGE_MICRO_TOURS, canViewMicroTour, getMicroTourForPage } from './copy';
import { handleGuideEscape, restoreHeadingFocus, type GuideDoc, type GuideFocusable } from './focus';
import { JOURNEYS, journeysForViewer } from './journeys';
import {
  GUIDE_STORAGE_KEY,
  GUIDE_STORAGE_KEY_PREFIX,
  LEGACY_WALKTHROUGH_STORAGE_KEY,
  guideStorageKey,
  loadGuide,
  resumeTooltipOverlay,
  saveGuide,
  type KeyValueStore,
} from './persistence';
import {
  advanceIntro,
  collectGuideCopy,
  continueGuide,
  dismissGuide,
  hasSeenPageTour,
  initialGuideRecord,
  markPageTourSeen,
  migrateV1ToV2,
  replayFromAyuda,
  replayIntro,
  resetGuide,
  resumeGuide,
  revealGuide,
  setLearningMode,
  skipIntro,
  startIntro,
  toggleLearningMode,
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
    assert.equal(cleared.panelHidden, true);
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
    assert.doesNotMatch(outcome.message ?? '', /#\d|PED-|pedido\s+\d/i);
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
    assert.equal(finance.includes('vender'), true);
  });

  it('panel copy contains no organization id and no customer name', () => {
    const copy = collectGuideCopy().join('\n');
    assert.doesNotMatch(copy, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    assert.doesNotMatch(copy, /organizationId|organization_id|x-os-organization-id|org_[A-Za-z0-9]{6,}/);
    assert.doesNotMatch(copy, /Distribuidora La Paz|Comercial Andina|La Paz S\.R\.L|García|Pérez|Ana |Juan |María/);
    assert.doesNotMatch(copy, /\bPED-\d|#\d{2,}|\bpedido\s+\d|\borden\s+\d|orderId/i);
    // Don't give specific search suggestions (e.g., "busca María", "escribe el nombre")
    // "buscar clientes" describing functionality is allowed
    assert.doesNotMatch(copy, /busca\s+[A-Z][a-z]+|busca\s+".*"|prueba con|escribe el/i);
    // "mapa" alone is allowed (it's a page name); block "mapa en vivo" or provider claims
    assert.doesNotMatch(copy, /whatsapp|nota de entrega|lista de precios|conectad|en vivo|\blive\b|número oficial|numero oficial/i);
    assert.match(copy, new RegExp(GUIDE_CHROME.title));
  });

  it('keeps progress in member-scoped local UI state and does not resume the old tooltip overlay', () => {
    const memberA = '01ORG:01MEM_A';
    const memberB = '01ORG:01MEM_B';
    const keyA = guideStorageKey(memberA);
    assert.ok(keyA);
    assert.equal(keyA.startsWith(`${GUIDE_STORAGE_KEY_PREFIX}:`), true);
    assert.notEqual(keyA, GUIDE_STORAGE_KEY);

    const store = memoryStore({
      [LEGACY_WALKTHROUGH_STORAGE_KEY]: JSON.stringify({
        version: 2,
        runState: 'DISMISSED',
        learningMode: false,
        chapterId: 'global',
        stepId: 'home-attention',
        organizationId: 'org_should_not_load',
      }),
      // Legacy browser-global key must be ignored (cross-member leak vector).
      [GUIDE_STORAGE_KEY]: JSON.stringify({
        version: 2,
        currentJourneyId: 'vender',
        stopIndex: 2,
        completedJourneyIds: ['gerencia'],
        panelHidden: false,
        welcomeSeen: true,
        introCompleted: true,
        introSkipped: false,
        introStepIndex: 6,
        learningModeEnabled: false,
        pageTourSeen: { clientes: true },
      }),
    });

    // Without a member scope: never read/write the bare key.
    const unscope = loadGuide(store, null);
    assert.equal(unscope.introCompleted, false);
    assert.equal(unscope.welcomeSeen, false);
    saveGuide(store, { ...initialGuideRecord(), introCompleted: true, welcomeSeen: true }, null);
    assert.equal(store.getItem(GUIDE_STORAGE_KEY), store.dump()[GUIDE_STORAGE_KEY]);

    // Member A starts fresh despite legacy global completion.
    const loadedA = loadGuide(store, memberA);
    assert.equal(loadedA.panelHidden, true);
    assert.equal(loadedA.introCompleted, false);
    assert.equal(resumeTooltipOverlay(store.getItem(LEGACY_WALKTHROUGH_STORAGE_KEY)), null);

    const advanced = continueGuide(initialGuideRecord());
    const completedA = {
      ...dismissGuide(advanced.record),
      welcomeSeen: true,
      introCompleted: true,
    };
    saveGuide(store, completedA, memberA);
    const savedA = JSON.parse(store.getItem(keyA!) ?? '{}') as Record<string, unknown>;
    assert.equal(savedA.panelHidden, true);
    assert.equal(savedA.introCompleted, true);
    assert.equal(savedA.currentJourneyId, advanced.record.currentJourneyId);
    assert.equal(savedA.stopIndex, advanced.record.stopIndex);
    assert.equal('organizationId' in savedA, false);
    assert.equal('customerName' in savedA, false);
    assert.equal('orderNumber' in savedA, false);
    assert.equal('learningMode' in savedA, false);
    assert.equal('memberId' in savedA, false);

    // Same browser, Member B must not inherit Member A's intro.
    const loadedB = loadGuide(store, memberB);
    assert.equal(loadedB.introCompleted, false);
    assert.equal(loadedB.welcomeSeen, false);
    assert.equal(store.getItem(guideStorageKey(memberB)!), null);

    const persistence = readFileSync(join(here, 'persistence.ts'), 'utf8');
    assert.doesNotMatch(persistence, /fetch\(|supabase/);
    assert.doesNotMatch(persistence, /\borganizationId\b/);
    const shell = readFileSync(join(here, '../../components/walkthrough/walkthrough-shell.tsx'), 'utf8');
    assert.doesNotMatch(shell, /WalkthroughPopover|walkthrough-popover|aria-modal/);
    assert.match(shell, /storageScopeKey/);
    const provider = readFileSync(join(here, '../../components/walkthrough/guide-provider.tsx'), 'utf8');
    assert.match(provider, /storageScopeKey/);
    const appShell = readFileSync(join(here, '../../components/shell/app-shell.tsx'), 'utf8');
    assert.match(appShell, /storageScopeKey=\{actorKey\}/);
  });

  it('isolates guide keys across authenticated members on one browser profile', () => {
    const store = memoryStore();
    const a = 'tenantX:memberA';
    const b = 'tenantX:memberB';
    saveGuide(store, { ...initialGuideRecord(), welcomeSeen: true, introCompleted: true }, a);
    saveGuide(store, { ...initialGuideRecord(), welcomeSeen: true, introSkipped: true }, b);
    assert.equal(loadGuide(store, a).introCompleted, true);
    assert.equal(loadGuide(store, a).introSkipped, false);
    assert.equal(loadGuide(store, b).introCompleted, false);
    assert.equal(loadGuide(store, b).introSkipped, true);
    assert.notEqual(guideStorageKey(a), guideStorageKey(b));
  });

  it('retires floating GuidePanel full-tour launcher in favor of Story Mode', () => {
    const panel = readFileSync(join(here, '../../components/walkthrough/guide-panel.tsx'), 'utf8');
    const shell = readFileSync(join(here, '../../components/walkthrough/walkthrough-shell.tsx'), 'utf8');
    const copy = readFileSync(join(here, 'copy.ts'), 'utf8');
    assert.doesNotMatch(panel, /Mostrar recorrido/);
    assert.doesNotMatch(panel, /fixed bottom-4 right-4/);
    assert.match(panel, /return null/);
    assert.doesNotMatch(shell, /<GuidePanel/);
    assert.doesNotMatch(copy, /show: 'Mostrar recorrido'/);
    assert.match(shell, /Story Mode/);
  });

  it('keeps shell header sticky so mobile logout stays reachable', () => {
    const shell = readFileSync(join(here, '../../components/shell/app-shell.tsx'), 'utf8');
    assert.match(shell, /sticky top-0 z-40/);
    assert.match(shell, /signOutAction/);
    assert.match(shell, /t\('account\.signOut'\)/);
  });
});

describe('first-use intro', () => {
  it('initialGuideRecord starts with intro not seen', () => {
    const record = initialGuideRecord();
    assert.equal(record.version, 2);
    assert.equal(record.welcomeSeen, false);
    assert.equal(record.introCompleted, false);
    assert.equal(record.introSkipped, false);
    assert.equal(record.introStepIndex, 0);
    assert.equal(record.learningModeEnabled, false);
    assert.deepEqual(record.pageTourSeen, {});
  });

  it('startIntro marks welcome seen and resets intro state', () => {
    const record = initialGuideRecord();
    const started = startIntro(record);
    assert.equal(started.welcomeSeen, true);
    assert.equal(started.introSkipped, false);
    assert.equal(started.introStepIndex, 0);
    assert.equal(started.panelHidden, false);
  });

  it('skipIntro marks skipped and hides panel', () => {
    const record = initialGuideRecord();
    const skipped = skipIntro(record);
    assert.equal(skipped.welcomeSeen, true);
    assert.equal(skipped.introSkipped, true);
    assert.equal(skipped.introCompleted, false);
    assert.equal(skipped.panelHidden, true);
  });

  it('advanceIntro progresses through steps and completes at end', () => {
    const TOTAL_STEPS = 7;
    let record = startIntro(initialGuideRecord());
    
    // Advance through steps
    for (let i = 1; i < TOTAL_STEPS; i++) {
      const result = advanceIntro(record, TOTAL_STEPS);
      record = result.record;
      if (i < TOTAL_STEPS - 1) {
        assert.equal(record.introStepIndex, i);
        assert.equal(record.introCompleted, false);
      }
    }
    
    // Final advance completes intro
    const final = advanceIntro(record, TOTAL_STEPS);
    assert.equal(final.record.introCompleted, true);
    assert.equal(final.record.panelHidden, true);
  });

  it('replayIntro resets intro state without wiping other progress', () => {
    let record = initialGuideRecord();
    record = startIntro(record);
    const completed = advanceIntro(advanceIntro(advanceIntro(advanceIntro(advanceIntro(advanceIntro(advanceIntro(record, 7).record, 7).record, 7).record, 7).record, 7).record, 7).record, 7).record;
    assert.equal(completed.introCompleted, true);
    
    const replayed = replayIntro(completed);
    assert.equal(replayed.welcomeSeen, true);
    assert.equal(replayed.introCompleted, false);
    assert.equal(replayed.introSkipped, false);
    assert.equal(replayed.introStepIndex, 0);
    assert.equal(replayed.panelHidden, false);
  });

  it('migrates v1 records to v2 preserving progress', () => {
    const v1Record = {
      version: 1 as const,
      currentJourneyId: 'vender',
      stopIndex: 1,
      completedJourneyIds: ['gerencia'],
      panelHidden: false,
    };
    
    const migrated = migrateV1ToV2(v1Record);
    assert.equal(migrated.version, 2);
    assert.equal(migrated.currentJourneyId, 'vender');
    assert.equal(migrated.stopIndex, 1);
    assert.deepEqual(migrated.completedJourneyIds, ['gerencia']);
    // Users with completed journeys are assumed to have seen basics
    assert.equal(migrated.welcomeSeen, true);
    assert.equal(migrated.introCompleted, true);
  });

  it('v1 to v2 migration through persistence preserves journey progress', () => {
    const memberScope = '01ORG:01MEM';
    const key = guideStorageKey(memberScope)!;
    const store = memoryStore({
      [key]: JSON.stringify({
        version: 1,
        currentJourneyId: 'produccion',
        stopIndex: 0,
        completedJourneyIds: ['vender'],
        panelHidden: true,
      }),
    });

    const loaded = loadGuide(store, memberScope);
    assert.equal(loaded.version, 2);
    assert.equal(loaded.currentJourneyId, 'produccion');
    assert.deepEqual(loaded.completedJourneyIds, ['vender']);
    assert.equal(loaded.welcomeSeen, true); // Had progress
    assert.equal(loaded.introCompleted, true);
  });
});

describe('learning mode', () => {
  it('toggleLearningMode flips the enabled state', () => {
    const record = initialGuideRecord();
    assert.equal(record.learningModeEnabled, false);
    
    const enabled = toggleLearningMode(record);
    assert.equal(enabled.learningModeEnabled, true);
    
    const disabled = toggleLearningMode(enabled);
    assert.equal(disabled.learningModeEnabled, false);
  });

  it('setLearningMode sets a specific state', () => {
    const record = initialGuideRecord();
    
    const enabled = setLearningMode(record, true);
    assert.equal(enabled.learningModeEnabled, true);
    
    const stillEnabled = setLearningMode(enabled, true);
    assert.equal(stillEnabled.learningModeEnabled, true);
    
    const disabled = setLearningMode(stillEnabled, false);
    assert.equal(disabled.learningModeEnabled, false);
  });

  it('learning mode copy is jargon-free', () => {
    const copy = [
      LEARNING_MODE_COPY.label,
      LEARNING_MODE_COPY.description,
      LEARNING_MODE_COPY.secondary,
    ].join(' ');
    
    assert.doesNotMatch(copy, /Gate\s+[A-Z]|finance\.operational|scope|auth|provider/i);
    assert.match(copy, /aprendizaje/i);
  });
});

describe('page micro-tours', () => {
  it('markPageTourSeen records the page as seen', () => {
    const record = initialGuideRecord();
    assert.equal(hasSeenPageTour(record, 'produccion'), false);
    
    const marked = markPageTourSeen(record, 'produccion');
    assert.equal(hasSeenPageTour(marked, 'produccion'), true);
    assert.equal(hasSeenPageTour(marked, 'almacen'), false);
  });

  it('getMicroTourForPage returns the tour for known pages', () => {
    const produccion = getMicroTourForPage('produccion');
    assert.ok(produccion);
    assert.equal(produccion.pageId, 'produccion');
    assert.ok(produccion.steps.length >= 2);
    
    const unknown = getMicroTourForPage('nonexistent-page');
    assert.equal(unknown, null);
  });

  it('canViewMicroTour respects role keys', () => {
    const produccion = getMicroTourForPage('produccion');
    assert.ok(produccion);
    
    // org.admin can always view
    assert.equal(canViewMicroTour(produccion, ['org.admin']), true);
    
    // operations can view produccion
    assert.equal(canViewMicroTour(produccion, ['operations']), true);
    
    // finance.admin cannot view produccion
    assert.equal(canViewMicroTour(produccion, ['finance.admin']), false);
    
    // productos has no role restriction
    const productos = getMicroTourForPage('productos');
    assert.ok(productos);
    assert.equal(canViewMicroTour(productos, ['any_role']), true);
  });

  it('micro-tour copy is jargon-free and user-friendly', () => {
    const allCopy: string[] = [];
    for (const tour of PAGE_MICRO_TOURS) {
      for (const step of tour.steps) {
        if (step.title) allCopy.push(step.title);
        allCopy.push(step.body);
      }
    }
    const combined = allCopy.join('\n');
    
    assert.doesNotMatch(combined, /Gate\s+[A-Z]|finance\.operational|scope\b|auth\b/i);
    assert.doesNotMatch(combined, /organizationId|organization_id|x-os-organization-id/);
    assert.doesNotMatch(combined, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe('first-use intro copy', () => {
  it('welcome copy is jargon-free', () => {
    const copy = [
      INTRO_COPY.welcome.title,
      INTRO_COPY.welcome.body,
      INTRO_COPY.welcome.secondary,
      INTRO_COPY.welcome.primary,
      INTRO_COPY.welcome.skip,
      INTRO_COPY.welcome.footer,
    ].join(' ');
    
    assert.doesNotMatch(copy, /Gate\s+[A-Z]|finance\.operational|scope|provider|authority/i);
    assert.match(copy, /Bienvenido/);
    assert.match(copy, /ISALWA/);
  });

  it('step copy does not hardcode counts or customer names', () => {
    const allStepCopy = [
      INTRO_COPY.inicio.title,
      INTRO_COPY.inicio.body,
      INTRO_COPY.inicio.secondary,
      INTRO_COPY.clientes.title,
      INTRO_COPY.clientes.body,
      INTRO_COPY.cliente360.title,
      INTRO_COPY.cliente360.body,
      INTRO_COPY.cliente360.secondary,
      INTRO_COPY.nextAction.body,
      INTRO_COPY.nextAction.noAction,
      INTRO_COPY.mapa.title,
      INTRO_COPY.mapa.bodyFallback,
      INTRO_COPY.mapa.secondary,
      INTRO_COPY.mapa.providerBlocked.title,
      INTRO_COPY.mapa.providerBlocked.body,
      INTRO_COPY.ayuda.title,
      INTRO_COPY.ayuda.body,
      INTRO_COPY.ayuda.final,
      INTRO_COPY.ayuda.finalSecondary,
      ...INTRO_COPY.ayuda.affordances,
    ].join(' ');
    
    // No hardcoded counts like "2/7"
    assert.doesNotMatch(allStepCopy, /\d+\s*\/\s*\d+/);
    assert.doesNotMatch(allStepCopy, /2 de 7|7 de 7/);
    
    // No customer names
    assert.doesNotMatch(allStepCopy, /ALVAREZ|García|Pérez|Ana |Juan |María/i);
    
    // No jargon
    assert.doesNotMatch(allStepCopy, /Gate\s+[A-Z]|finance\.operational|scope\b/i);
  });

  it('cliente360 empty section copy only shows when sections are empty', () => {
    // These strings exist but should only be shown conditionally
    assert.ok(INTRO_COPY.cliente360.emptySections.opportunities);
    assert.ok(INTRO_COPY.cliente360.emptySections.quotes);
    assert.ok(INTRO_COPY.cliente360.emptySections.orders);
    assert.ok(INTRO_COPY.cliente360.emptySections.work);
    
    // All start with "Todavía no hay"
    assert.match(INTRO_COPY.cliente360.emptySections.opportunities, /Todavía no hay/);
    assert.match(INTRO_COPY.cliente360.emptySections.quotes, /Todavía no hay/);
    assert.match(INTRO_COPY.cliente360.emptySections.orders, /Todavía no hay/);
    assert.match(INTRO_COPY.cliente360.emptySections.work, /Todavía no hay/);
  });

  it('mapa dynamic body template works correctly', () => {
    const body = INTRO_COPY.mapa.bodyTemplate(3, 10);
    assert.match(body, /3 de 10/);
    assert.match(body, /coordenadas/);
  });
});

describe('intro coach mobile behavior', () => {
  it('intro coach component has proper mobile constraints', () => {
    const coach = readFileSync(join(here, '../../components/walkthrough/intro-coach.tsx'), 'utf8');
    
    // Max height constraint to preserve product content
    assert.match(coach, /max-h-\[min\(50vh/);
    
    // Collapse button for mobile
    assert.match(coach, /Minimizar/);
    
    // z-index below header
    assert.match(coach, /z-30/);
    
    // Bottom positioning
    assert.match(coach, /fixed bottom-0/);
  });

  it('intro welcome is not modal-trapping', () => {
    const welcome = readFileSync(join(here, '../../components/walkthrough/intro-welcome.tsx'), 'utf8');
    
    // aria-modal is false (not trapping)
    assert.match(welcome, /aria-modal="false"/);
    
    // Escape dismisses
    assert.match(welcome, /Escape/);
    assert.match(welcome, /skipIntro/);
  });
});

describe('no oportunidades/cotizaciones/pedidos in first-use', () => {
  it('intro copy does not mention creating oportunidades, cotizaciones, or pedidos', () => {
    const introCopy = [
      INTRO_COPY.welcome.body,
      INTRO_COPY.welcome.secondary,
      INTRO_COPY.inicio.body,
      INTRO_COPY.inicio.secondary,
      INTRO_COPY.clientes.body,
      INTRO_COPY.cliente360.body,
      INTRO_COPY.cliente360.secondary,
      INTRO_COPY.nextAction.body,
      INTRO_COPY.mapa.bodyFallback,
      INTRO_COPY.mapa.secondary,
      INTRO_COPY.ayuda.body,
    ].join(' ');
    
    // Should not teach how to create commercial entities
    assert.doesNotMatch(introCopy, /crear.*oportunidad|nueva oportunidad|agregar.*oportunidad/i);
    assert.doesNotMatch(introCopy, /crear.*cotización|nueva cotización|agregar.*cotización/i);
    assert.doesNotMatch(introCopy, /crear.*pedido|nuevo pedido|agregar.*pedido/i);
  });
});
