import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { learningMode, replay } from './chapters/knowledge';
import { loadWalkthroughContent } from './content';
import {
  chapterForPathname,
  flattenChapters,
  shouldOfferFirstVisit,
  startRun,
  type PlannedStep,
} from './plan';
import { WALKTHROUGH_STORAGE_KEY, loadWalkthrough, parseWalkthroughRecord, saveWalkthrough } from './persistence';
import { getChapters, resetWalkthroughRegistryForTests } from './registry';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import type { TourChapter, TourRunState, WalkthroughRecord } from './types';

/**
 * Adversarial page-tour contract.
 *
 * Static imports of chapterRunState, nextIndexSkippingMissing, and
 * replayableChapters fail module evaluation on the current runner
 * (`does not provide an export named …`). Those imports are isolated
 * inside the tests that own them so the existing-API proofs still run.
 * ./learning-replay.ts is Agent B's module. This file does not create it.
 *
 * A missing named export or module is the expected proof until that
 * lane lands. Do not treat a failed import as a reason to stub the runner.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const OS_WEB = join(HERE, '../..');
const APP_DIR = join(OS_WEB, 'app');
const PROVIDER = join(OS_WEB, 'components/walkthrough/walkthrough-provider.tsx');
const FAKE_PARTY_ID = 'pty_example';

type ChapterRunState = (record: WalkthroughRecord, chapterId: string) => TourRunState;
type NextIndexSkippingMissing = (
  steps: readonly PlannedStep[],
  index: number,
  isFound: (target: string) => boolean,
) => number | null;
type ReplayableChapter = { chapterId: string; label: string; route: string };
type ReplayableChapters = (
  chapters: readonly TourChapter[],
  access: readonly string[],
) => readonly ReplayableChapter[];

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

function offer(pathname: string, record: WalkthroughRecord = initialWalkthroughRecord()) {
  return {
    record,
    pathname,
    chapters: registeredChapters(),
    surfaceOpen: false,
    blockingDialog: false,
  };
}

function chapterIdFor(pathname: string): string | null {
  return chapterForPathname(registeredChapters(), pathname)?.chapterId ?? null;
}

async function importNamed(specifier: string, name: string): Promise<unknown> {
  let loaded: Record<string, unknown>;
  try {
    loaded = (await import(specifier)) as Record<string, unknown>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`import '${specifier}' failed: ${reason}`);
  }
  if (typeof loaded[name] !== 'function') {
    throw new Error(`The requested module '${specifier}' does not provide an export named '${name}'`);
  }
  return loaded[name];
}

describe('current page-tour defects', () => {
  it('proves flatten/start of every chapter is one sequence when scope is null', () => {
    const steps = flattenChapters(registeredChapters());
    const chapterIds = [...new Set(steps.map((step) => step.chapterId))];
    assert.ok(chapterIds.length > 1, 'registered chapters must flatten into more than one chapter');
    const started = startRun(initialWalkthroughRecord(), steps, null);
    assert.equal(started.scopeChapterId, null);
    assert.equal(started.chapterId, steps[0]?.chapterId ?? null);
    assert.equal(started.runState, 'IN_PROGRESS');
  });

  it('proves the runner starts and replays that null-scope sequence', () => {
    const source = providerSource();
    const start = callbackBody(source, 'startFromWelcome');
    const replayAll = callbackBody(source, 'replay');
    const home = callbackBody(source, 'goHome');
    assert.match(start, /flattenChapters\(\s*getChapters\(\)\s*\)/);
    assert.match(start, /begin\([\s\S]*null\s*\)/);
    assert.match(replayAll, /begin\(\s*flattenChapters\(\s*getChapters\(\)\s*\)\s*,\s*null\s*\)/);
    assert.match(home, /scopeChapterId:\s*null/);
    assert.match(home, /flattenChapters\(\s*getChapters\(\)\s*\)/);
  });

  it('proves a dismissed run or learning mode off suppresses every later page offer', () => {
    const dismissed = reduceWalkthrough(initialWalkthroughRecord(), { type: 'DISMISS' });
    assert.equal(dismissed.runState, 'DISMISSED');
    assert.equal(dismissed.learningMode, false);
    assert.equal(shouldOfferFirstVisit(offer('/clientes', dismissed)), false);
    assert.equal(shouldOfferFirstVisit(offer('/cotizaciones', dismissed)), false);

    const learningOff = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'SET_LEARNING_MODE',
      enabled: false,
    });
    assert.equal(learningOff.runState, 'NOT_STARTED');
    assert.equal(learningOff.learningMode, false);
    assert.equal(shouldOfferFirstVisit(offer('/clientes', learningOff)), false);
    assert.equal(shouldOfferFirstVisit(offer('/trabajo', learningOff)), false);
  });

  it('proves /trabajo and /aprobaciones do not resolve their own chapters', () => {
    const trabajo = chapterForPathname(registeredChapters(), '/trabajo');
    const aprobaciones = chapterForPathname(registeredChapters(), '/aprobaciones');
    assert.notEqual(trabajo?.chapterId, 'trabajo');
    assert.notEqual(aprobaciones?.chapterId, 'aprobaciones');
    assert.equal(trabajo, null);
    assert.equal(aprobaciones, null);
  });

  it('proves /clientes/pty_example matches the list chapter, not a distinct cliente-360 chapter', () => {
    const list = chapterForPathname(registeredChapters(), '/clientes');
    const profile = chapterForPathname(registeredChapters(), `/clientes/${FAKE_PARTY_ID}`);
    assert.ok(list);
    assert.ok(profile);
    assert.equal(profile.chapterId, list.chapterId);
    assert.notEqual(profile.chapterId, 'cliente-360');
    assert.notEqual(list.chapterId, 'clientes');
  });
});

describe('page chapters after the runner fix', () => {
  it('does not start or replay every chapter as one null-scope sequence', () => {
    const source = providerSource();
    for (const name of ['startFromWelcome', 'replay', 'goHome'] as const) {
      const body = callbackBody(source, name);
      assert.doesNotMatch(
        body,
        /flattenChapters\(\s*getChapters\(\)\s*\)/,
        `${name} still flattens every chapter into one sequence`,
      );
      assert.doesNotMatch(body, /scopeChapterId:\s*null/, `${name} still starts with scope null`);
      assert.doesNotMatch(
        body,
        /begin\(\s*flattenChapters\(\s*getChapters\(\)\s*\)\s*,\s*null\s*\)/,
        `${name} still begins the full sequence`,
      );
    }
  });

  it('still offers a page after global dismiss and when learning mode is off', () => {
    const dismissed = reduceWalkthrough(initialWalkthroughRecord(), { type: 'DISMISS' });
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
    assert.equal(shouldOfferFirstVisit(offer('/clientes', learningOff)), true);
    assert.equal(shouldOfferFirstVisit(offer('/trabajo', learningOff)), true);
    assert.equal(shouldOfferFirstVisit(offer('/ayuda', learningOff)), false);
  });

  it('resolves each real page to its own chapter id', () => {
    const expected: Record<string, string> = {
      '/clientes': 'clientes',
      [`/clientes/${FAKE_PARTY_ID}`]: 'cliente-360',
      [`/clientes/${FAKE_PARTY_ID}/pedidos/ord_example`]: 'cliente-360',
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
    assert.notEqual(chapterIdFor('/clientes'), chapterIdFor(`/clientes/${FAKE_PARTY_ID}`));
  });

  it('does not invent a pedidos chapter when the app has no pedidos page', () => {
    const routes = pageRoutes(APP_DIR);
    assert.equal(routes.includes('/pedidos'), false);
    assert.equal(existsSync(join(APP_DIR, '(app)/pedidos/page.tsx')), false);
    assert.ok(routes.includes('/clientes/[partyId]/pedidos/[orderId]'));
    assert.equal(
      registeredChapters().some((chapter) => chapter.chapterId === 'pedidos'),
      false,
    );
    assert.notEqual(chapterIdFor(`/clientes/${FAKE_PARTY_ID}/pedidos/ord_example`), 'pedidos');
  });

  it('completing global does not complete clientes or cotizaciones', async () => {
    const chapterRunState = (await importNamed('./state.ts', 'chapterRunState')) as ChapterRunState;
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

  it('starts an Ayuda replay of only the selected chapter', async () => {
    const selectedId = 'cotizaciones';
    const selected = registeredChapters().find((chapter) => chapter.chapterId === selectedId);
    assert.ok(selected, `${selectedId} must be its own chapter`);
    const selectedSteps = flattenChapters([selected]);
    const everyStep = flattenChapters(registeredChapters());
    assert.ok(selectedSteps.length > 0);
    assert.ok(selectedSteps.length < everyStep.length);
    assert.ok(selectedSteps.every((step) => step.chapterId === selectedId));
    assert.ok(everyStep.some((step) => step.chapterId !== selectedId));

    const replayed = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'REPLAY',
      chapterId: selectedId,
      stepId: selectedSteps[0]?.stepId ?? null,
      scopeChapterId: selectedId,
    });
    assert.equal(replayed.chapterId, selectedId);
    assert.equal(replayed.scopeChapterId, selectedId);
    assert.notEqual(replayed.scopeChapterId, null);
    assert.equal(replayed.runState, 'IN_PROGRESS');

    const replayBody = callbackBody(providerSource(), 'replay');
    assert.doesNotMatch(replayBody, /flattenChapters\(\s*getChapters\(\)\s*\)/);
    assert.doesNotMatch(replayBody, /,\s*null\s*\)/);
  });
});

describe('runner contracts that are not exported yet', () => {
  it('skips a missing optional target without aborting the tour', async () => {
    const nextIndexSkippingMissing = (await importNamed(
      './plan.ts',
      'nextIndexSkippingMissing',
    )) as NextIndexSkippingMissing;
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
      {
        chapterId: 'cotizaciones',
        stepId: 'other-chapter',
        target: 'elsewhere',
        title: 'other',
        body: 'other',
        stateLabel: 'disponible',
      },
    ];
    const next = nextIndexSkippingMissing(steps, 0, (target) => target === 'present');
    assert.equal(next, 1);
    assert.notEqual(next, null);
    assert.equal(steps[next ?? -1]?.chapterId, 'clientes');
    assert.notEqual(steps[next ?? -1]?.chapterId, 'cotizaciones');
  });

  it('does not offer a chapter whose roleVisibility excludes the caller', () => {
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
    const restricted = {
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
    } as TourChapter;
    assert.equal(
      shouldOfferFirstVisit({
        record: initialWalkthroughRecord(),
        pathname: '/administracion/equipo',
        chapters: [restricted],
        surfaceOpen: false,
        blockingDialog: false,
        access: [],
      } as Parameters<typeof shouldOfferFirstVisit>[0] & { access: readonly string[] }),
      false,
    );
    assert.equal(
      shouldOfferFirstVisit({
        record: initialWalkthroughRecord(),
        pathname: '/clientes',
        chapters: [open],
        surfaceOpen: false,
        blockingDialog: false,
        access: [],
      } as Parameters<typeof shouldOfferFirstVisit>[0] & { access: readonly string[] }),
      true,
    );
  });

  it('omits that chapter from the replay list', async () => {
    const replayableChapters = (await importNamed('./plan.ts', 'replayableChapters')) as ReplayableChapters;
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
    const restricted = {
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
    } as TourChapter;
    const listed = replayableChapters([open, restricted], []);
    assert.equal(
      listed.some((chapter) => chapter.chapterId === 'equipo'),
      false,
    );
    assert.equal(
      listed.some((chapter) => chapter.chapterId === 'clientes'),
      true,
    );
  });

  it('keeps chapterRunState independent per chapter', async () => {
    const chapterRunState = (await importNamed('./state.ts', 'chapterRunState')) as ChapterRunState;
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

    const dismissedClientes = reduceWalkthrough(clientesInProgress, { type: 'DISMISS' });
    assert.notEqual(chapterRunState(dismissedClientes, 'global'), 'DISMISSED');
    assert.notEqual(chapterRunState(dismissedClientes, 'cotizaciones'), 'DISMISSED');
  });
});

describe('learning-mode config is consumed by the runner-facing module', () => {
  it('re-exports knowledge learningMode and replay from ./learning-replay.ts', async () => {
    let loaded: Record<string, unknown>;
    try {
      loaded = (await import('./learning-replay.ts')) as Record<string, unknown>;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`import './learning-replay.ts' failed: ${reason}`);
    }
    const exportedMode = loaded.learningMode as Partial<typeof learningMode> | undefined;
    const exportedReplay = loaded.replay as Partial<typeof replay> | undefined;
    assert.ok(exportedMode, "learning-replay.ts does not export learningMode");
    assert.ok(exportedReplay, "learning-replay.ts does not export replay");
    assert.equal(exportedMode.onTitle, learningMode.onTitle);
    assert.equal(exportedMode.onBody, learningMode.onBody);
    assert.equal(exportedMode.offHint, learningMode.offHint);
    assert.equal(exportedReplay.title, replay.title);
    assert.equal(exportedReplay.pageHint, replay.pageHint);
    assert.deepEqual([...(exportedReplay.tourNames ?? [])], [...replay.tourNames]);
  });
});

describe('walkthrough persistence', () => {
  it('documents that a saved COMPLETED record is what later pages see', () => {
    const store = memoryStore();
    const completed = reduceWalkthrough(initialWalkthroughRecord(), {
      type: 'COMPLETE',
      chapterId: 'global',
    });
    saveWalkthrough(store, completed);
    const laterPage = loadWalkthrough(store);
    const saved = JSON.parse(store.data[WALKTHROUGH_STORAGE_KEY] ?? 'null') as {
      version?: number;
      runState?: string;
      chapterStates?: unknown;
      chapters?: unknown;
    };
    const singleRunState =
      saved?.version === 1 &&
      typeof saved.runState === 'string' &&
      saved.chapterStates === undefined &&
      saved.chapters === undefined;
    assert.equal(singleRunState, true);
    assert.equal(laterPage.version, 1);
    assert.equal(laterPage.runState, 'COMPLETED');
    assert.equal(laterPage.runState, saved.runState);
    assert.equal(parseWalkthroughRecord(store.data[WALKTHROUGH_STORAGE_KEY] ?? null).runState, 'COMPLETED');
  });

  it('round-trips versioned per-chapter state and does not spread a v1 dismiss', async () => {
    const chapterRunState = (await importNamed('./state.ts', 'chapterRunState')) as ChapterRunState;
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
    const loaded = loadWalkthrough(store);
    assert.notEqual(loaded.version, 1);
    assert.equal(chapterRunState(loaded, 'global'), 'COMPLETED');
    assert.equal(chapterRunState(loaded, 'clientes'), 'IN_PROGRESS');
    assert.equal(chapterRunState(loaded, 'cotizaciones'), 'NOT_STARTED');

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
    const migrated = parseWalkthroughRecord(legacyDismissed);
    assert.equal(migrated.learningMode, true);
    assert.equal(chapterRunState(migrated, 'clientes'), 'NOT_STARTED');
    assert.equal(chapterRunState(migrated, 'cotizaciones'), 'NOT_STARTED');
    assert.notEqual(chapterRunState(migrated, 'clientes'), 'DISMISSED');
    assert.notEqual(chapterRunState(migrated, 'cotizaciones'), 'COMPLETED');
  });
});
