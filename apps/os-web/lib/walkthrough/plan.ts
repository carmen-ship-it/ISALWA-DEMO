import { getChapters, getWelcome } from './registry';
import { initialWalkthroughRecord, isTourRunState, reduceWalkthrough } from './state';
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

export type ReplayableChapter = {
  chapterId: string;
  label: string;
  route: string;
};

const CHAPTER_ORDER = [
  'global',
  'clientes',
  'cliente-360',
  'oportunidades',
  'cotizaciones',
  'trabajo',
  'aprobaciones',
  'equipo',
  'ayuda',
  'mapa',
  'mensajes',
] as const;

/** Used only when a chapter has no routePrefix and is not in the route table. */
const DEFAULT_PREFIXES: Record<string, readonly string[]> = {
  global: ['/inicio'],
  ayuda: ['/ayuda'],
  mapa: ['/mapa'],
  mensajes: ['/mensajes'],
  oportunidades: ['/oportunidades'],
  cotizaciones: ['/cotizaciones'],
  trabajo: ['/trabajo'],
  aprobaciones: ['/aprobaciones'],
  equipo: ['/administracion/equipo'],
};

const REPLAY_LABELS: Record<string, string> = {
  global: 'Recorrido general',
  clientes: 'Recorrido de Clientes',
  'cliente-360': 'Recorrido de Cliente 360',
  oportunidades: 'Recorrido de Oportunidades',
  cotizaciones: 'Recorrido de Cotizaciones',
  pedidos: 'Recorrido de Pedidos',
  trabajo: 'Recorrido de Trabajo',
  aprobaciones: 'Recorrido de Aprobaciones',
  equipo: 'Recorrido de Equipo',
  mapa: 'Recorrido de Mapa',
  mensajes: 'Recorrido de Mensajes',
};

type ChapterRoute = {
  href: string | null;
  navigable: boolean;
  specificity: number;
  match: (pathname: string) => boolean;
};

const CLIENTE_360 = /^\/clientes\/(?!nuevo$)[^/]+$/;

function prefixMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

const ROUTE_TABLE: Record<string, ChapterRoute> = {
  global: { href: '/inicio', navigable: true, specificity: 20, match: (path) => prefixMatch(path, '/inicio') },
  clientes: { href: '/clientes', navigable: true, specificity: 40, match: (path) => path === '/clientes' },
  'cliente-360': {
    href: '/clientes/:partyId',
    navigable: false,
    specificity: 50,
    match: (path) => CLIENTE_360.test(path),
  },
  oportunidades: {
    href: '/oportunidades',
    navigable: true,
    specificity: 20,
    match: (path) => prefixMatch(path, '/oportunidades'),
  },
  cotizaciones: {
    href: '/cotizaciones',
    navigable: true,
    specificity: 20,
    match: (path) => prefixMatch(path, '/cotizaciones'),
  },
  trabajo: { href: '/trabajo', navigable: true, specificity: 20, match: (path) => prefixMatch(path, '/trabajo') },
  aprobaciones: {
    href: '/aprobaciones',
    navigable: true,
    specificity: 20,
    match: (path) => prefixMatch(path, '/aprobaciones'),
  },
  equipo: {
    href: '/administracion/equipo',
    navigable: true,
    specificity: 60,
    match: (path) => prefixMatch(path, '/administracion/equipo'),
  },
  ayuda: { href: '/ayuda', navigable: true, specificity: 20, match: (path) => prefixMatch(path, '/ayuda') },
  mapa: { href: '/mapa', navigable: true, specificity: 20, match: (path) => prefixMatch(path, '/mapa') },
  mensajes: { href: '/mensajes', navigable: true, specificity: 20, match: (path) => prefixMatch(path, '/mensajes') },
};

