import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { FALLBACK_WELCOME, SHELL_CONTROLS } from './copy';
import { captureFocus, handleTourEscape, restoreFocus } from './focus';
import { chapterForPathname, emptyChapterRun, flattenChapters, shouldOfferFirstVisit, startRun } from './plan';
import { loadWalkthrough, parseWalkthroughRecord, saveWalkthrough, shouldOpenTourOnLoad } from './persistence';
import { getChapters, getWelcome, registerChapter, registerWelcome, resetWalkthroughRegistryForTests } from './registry';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import { TOUR_TARGET, TOUR_TARGET_IDS } from './targets';
import {
  canOfferTour,
  hasBlockingDialog,
  hasVisibleBox,
  placeTourCard,
  prefersReducedMotion,
  scrollBehavior,
  skipMissingTarget,
} from './targeting';
import type { TourChapter, TourStep, WalkthroughRecord } from './types';

const REQUIRED_CONTROLS = [
  'Comenzar recorrido',
  'Explorar por mi cuenta',
  'Cerrar recorrido',
  'Continuar después',
  'Volver a Inicio',
  'Anterior',
  'Siguiente',
  'Volver a hacer el recorrido',
  'Ver recorrido de esta página',
] as const;

function step(partial: Partial<TourStep> & Pick<TourStep, 'stepId'>): TourStep {
  return {
    title: partial.stepId,
    body: 'Paso.',
    stateLabel: 'disponible',
    ...partial,
  };
}

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem(key: string) {
      return data[key] ?? null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

describe('walkthrough state machine', () => {
  it('starts at NOT_STARTED and resumes only a saved in-progress step', () => {
    const initial = initialWalkthroughRecord();
    assert.equal(initial.runState, 'NOT_STARTED');
    assert.equal(shouldOpenTourOnLoad(initial), false);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'IN_PROGRESS' }), false);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'COMPLETED' }), false);
    assert.equal(shouldOpenTourOnLoad({ ...initial, runState: 'DISMISSED' }), false);
    assert.equal(
      shouldOpenTourOnLoad({
        ...initial,
        runState: 'IN_PROGRESS',
        chapterId: 'clientes',
        scopeChapterId: 'clientes',
        stepId: 'customer-filters',
      }),
      true,
    );
  });

  it('moves through start, pause, complete, dismiss, and replay without losing the contract', () => {
    const started = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'START',
      chapterId: 'customer',
      stepId: 'row',
      scopeChapterId: null,
    });
    assert.equal(started.runState, 'IN_PROGRESS');
    assert.equal(started.stepId, 'row');

    const paused = reduceWalkthrough(started, { type: 'PAUSE' });
    assert.equal(paused.runState, 'IN_PROGRESS');
    assert.equal(paused.stepId, 'row');

    const closed = reduceWalkthrough(paused, { type: 'CLOSE' });
    assert.equal(closed.runState, 'IN_PROGRESS');

    const completed = reduceWalkthrough(closed, { type: 'COMPLETE', chapterId: 'customer' });
    assert.equal(completed.runState, 'COMPLETED');
    assert.equal(completed.stepId, null);
    assert.deepEqual(completed.completedChapterIds, ['customer']);

    const dismissed = reduceWalkthrough(initialWalkthroughRecord(), { type: 'DISMISS' });
    assert.equal(dismissed.runState, 'DISMISSED');
    assert.equal(dismissed.learningMode, true);

    const replayed = reduceWalkthrough(completed, {
      type: 'REPLAY',
      chapterId: 'customer',
      stepId: 'row',
      scopeChapterId: 'customer',
    });
    assert.equal(replayed.runState, 'IN_PROGRESS');
    assert.equal(replayed.scopeChapterId, 'customer');
  });

  it('persists progress for this browser so a refresh keeps the step and can resume', () => {
    const store = memoryStore();
    const inProgress = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'START',
      chapterId: 'global',
      stepId: 'home',
      scopeChapterId: null,
    });
    saveWalkthrough(store, inProgress);
    const reloaded = loadWalkthrough(store);
    assert.equal(reloaded.runState, 'IN_PROGRESS');
    assert.equal(reloaded.stepId, 'home');
    assert.equal(shouldOpenTourOnLoad(reloaded), true);
    assert.deepEqual(parseWalkthroughRecord('not-json'), initialWalkthroughRecord());
    assert.equal(parseWalkthroughRecord('{"version":1,"runState":"COMPLETED"}').runState, 'COMPLETED');
  });

  it('offers a first visit only when it will not stack or repeat a dismissal', () => {
    const chapters: TourChapter[] = [
      {
        chapterId: 'customer',
        title: 'Clientes',
        routePrefix: '/clientes',
        steps: [step({ stepId: 'row', target: 'customer-row' })],
      },
    ];
    const open = {
      record: initialWalkthroughRecord(),
      pathname: '/clientes',
      chapters,
      surfaceOpen: false,
      blockingDialog: false,
    };
    assert.equal(shouldOfferFirstVisit(open), true);
    assert.equal(shouldOfferFirstVisit({ ...open, surfaceOpen: true }), false);
    assert.equal(shouldOfferFirstVisit({ ...open, blockingDialog: true }), false);
    assert.equal(
      shouldOfferFirstVisit({
        ...open,
        record: reduceWalkthrough(initialWalkthroughRecord(), { type: 'DISMISS_PAGE', pageKey: 'clientes' }),
      }),
      false,
    );
    assert.equal(
      shouldOfferFirstVisit({
        ...open,
        record: reduceWalkthrough(initialWalkthroughRecord(), { type: 'MARK_PAGE_OFFERED', pageKey: 'clientes' }),
      }),
      false,
    );
    assert.equal(
      shouldOfferFirstVisit({
        ...open,
        pathname: '/inicio',
        chapters: [],
      }),
      true,
    );
    assert.equal(shouldOfferFirstVisit({ ...open, pathname: '/ayuda', chapters: [] }), false);
  });
});

