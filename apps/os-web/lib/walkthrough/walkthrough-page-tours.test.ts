import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  chapterForPathname,
  chapterRunState,
  flattenChapters,
  nextIndexSkippingMissing,
  replayableChapters,
  shouldOfferFirstVisit,
  startRun,
  type PlannedStep,
} from './plan';
import { loadWalkthroughContent } from './content';
import { startListedChapter } from './learning-replay';
import { WALKTHROUGH_STORAGE_KEY, loadWalkthrough, parseWalkthroughRecord, saveWalkthrough } from './persistence';
import { getChapters, resetWalkthroughRegistryForTests } from './registry';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import type { TourChapter, WalkthroughRecord } from './types';

/**
 * Page-tour contract for the merged runner.
 * Each page chapter is independent. Completing or dismissing one chapter
 * does not complete, dismiss, or suppress the others.
 * learning-replay.ts is the Ayuda replay module. Chapter bodies stay in the
 * chapter files; chrome strings live on the help panel.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const OS_WEB = join(HERE, '../..');
const APP_DIR = join(OS_WEB, 'app');
const PROVIDER = join(OS_WEB, 'components/walkthrough/walkthrough-provider.tsx');
const HELP_PANEL = join(OS_WEB, 'components/walkthrough/walkthrough-help-panel.tsx');
const FAKE_PARTY_ID = 'pty_example';

const LEARNING_CHROME = {
  label: 'Modo aprendizaje',
  extra: 'Act\u00edvalo si quieres ver explicaciones extra mientras trabajas.',
  off: 'Puedes apagarlo cuando ya te sientas c\u00f3modo.',
} as const;

let registered: readonly TourChapter[] | undefined;

function registeredChapters(): readonly TourChapter[] {
  if (!registered) {
    resetWalkthroughRegistryForTests();
    loadWalkthroughContent();
    registered = getChapters();
  }
  return registered;
}

function providerSource(): string {
  return readFileSync(PROVIDER, 'utf8');
}

function helpPanelSource(): string {
  return readFileSync(HELP_PANEL, 'utf8');
}

function callbackBody(source: string, name: string): string {
  const start = source.indexOf(`const ${name} = useCallback`);
  assert.ok(start >= 0, `${name} callback is missing from the runner`);
  const rest = source.slice(start + name.length);
  const next = rest.search(/\n  const [A-Za-z]/);
  return next === -1 ? source.slice(start) : source.slice(start, start + name.length + next);
}

function pageRoutes(appDir: string): string[] {
  const routes: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next') continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (entry !== 'page.tsx') continue;
      const rel = relative(appDir, dirname(path));
      const segments = rel.split('/').filter((part) => part.length > 0 && !part.startsWith('('));
      routes.push(segments.length === 0 ? '/' : `/${segments.join('/')}`);
    }
  };
  walk(appDir);
  return routes;
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

function offer(pathname: string, record: WalkthroughRecord = initialWalkthroughRecord(), access?: readonly string[]) {
  return {
    record,
    pathname,
    chapters: registeredChapters(),
    surfaceOpen: false,
    blockingDialog: false,
    ...(access ? { access } : {}),
  };
}

function chapterIdFor(pathname: string): string | null {
  return chapterForPathname(registeredChapters(), pathname)?.chapterId ?? null;
}

describe('page chapters stay independent', () => {
  it('completing global does not complete clientes or cotizaciones', () => {
    const completed = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'COMPLETE',
      chapterId: 'global',
    });
    assert.equal(chapterRunState(completed, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(completed, 'clientes'), 'NOT_STARTED');
    assert.equal(chapterRunState(completed, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(completed, 'clientes'), 'COMPLETED');
    assert.notEqual(chapterRunState(completed, 'cotizaciones'), 'COMPLETED');
  });

  it('keeps chapterRunState independent per chapter', () => {
    const completedGlobal = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'COMPLETE',
      chapterId: 'global',
    });
    const clientesInProgress = reduceWalkthrough(completedGlobal, {
      type: 'START',
      chapterId: 'clientes',
      stepId: 'list',
      scopeChapterId: 'clientes',
    });
    assert.equal(chapterRunState(clientesInProgress, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(clientesInProgress, 'clientes'), 'IN_PROGRESS');
    assert.equal(chapterRunState(clientesInProgress, 'cotizaciones'), 'NOT_STARTED');
    assert.equal(chapterRunState(clientesInProgress, 'trabajo'), 'NOT_STARTED');

    const dismissedClientes = reduceWalkthrough(clientesInProgress, {
      type: 'DISMISS',
      chapterId: 'clientes',
    });
    assert.equal(chapterRunState(dismissedClientes, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(dismissedClientes, 'clientes'), 'DISMISSED');
    assert.equal(chapterRunState(dismissedClientes, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(dismissedClientes, 'global'), 'DISMISSED');
    assert.notEqual(chapterRunState(dismissedClientes, 'cotizaciones'), 'DISMISSED');
  });

  it('still offers a page after global dismiss and when learning mode is off', () => {
    const dismissed = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'DISMISS',
      chapterId: 'global',
    });
    assert.equal(dismissed.learningMode, false);
    assert.equal(chapterRunState(dismissed, 'global'), 'DISMISSED');
    assert.equal(
      shouldOfferFirstVisit(offer('/clientes', dismissed)),
      true,
      'a dismissed global run must not suppress the clientes offer',
    );
    assert.equal(
      shouldOfferFirstVisit(offer('/cotizaciones', dismissed)),
      true,
      'a dismissed global run must not suppress the cotizaciones offer',
    );

    const learningOff = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'SET_LEARNING_MODE',
      enabled: false,
    });
    assert.equal(learningOff.runState, 'NOT_STARTED');
    assert.equal(learningOff.learningMode, false);
    assert.equal(shouldOfferFirstVisit(offer('/clientes', learningOff)), true);
    assert.equal(shouldOfferFirstVisit(offer('/trabajo', learningOff)), true);
    assert.equal(shouldOfferFirstVisit(offer('/ayuda', learningOff)), false);
  });

  it('does not offer a page chapter that itself is completed or dismissed', () => {
    const completedClientes = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'COMPLETE',
      chapterId: 'clientes',
    });
    assert.equal(shouldOfferFirstVisit(offer('/clientes', completedClientes)), false);
    assert.equal(shouldOfferFirstVisit(offer('/cotizaciones', completedClientes)), true);

    const dismissedCotizaciones = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'DISMISS',
      chapterId: 'cotizaciones',
    });
    assert.equal(shouldOfferFirstVisit(offer('/cotizaciones', dismissedCotizaciones)), false);
    assert.equal(shouldOfferFirstVisit(offer('/clientes', dismissedCotizaciones)), true);
  });
});

describe('canonical page chapters', () => {
  it('resolves each real page to its own chapter id', () => {
    const expected: Record<string, string> = {
      '/clientes': 'clientes',
      [`/clientes/${FAKE_PARTY_ID}`]: 'cliente-360',
      '/oportunidades': 'oportunidades',
      '/cotizaciones': 'cotizaciones',
      '/trabajo': 'trabajo',
      '/aprobaciones': 'aprobaciones',
      '/administracion/equipo': 'equipo',
      '/mapa': 'mapa',
      '/mensajes': 'mensajes',
    };
    const mismatches = Object.entries(expected).flatMap(([pathname, chapterId]) => {
      const actual = chapterIdFor(pathname);
      return actual === chapterId ? [] : [`${pathname} => ${actual ?? 'null'}, expected ${chapterId}`];
    });
    assert.deepEqual(mismatches, []);
    assert.equal(chapterIdFor('/clientes'), 'clientes');
    assert.notEqual(chapterIdFor('/clientes'), 'customer');
    assert.equal(chapterIdFor(`/clientes/${FAKE_PARTY_ID}`), 'cliente-360');
    assert.notEqual(chapterIdFor('/clientes'), chapterIdFor(`/clientes/${FAKE_PARTY_ID}`));
    assert.equal(chapterIdFor('/mapa'), 'mapa');
    assert.notEqual(chapterIdFor('/mapa'), 'map-truth');
    assert.equal(chapterIdFor('/mensajes'), 'mensajes');
    assert.notEqual(chapterIdFor('/mensajes'), 'whatsapp-ai');
  });

  it('does not invent a pedidos page or a pedidos chapter', () => {
    const routes = pageRoutes(APP_DIR);
    const chapterIds = registeredChapters().map((chapter) => chapter.chapterId);
    assert.equal(routes.includes('/pedidos'), false);
    assert.equal(existsSync(join(APP_DIR, '(app)/pedidos/page.tsx')), false);
    assert.equal(chapterIds.includes('pedidos'), false);
    assert.equal(
      replayableChapters(registeredChapters()).some((chapter) => chapter.chapterId === 'pedidos'),
      false,
    );
    assert.notEqual(chapterIdFor('/pedidos'), 'pedidos');
    assert.equal(chapterIdFor('/pedidos'), null);
  });

  it('does not treat the administracion hub as a tour chapter', () => {
    const chapterIds = registeredChapters().map((chapter) => chapter.chapterId);
    assert.equal(chapterIds.includes('administracion'), false);
    assert.equal(chapterIdFor('/administracion'), null);
    assert.notEqual(chapterIdFor('/administracion'), 'administracion');
    assert.equal(chapterIdFor('/administracion/equipo'), 'equipo');
    assert.equal(
      replayableChapters(registeredChapters()).some((chapter) => chapter.chapterId === 'administracion'),
      false,
    );
  });
});

describe('one chapter at a time', () => {
  it('does not flatten every chapter into one null-scope sequence from welcome or replay', () => {
    const source = providerSource();
    const start = callbackBody(source, 'startFromWelcome');
    const replayAll = callbackBody(source, 'replay');
    const home = callbackBody(source, 'goHome');
    const startChapter = callbackBody(source, 'startChapter');

    assert.match(start, /stepsForChapter\(\s*'global'\s*\)/);
    assert.match(start, /begin\(\s*steps\s*,\s*'global'\s*\)/);
    assert.doesNotMatch(start, /flattenChapters\(\s*getChapters\(\)\s*\)/);
    assert.doesNotMatch(start, /begin\([\s\S]*null\s*\)/);

    assert.match(replayAll, /startChapter\(\s*'global'\s*\)/);
    assert.doesNotMatch(replayAll, /flattenChapters\(\s*getChapters\(\)\s*\)/);
    assert.doesNotMatch(replayAll, /begin\(\s*flattenChapters/);
    assert.doesNotMatch(replayAll, /scopeChapterId:\s*null/);

    assert.match(home, /stepsForChapter\(\s*'global'\s*\)/);
    assert.match(home, /scopeChapterId:\s*'global'/);
    assert.doesNotMatch(home, /flattenChapters\(\s*getChapters\(\)\s*\)/);
    assert.doesNotMatch(home, /scopeChapterId:\s*null/);

    assert.match(startChapter, /stepsForChapter\(\s*chapterId\s*\)/);
    assert.match(startChapter, /begin\(\s*steps\s*,\s*chapterId\s*\)/);
    assert.doesNotMatch(startChapter, /flattenChapters\(\s*getChapters\(\)\s*\)/);

    const global = registeredChapters().find((chapter) => chapter.chapterId === 'global');
    assert.ok(global);
    const globalSteps = flattenChapters([global]);
    const everyStep = flattenChapters(registeredChapters());
    assert.ok(globalSteps.length > 0);
    assert.ok(globalSteps.length < everyStep.length);
    assert.ok(globalSteps.every((step) => step.chapterId === 'global'));
    const started = startRun(initialWalkthroughRecord(), globalSteps, 'global');
    assert.equal(started.scopeChapterId, 'global');
    assert.notEqual(started.scopeChapterId, null);
    assert.equal(started.chapterId, 'global');
    assert.equal(started.runState, 'IN_PROGRESS');
  });

  it('starts an Ayuda replay of only the selected chapter', () => {
    const selectedId = 'cotizaciones';
    const selected = registeredChapters().find((chapter) => chapter.chapterId === selectedId);
    assert.ok(selected, `${selectedId} must be its own chapter`);
    const selectedSteps = flattenChapters([selected]);
    const everyStep = flattenChapters(registeredChapters());
    assert.ok(selectedSteps.length > 0);
    assert.ok(selectedSteps.length < everyStep.length);
    assert.ok(selectedSteps.every((step) => step.chapterId === selectedId));

    const started = startRun(initialWalkthroughRecord(), selectedSteps, selectedId);
    assert.equal(started.chapterId, selectedId);
    assert.equal(started.scopeChapterId, selectedId);
    assert.notEqual(started.scopeChapterId, null);
    assert.equal(started.runState, 'IN_PROGRESS');
    assert.equal(chapterRunState(started, selectedId), 'IN_PROGRESS');
    assert.equal(chapterRunState(started, 'global'), 'NOT_STARTED');
    assert.equal(chapterRunState(started, 'clientes'), 'NOT_STARTED');

    const calls: string[] = [];
    startListedChapter(
      {
        startChapter(chapterId) {
          calls.push(chapterId);
        },
        replay() {
          calls.push('all');
        },
        startPageTour() {
          calls.push('page');
        },
        pageChapter: null,
      },
      selectedId,
      '/ayuda',
    );
    assert.deepEqual(calls, [selectedId]);

    const panel = helpPanelSource();
    assert.match(panel, /from '@\/lib\/walkthrough\/learning-replay'/);
    assert.match(panel, /startListedChapter\(\s*actions\s*,\s*chapter\.chapterId/);
    const startChapter = callbackBody(providerSource(), 'startChapter');
    assert.match(startChapter, /stepsForChapter\(\s*chapterId\s*\)/);
    assert.doesNotMatch(startChapter, /flattenChapters\(\s*getChapters\(\)\s*\)/);
  });
});

describe('missing optional targets and role visibility', () => {
  it('skips a missing optional target and does not abort the chapter', () => {
    const steps: PlannedStep[] = [
      {
        chapterId: 'clientes',
        stepId: 'optional-missing',
        target: 'missing-optional',
        title: 'optional',
        body: 'optional',
        stateLabel: 'disponible',
      },
      {
        chapterId: 'clientes',
        stepId: 'shown',
        target: 'present',
        title: 'shown',
        body: 'shown',
        stateLabel: 'disponible',
      },
    ];
    const record = initialWalkthroughRecord();
    const next = nextIndexSkippingMissing(steps, 0, (target) => target === 'present');
    assert.equal(next, 1);
    assert.notEqual(next, null);
    assert.equal(steps[next ?? -1]?.chapterId, 'clientes');
    assert.equal(steps[next ?? -1]?.stepId, 'shown');
    assert.deepEqual(record, initialWalkthroughRecord());

    const skipMissing = providerSource().slice(providerSource().indexOf('const skipMissing = () =>'));
    const skipBody = skipMissing.slice(0, skipMissing.indexOf('const reveal = () =>'));
    assert.match(skipBody, /nextIndexSkippingMissing/);
    assert.match(skipBody, /setAnchor\(\s*'untargeted'\s*\)/);
    assert.doesNotMatch(skipBody, /finish\(/);
    assert.doesNotMatch(skipBody, /type:\s*'COMPLETE'/);
    assert.doesNotMatch(skipBody, /type:\s*'DISMISS'/);
  });

  it('does not offer or list a chapter whose roleVisibility excludes the caller', () => {
    const open: TourChapter = {
      chapterId: 'clientes',
      title: 'clientes',
      routePrefix: '/clientes',
      steps: [
        {
          stepId: 'list',
          title: 'list',
          body: 'list',
          stateLabel: 'disponible',
        },
      ],
    };
    const restricted: TourChapter = {
      chapterId: 'equipo',
      title: 'equipo',
      routePrefix: '/administracion/equipo',
      roleVisibility: ['people.admin'],
      steps: [
        {
          stepId: 'team',
          title: 'team',
          body: 'team',
          stateLabel: 'disponible',
        },
      ],
    };
    const excluded = {
      record: initialWalkthroughRecord(),
      pathname: '/administracion/equipo',
      chapters: [restricted],
      surfaceOpen: false,
      blockingDialog: false,
      access: [] as readonly string[],
    };
    assert.equal(shouldOfferFirstVisit(excluded), false);
    assert.equal(
      shouldOfferFirstVisit({
        record: initialWalkthroughRecord(),
        pathname: '/clientes',
        chapters: [open],
        surfaceOpen: false,
        blockingDialog: false,
        access: [],
      }),
      true,
    );
    assert.equal(
      shouldOfferFirstVisit({
        ...excluded,
        access: ['people.admin'],
      }),
      true,
    );

    const hidden = replayableChapters([open, restricted], []);
    assert.equal(hidden.some((chapter) => chapter.chapterId === 'equipo'), false);
    assert.equal(hidden.some((chapter) => chapter.chapterId === 'clientes'), true);
    const visible = replayableChapters([open, restricted], ['people.admin']);
    assert.equal(visible.some((chapter) => chapter.chapterId === 'equipo'), true);
  });
});

describe('learning-replay chrome', () => {
  it('consumes learning-replay and keeps the learning-mode chrome strings', () => {
    const panel = helpPanelSource();
    assert.match(panel, /from '@\/lib\/walkthrough\/learning-replay'/);
    assert.match(panel, /startListedChapter/);
    assert.match(panel, /resolveReplayableChapters/);
    assert.equal(panel.includes(LEARNING_CHROME.label), true);
    assert.equal(panel.includes(LEARNING_CHROME.extra), true);
    assert.equal(panel.includes(LEARNING_CHROME.off), true);
    assert.equal(typeof startListedChapter, 'function');
  });
});

describe('walkthrough persistence', () => {
  it('round-trips version 2 per-chapter state', () => {
    const completedGlobal = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'COMPLETE',
      chapterId: 'global',
    });
    const clientesStarted = reduceWalkthrough(completedGlobal, {
      type: 'START',
      chapterId: 'clientes',
      stepId: 'list',
      scopeChapterId: 'clientes',
    });
    const store = memoryStore();
    saveWalkthrough(store, clientesStarted);
    const saved = JSON.parse(store.data[WALKTHROUGH_STORAGE_KEY] ?? 'null') as {
      version?: number;
      chapterStates?: Record<string, string>;
    };
    assert.equal(saved.version, 2);
    assert.equal(saved.chapterStates?.global, 'COMPLETED');
    assert.equal(saved.chapterStates?.clientes, 'IN_PROGRESS');
    assert.equal(saved.chapterStates?.cotizaciones, undefined);

    const loaded = loadWalkthrough(store);
    assert.equal(loaded.version, 2);
    assert.equal(chapterRunState(loaded, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(loaded, 'clientes'), 'IN_PROGRESS');
    assert.equal(chapterRunState(loaded, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(loaded, 'cotizaciones'), 'COMPLETED');
  });

  it('does not spread a migrated v1 dismiss or completion across every chapter', () => {
    const legacyDismissed = JSON.stringify({
      version: 1,
      runState: 'DISMISSED',
      chapterId: 'global',
      scopeChapterId: null,
      stepId: null,
      learningMode: false,
      dismissedPageKeys: [],
      offeredPageKeys: [],
      completedChapterIds: ['global'],
      welcomeClosed: true,
    });
    const dismissed = parseWalkthroughRecord(legacyDismissed);
    assert.equal(dismissed.version, 2);
    assert.equal(dismissed.learningMode, true);
    assert.equal(chapterRunState(dismissed, 'global'), 'DISMISSED');
    assert.equal(chapterRunState(dismissed, 'clientes'), 'NOT_STARTED');
    assert.equal(chapterRunState(dismissed, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(dismissed, 'clientes'), 'DISMISSED');
    assert.notEqual(chapterRunState(dismissed, 'cotizaciones'), 'COMPLETED');
    assert.equal(shouldOfferFirstVisit(offer('/clientes', dismissed)), true);
    assert.equal(shouldOfferFirstVisit(offer('/cotizaciones', dismissed)), true);

    const legacyCompleted = JSON.stringify({
      version: 1,
      runState: 'COMPLETED',
      chapterId: 'global',
      scopeChapterId: null,
      stepId: null,
      learningMode: false,
      dismissedPageKeys: [],
      offeredPageKeys: [],
      completedChapterIds: ['global'],
      welcomeClosed: true,
    });
    const completed = parseWalkthroughRecord(legacyCompleted);
    assert.equal(completed.version, 2);
    assert.equal(completed.learningMode, true);
    assert.equal(chapterRunState(completed, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(completed, 'clientes'), 'NOT_STARTED');
    assert.equal(chapterRunState(completed, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(completed, 'clientes'), 'DISMISSED');
    assert.notEqual(chapterRunState(completed, 'cotizaciones'), 'COMPLETED');
    assert.equal(shouldOfferFirstVisit(offer('/clientes', completed)), true);
    assert.equal(shouldOfferFirstVisit(offer('/trabajo', completed)), true);
  });
});