export function normalizePathname(pathname: string): string {
  const path = (pathname.split(/[?#]/)[0] || '/').replace(/\/+$/, '');
  return path || '/';
}

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
  const path = normalizePathname(pathname);
  const base = normalizePathname(prefix);
  if (base === '/') return path === '/';
  return path === base || path.startsWith(`${base}/`);
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
  const path = normalizePathname(pathname);
  const matches: { chapter: TourChapter; specificity: number }[] = [];
  for (const chapter of chapters) {
    const routed = ROUTE_TABLE[chapter.chapterId];
    if (routed) {
      if (routed.match(path)) matches.push({ chapter, specificity: routed.specificity });
      continue;
    }
    const prefixes = prefixesFor(chapter);
    if (prefixes.some((prefix) => pathMatches(path, prefix))) {
      const specificity = Math.max(...prefixes.map((prefix) => normalizePathname(prefix).length), 1);
      matches.push({ chapter, specificity });
    }
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.specificity - a.specificity);
  return matches[0]?.chapter ?? null;
}

export function chapterHref(chapterId: string): string | null {
  const routed = ROUTE_TABLE[chapterId];
  if (!routed?.navigable || !routed.href) return null;
  return routed.href;
}

export function pageKeyFromPathname(pathname: string): string {
  const path = normalizePathname(pathname);
  if (path.startsWith('/administracion/equipo/invitar')) return 'invitar';
  if (path.startsWith('/administracion/equipo')) return 'equipo';
  if (path === '/clientes') return 'clientes';
  if (CLIENTE_360.test(path)) return 'cliente-360';
  if (path.startsWith('/oportunidades')) return 'oportunidades';
  if (path.startsWith('/cotizaciones')) return 'cotizaciones';
  if (path.startsWith('/trabajo')) return 'trabajo';
  if (path.startsWith('/aprobaciones')) return 'aprobaciones';
  if (path.startsWith('/ayuda')) return 'ayuda';
  if (path.startsWith('/mapa')) return 'mapa';
  if (path.startsWith('/mensajes')) return 'mensajes';
  if (path === '/inicio' || path.startsWith('/inicio/')) return 'inicio';
  return path || 'unknown';
}

export function chapterRunState(record: WalkthroughRecord, chapterId: string): TourRunState {
  const stored = record.chapterStates?.[chapterId];
  if (isTourRunState(stored)) return stored;
  if (record.completedChapterIds.includes(chapterId)) return 'COMPLETED';
  const active = record.scopeChapterId ?? record.chapterId;
  if (record.runState === 'IN_PROGRESS' && active === chapterId) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

export function shouldOfferFirstVisit(input: {
  record: WalkthroughRecord;
  pathname: string;
  chapters: readonly TourChapter[];
  surfaceOpen: boolean;
  blockingDialog: boolean;
}): boolean {
  if (input.surfaceOpen || input.blockingDialog) return false;
  const path = normalizePathname(input.pathname);
  if (path === '/ayuda' || path.startsWith('/ayuda/')) return false;
  const pageKey = pageKeyFromPathname(path);
  if (input.record.dismissedPageKeys.includes(pageKey)) return false;
  if (input.record.offeredPageKeys.includes(pageKey)) return false;
  const chapter = chapterForPathname(input.chapters, path);
  if (chapter) {
    if (chapter.chapterId === 'ayuda') return false;
    const state = chapterRunState(input.record, chapter.chapterId);
    return state === 'NOT_STARTED';
  }
  return input.record.runState === 'NOT_STARTED' && !input.record.welcomeClosed && pageKey === 'inicio';
}

function accessHas(access: ReadonlySet<string> | readonly string[], role: string): boolean {
  return access instanceof Set ? access.has(role) : access.includes(role);
}

function chapterVisible(
  chapter: TourChapter,
  access?: ReadonlySet<string> | readonly string[] | null,
): boolean {
  const roles = chapter.roleVisibility;
  if (!roles || roles.length === 0) return true;
  if (!access) return true;
  return roles.some((role) => accessHas(access, role));
}

export function replayableChapters(
  chapters: readonly TourChapter[],
  access?: ReadonlySet<string> | readonly string[] | null,
): ReplayableChapter[] {
  const byId = new Map(chapters.map((chapter) => [chapter.chapterId, chapter]));
  const listed: ReplayableChapter[] = [];
  for (const chapterId of CHAPTER_ORDER) {
    const chapter = byId.get(chapterId);
    const label = REPLAY_LABELS[chapterId];
    const routed = ROUTE_TABLE[chapterId];
    if (!chapter || !label || !routed?.href) continue;
    if (!chapterVisible(chapter, access)) continue;
    listed.push({ chapterId, label, route: routed.href });
  }
  return listed;
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
    scopeChapterId: scopeChapterId ?? first.chapterId,
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

/**
 * From index inclusive, the next step that can be shown. A missing optional
 * target advances. null means nothing later in this chapter can be shown —
 * it does not complete or dismiss any chapter.
 */
export function nextIndexSkippingMissing(
  steps: readonly { target?: string }[],
  index: number,
  isFound: (target: string) => boolean,
): number | null {
  if (steps.length === 0 || index >= steps.length) return null;
  const start = index < 0 ? 0 : index;
  for (let cursor = start; cursor < steps.length; cursor += 1) {
    const step = steps[cursor];
    if (!step) continue;
    if (!step.target || isFound(step.target)) return cursor;
  }
  return null;
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