describe('skip missing target', () => {
  const steps = [
    step({ stepId: 'gone', target: 'missing' }),
    step({ stepId: 'shown', target: 'present' }),
    step({ stepId: 'also-gone', target: 'absent' }),
    step({ stepId: 'untargeted' }),
  ];

  it('skips missing targets and keeps an untargeted step', () => {
    const present = new Set(['present']);
    const first = skipMissingTarget(steps, 0, 1, (target) => present.has(target));
    assert.equal(first, 1);
    const after = skipMissingTarget(steps, 2, 1, (target) => present.has(target));
    assert.equal(after, 3);
    assert.equal(skipMissingTarget(steps, 2, 1, () => false), 3);
    assert.equal(skipMissingTarget(steps, 0, 1, () => false), 3);
  });

  it('returns null when every remaining targeted step is missing', () => {
    const targeted = steps.filter((item) => item.target);
    assert.equal(skipMissingTarget(targeted, 0, 1, () => false), null);
    assert.equal(skipMissingTarget([], 0, 1, () => true), null);
  });

  it('treats a zero box as absent and a blocking dialog as a reason not to stack', () => {
    assert.equal(hasVisibleBox({ width: 0, height: 20 }), false);
    assert.equal(hasVisibleBox({ width: 12, height: 12 }, true), false);
    assert.equal(hasVisibleBox({ width: 12, height: 12 }), true);
    assert.equal(hasBlockingDialog({ querySelector: () => ({}) }), true);
    assert.equal(hasBlockingDialog({ querySelector: () => null }), false);
    assert.equal(canOfferTour({ surfaceOpen: true, blockingDialog: false }), false);
    assert.equal(canOfferTour({ surfaceOpen: false, blockingDialog: true }), false);
    assert.equal(canOfferTour({ surfaceOpen: false, blockingDialog: false }), true);
  });
});

