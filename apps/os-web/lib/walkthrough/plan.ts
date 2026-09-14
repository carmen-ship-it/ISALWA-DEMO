import { getChapters, getWelcome } from './registry';
import { initialWalkthroughRecord, reduceWalkthrough } from './state';
import type { TourChapter, TourRunState, TourWelcome, WalkthroughRecord } from './types';

export type PlannedStep = {
  chapterId: string;
  stepId: string;
  target?: string;
  title: string;
  body: string;
  stateLabel: import('./types').TourStateLabel;
  nextRoute?: string;
};

const CHAPTER_ORDER = [
  'global',
  'customer',
  'commercial',
  'workforce',
  'knowledge',
  'map-truth',
  'whatsapp-ai',
] as const;

const DEFAULT_PREFIXES: Record<string, readonly string[]> = {
  global: ['/inicio'],
  customer: ['/clientes'],
  commercial: ['/cotizaciones', '/oportunidades'],
  workforce: ['/administracion/equipo'],
  knowledge: ['/ayuda'],
  'map-truth': ['/mapa'],
  'whatsapp-ai': ['/mensajes'],
};

function chapterRank(chapterId: string): number {
  const index = CHAPTER_ORDER.indexOf(chapterId as (typeof CHAPTER_ORDER)[number]);
  return index === -1 ? CHAPTER_ORDER.length : index;
}

export function prefixesFor(chapter: TourChapter): string[] {
  const listed = [chapter.routePrefix, ...(chapter.routePrefixes ?? [])].filter(
    (prefix): prefix is string => typeof prefix === 'string' && prefix.startsWith('/'),
  );
  if (listed.length > 0) return listed;
  return [...(DEFAULT_PREFIXES[chapter.chapterId] ?? [])];
}

export function pathMatches(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/';
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function flattenChapters(chapters: readonly TourChapter[]): PlannedStep[] {
  const sorted = [...chapters].sort((a, b) => chapterRank(a.chapterId) - chapterRank(b.chapterId));
  const steps: PlannedStep[] = [];
  for (const chapter of sorted) {
    for (const step of chapter.steps) {
      steps.push({ ...step, chapterId: chapter.chapterId });
    }
  }
  return steps;
}

export function chapterForPathname(
  chapters: readonly TourChapter[],
  pathname: string,
): TourChapter | null {
  const matches = chapters.filter((chapter) =>
    prefixesFor(chapter).some((prefix) => pathMatches(pathname, prefix)),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const aLen = Math.max(...prefixesFor(a).map((prefix) => prefix.length));
    const bLen = Math.max(...prefixesFor(b).map((prefix) => prefix.length));
    return bLen - aLen;
  });
  return matches[0] ?? null;
}

export function pageKeyFromPathname(pathname: string): string {
  if (pathname.startsWith('/administracion/equipo/invitar')) return 'invitar';
  if (pathname.startsWith('/administracion/equipo')) return 'equipo';
  if (pathname === '/clientes' || pathname === '/clientes/') return 'clientes';
  if (pathname.startsWith('/clientes/')) return 'cliente-360';
  if (pathname.startsWith('/oportunidades')) return 'oportunidades';
  if (pathname.startsWith('/cotizaciones')) return 'cotizaciones';
  if (pathname.startsWith('/trabajo')) return 'trabajo';
  if (pathname.startsWith('/aprobaciones')) return 'aprobaciones';
  if (pathname.startsWith('/ayuda')) return 'ayuda';
  if (pathname.startsWith('/mapa')) return 'mapa';
  if (pathname.startsWith('/mensajes')) return 'mensajes';
  if (pathname === '/inicio' || pathname.startsWith('/inicio/')) return 'inicio';
  return pathname || 'unknown';
}

export function shouldOfferFirstVisit(input: {
  record: WalkthroughRecord;
  pathname: string;
  chapters: readonly TourChapter[];
  surfaceOpen: boolean;
  blockingDialog: boolean;
}): boolean {
  if (input.surfaceOpen || input.blockingDialog) return false;
  if (!input.record.learningMode) return false;
  if (input.record.runState === 'IN_PROGRESS' || input.record.runState === 'DISMISSED') return false;
  if (input.pathname.startsWith('/ayuda')) return false;
  const pageKey = pageKeyFromPathname(input.pathname);
  if (input.record.dismissedPageKeys.includes(pageKey)) return false;
  if (input.record.offeredPageKeys.includes(pageKey)) return false;
  const chapter = chapterForPathname(input.chapters, input.pathname);
  if (chapter) return !input.record.completedChapterIds.includes(chapter.chapterId);
  return input.record.runState === 'NOT_STARTED' && !input.record.welcomeClosed && pageKey === 'inicio';
}

export function startRun(
  record: WalkthroughRecord,
  steps: readonly PlannedStep[],
  scopeChapterId: string | null,
): WalkthroughRecord {
  const first = steps[0];
  if (!first) {
    return reduceWalkthrough(record, { type: 'COMPLETE', chapterId: scopeChapterId });
  }
  return reduceWalkthrough(record, {
    type: 'START',
    chapterId: first.chapterId,
    stepId: first.stepId,
    scopeChapterId,
  });
}

export function advanceRun(
  record: WalkthroughRecord,
  steps: readonly PlannedStep[],
  nextIndex: number | null,
): WalkthroughRecord {
  if (nextIndex === null) {
    return reduceWalkthrough(record, { type: 'COMPLETE', chapterId: record.scopeChapterId ?? record.chapterId });
  }
  const step = steps[nextIndex];
  if (!step) {
    return reduceWalkthrough(record, { type: 'COMPLETE', chapterId: record.scopeChapterId ?? record.chapterId });
  }
  return reduceWalkthrough(record, { type: 'ADVANCE', chapterId: step.chapterId, stepId: step.stepId });
}

export function emptyChapterRun(): {
  chapters: number;
  welcome: TourWelcome;
  runState: TourRunState;
} {
  const chapters = getChapters();
  const steps = flattenChapters(chapters);
  const started = startRun(initialWalkthroughRecord(), steps, null);
  return {
    chapters: chapters.length,
    welcome: getWelcome(),
    runState: started.runState,
  };
}