describe('Escape and focus', () => {
  it('closes on Escape and returns focus', () => {
    const calls: string[] = [];
    const opener = { focus: () => calls.push('focus') };
    const result = handleTourEscape(
      { key: 'Escape' },
      { surface: 'step', opener },
    );
    assert.equal(result.handled, true);
    assert.equal(result.session.surface, 'closed');
    assert.equal(result.session.opener, null);
    assert.deepEqual(calls, ['focus']);
  });

  it('does not trap when there is no opener or the key is not Escape', () => {
    const closed = handleTourEscape({ key: 'Escape' }, { surface: 'closed', opener: null });
    assert.equal(closed.handled, false);
    const missing = handleTourEscape({ key: 'Escape' }, { surface: 'welcome', opener: null });
    assert.equal(missing.handled, true);
    assert.equal(missing.session.surface, 'closed');
    const other = handleTourEscape({ key: 'Tab' }, { surface: 'step', opener: { focus() {} } });
    assert.equal(other.handled, false);
    assert.equal(other.session.surface, 'step');
  });

  it('still closes if restoring focus throws', () => {
    const opener = {
      focus() {
        throw new Error('detached');
      },
    };
    const result = handleTourEscape({ key: 'Escape' }, { surface: 'page-offer', opener });
    assert.equal(result.handled, true);
    assert.equal(result.session.surface, 'closed');
    assert.doesNotThrow(() => restoreFocus(opener));
    assert.equal(typeof captureFocus({ focus() {} })?.focus, 'function');
    assert.equal(captureFocus(null), null);
    assert.equal(captureFocus({}), null);
  });
});

describe('empty chapters', () => {
  it('does not crash and uses the local welcome', () => {
    resetWalkthroughRegistryForTests();
    const result = emptyChapterRun();
    assert.equal(result.chapters, 0);
    assert.equal(result.runState, 'COMPLETED');
    assert.equal(result.welcome.title, 'Bienvenido a ISALWA');
    assert.equal(result.welcome.kicker, 'Primer paso');
    assert.equal(result.welcome.body, FALLBACK_WELCOME.body);
    assert.equal(getWelcome().title, FALLBACK_WELCOME.title);
    assert.deepEqual(flattenChapters([]), []);
    assert.equal(startRun(initialWalkthroughRecord(), [], null).runState, 'COMPLETED');
    assert.equal(chapterForPathname([], '/clientes'), null);
  });

  it('accepts a later chapter without requiring copy in this lane', () => {
    resetWalkthroughRegistryForTests();
    assert.equal(registerChapter({ nope: true }), false);
    assert.equal(
      registerChapter({
        chapterId: 'customer',
        title: 'Clientes',
        steps: [step({ stepId: 'row', target: 'customer-row', stateLabel: 'manual' })],
      }),
      true,
    );
    assert.equal(registerWelcome({ title: 'Hola', body: 'Cuerpo' }), true);
    assert.equal(getChapters().length, 1);
    assert.equal(getWelcome().title, 'Hola');
    const record: WalkthroughRecord = startRun(initialWalkthroughRecord(), flattenChapters(getChapters()), null);
    assert.equal(record.runState, 'IN_PROGRESS');
    assert.equal(record.stepId, 'row');
    resetWalkthroughRegistryForTests();
  });
});

describe('shell contract', () => {
  it('keeps the required controls and reduced-motion placement', () => {
    for (const label of REQUIRED_CONTROLS) {
      assert.equal(Object.values(SHELL_CONTROLS).includes(label), true);
    }
    assert.equal(SHELL_CONTROLS.pageOfferTitle, '¿Primera vez aquí?');
    assert.equal(SHELL_CONTROLS.viewTour, 'Ver recorrido');
    assert.equal(SHELL_CONTROLS.notNow, 'Ahora no');
    assert.equal(prefersReducedMotion((query) => query.includes('reduce')), true);
    assert.equal(scrollBehavior(true), 'auto');
    assert.equal(scrollBehavior(false), 'smooth');
    const sheet = placeTourCard({
      target: { top: 10, bottom: 40, left: 10, width: 80 },
      viewport: { width: 390, height: 700 },
      cardWidth: 320,
      cardHeight: 220,
    });
    assert.equal(sheet.mode, 'sheet');
    const missing = placeTourCard({
      target: null,
      viewport: { width: 1200, height: 800 },
      cardWidth: 320,
      cardHeight: 220,
    });
    assert.equal(missing.mode, 'center');
  });

  it('places every data-tour id on an existing surface', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const files = collectSources(root).filter((file) => file.endsWith('.tsx'));
    const used = new Set<string>();
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const [key, id] of Object.entries(TOUR_TARGET)) {
        if (source.includes(`TOUR_TARGET.${key}`) || source.includes(`data-tour="${id}"`)) used.add(id);
      }
    }
    for (const id of TOUR_TARGET_IDS) {
      assert.equal(used.has(id), true, `missing data-tour ${id}`);
    }
  });
});

function collectSources(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) found.push(...collectSources(path));
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) found.push(path);
  }
  return found;
}
