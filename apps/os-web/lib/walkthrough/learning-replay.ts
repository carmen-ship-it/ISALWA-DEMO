import { learningMode, replay } from './chapters/knowledge';

/**
 * Ayuda replay and Learning Mode chrome.
 * Chapter bodies stay in the chapter files. This module only maps knowledge
 * replay names onto buttons and decides when extra coach lines are visible.
 *
 * Map and message chapters may appear as future replay buttons. Do not
 * describe a live map provider, WhatsApp, or OpenAI.
 */

export const GENERAL_CHAPTER_ID = 'global';

export type ChapterRunState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';

export type ReplayableChapter = {
  chapterId: string;
  label: string;
  route: string;
};

/**
 * Fields Agent A adds to the walkthrough runner. Optional on this branch so
 * the help panel compiles before that provider lands.
 */
export type ReplayRunnerFields = {
  startChapter?: (chapterId: string) => void;
  replayableChapters?: readonly ReplayableChapter[];
  chapterStates?: Readonly<Record<string, ChapterRunState>>;
};

export type ReplayActions = {
  startChapter?: (chapterId: string) => void;
  replay: () => void;
  startPageTour: () => void;
  pageChapter: { chapterId: string } | null;
};

/**
 * Chrome labels Agent A puts on replayableChapters. Used only when that
 * list has not landed yet.
 */
const REPLAY_LABEL_BY_CHAPTER = {
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
} as const;

/**
 * Real app routes only. Cliente 360 and pedidos have no standalone list
 * path we can invent a party id for; the runner navigates after merge.
 */
const ROUTE_BY_CHAPTER: Record<keyof typeof REPLAY_LABEL_BY_CHAPTER, string> = {
  global: '/inicio',
  clientes: '/clientes',
  'cliente-360': '/clientes',
  oportunidades: '/oportunidades',
  cotizaciones: '/cotizaciones',
  pedidos: '/clientes',
  trabajo: '/trabajo',
  aprobaciones: '/aprobaciones',
  equipo: '/administracion/equipo',
  mapa: '/mapa',
  mensajes: '/mensajes',
};

/** Knowledge tour id → canonical chapter ids, in chrome order. */
const CHAPTERS_BY_TOUR_ID = {
  global: ['global'],
  customer: ['clientes', 'cliente-360'],
  commercial: ['oportunidades', 'cotizaciones', 'pedidos'],
  workforce: ['trabajo', 'aprobaciones', 'equipo'],
  knowledge: [],
  map: ['mapa'],
  messages: ['mensajes'],
} as const satisfies Record<(typeof replay.tours)[number], readonly string[]>;

/** Knowledge tour display name → the same chapter ids. Both must agree. */
const CHAPTERS_BY_TOUR_NAME = {
  Orientación: ['global'],
  Clientes: ['clientes', 'cliente-360'],
  Comercial: ['oportunidades', 'cotizaciones', 'pedidos'],
  Equipo: ['trabajo', 'aprobaciones', 'equipo'],
  Ayuda: [],
  Mapa: ['mapa'],
  Mensajes: ['mensajes'],
} as const satisfies Record<(typeof replay.tourNames)[number], readonly string[]>;

const POLICY_CLAIM = /\bdebe\b|obligaci|es una regla|está definido/i;

export function replayControlLabels(): { general: string; page: string } {
  return {
    general: replay.title,
    page: replay.pageHint,
  };
}

/**
 * Extra coach lines. Hidden when Learning Mode is off so the page stays clean.
 * onBody is a consejo that can be turned off. offHint and onTitle stay out of
 * the control so advice is not restated as a rule, and "Avisos extra" does
 * not replace the Modo aprendizaje label.
 */
export function extraExplanationLines(enabled: boolean): readonly string[] {
  if (!enabled) return [];
  const advisory: string = learningMode.onBody;
  const boundary: string = learningMode.offHint;
  const title: string = learningMode.onTitle;
  if (!advisory || advisory === boundary || advisory === title) return [];
  if (POLICY_CLAIM.test(advisory)) return [];
  return [advisory];
}

export function showsExtraExplanations(enabled: boolean): boolean {
  return extraExplanationLines(enabled).length > 0;
}

function chaptersForKnowledgeTour(
  tourId: (typeof replay.tours)[number],
  tourName: (typeof replay.tourNames)[number],
): readonly string[] {
  const byId = CHAPTERS_BY_TOUR_ID[tourId];
  const byName = CHAPTERS_BY_TOUR_NAME[tourName];
  return byId.filter((chapterId) => (byName as readonly string[]).includes(chapterId));
}

function fallbackReplayChapters(): ReplayableChapter[] {
  const seen = new Set<string>();
  const items: ReplayableChapter[] = [];
  replay.tours.forEach((tourId, index) => {
    const tourName = replay.tourNames[index];
    if (!tourName) return;
    for (const chapterId of chaptersForKnowledgeTour(tourId, tourName)) {
      if (seen.has(chapterId)) continue;
      const label = REPLAY_LABEL_BY_CHAPTER[chapterId as keyof typeof REPLAY_LABEL_BY_CHAPTER];
      if (!label) continue;
      seen.add(chapterId);
      items.push({
        chapterId,
        label,
        route: ROUTE_BY_CHAPTER[chapterId as keyof typeof ROUTE_BY_CHAPTER],
      });
    }
  });
  return items;
}

function fromRunner(chapters: readonly ReplayableChapter[]): ReplayableChapter[] {
  const seen = new Set<string>();
  const items: ReplayableChapter[] = [];
  for (const chapter of chapters) {
    if (!chapter || typeof chapter.chapterId !== 'string' || !chapter.chapterId.trim()) continue;
    if (typeof chapter.label !== 'string' || !chapter.label.trim()) continue;
    if (seen.has(chapter.chapterId)) continue;
    seen.add(chapter.chapterId);
    items.push({
      chapterId: chapter.chapterId,
      label: chapter.label,
      route: typeof chapter.route === 'string' ? chapter.route : '',
    });
  }
  return items;
}

/** Runner list when present. Knowledge replay + label map only if that list is empty. */
export function resolveReplayableChapters(
  fromApi: readonly ReplayableChapter[] | undefined,
): ReplayableChapter[] {
  if (fromApi && fromApi.length > 0) return fromRunner(fromApi);
  return fallbackReplayChapters();
}

export function selectedOrGeneralChapterId(
  chapters: readonly ReplayableChapter[],
  chapterStates: Readonly<Record<string, ChapterRunState>> | undefined,
): string {
  const selected = chapters.find((chapter) => chapterStates?.[chapter.chapterId] === 'IN_PROGRESS');
  if (selected) return selected.chapterId;
  if (chapters.some((chapter) => chapter.chapterId === GENERAL_CHAPTER_ID)) return GENERAL_CHAPTER_ID;
  return GENERAL_CHAPTER_ID;
}

function isCliente360Path(pathname: string): boolean {
  const match = pathname.match(/^\/clientes\/([^/]+)$/);
  return Boolean(match && match[1] !== 'nuevo');
}

/**
 * True only when this button is the tour for the page the user is on.
 * A commercial or workforce family must not count as the current page.
 */
export function chapterMatchesCurrentPage(
  chapterId: string,
  pageChapterId: string | null,
  pathname: string,
): boolean {
  if (!pageChapterId) return false;
  const path = pathname || '/';
  if (chapterId === pageChapterId) return true;

  if (pageChapterId === 'customer' || pageChapterId === 'clientes' || pageChapterId === 'cliente-360') {
    if (chapterId === 'clientes' && path === '/clientes') return true;
    if (chapterId === 'cliente-360' && isCliente360Path(path)) return true;
    return false;
  }

  if (
    pageChapterId === 'commercial' ||
    pageChapterId === 'oportunidades' ||
    pageChapterId === 'cotizaciones' ||
    pageChapterId === 'pedidos'
  ) {
    if (chapterId === 'oportunidades' && (path === '/oportunidades' || path.startsWith('/oportunidades/'))) {
      return true;
    }
    if (chapterId === 'cotizaciones' && (path === '/cotizaciones' || path.startsWith('/cotizaciones/'))) {
      return true;
    }
    if (chapterId === 'pedidos' && path.includes('/pedidos')) return true;
    return false;
  }

  if (
    pageChapterId === 'workforce' ||
    pageChapterId === 'trabajo' ||
    pageChapterId === 'aprobaciones' ||
    pageChapterId === 'equipo'
  ) {
    if (chapterId === 'trabajo' && (path === '/trabajo' || path.startsWith('/trabajo/'))) return true;
    if (chapterId === 'aprobaciones' && (path === '/aprobaciones' || path.startsWith('/aprobaciones/'))) {
      return true;
    }
    if (chapterId === 'equipo' && (path === '/administracion/equipo' || path.startsWith('/administracion/equipo/'))) {
      return true;
    }
    return false;
  }

  if (
    (pageChapterId === 'global' && chapterId === 'global') ||
    ((pageChapterId === 'map-truth' || pageChapterId === 'map' || pageChapterId === 'mapa') && chapterId === 'mapa') ||
    ((pageChapterId === 'whatsapp-ai' || pageChapterId === 'messages' || pageChapterId === 'mensajes') &&
      chapterId === 'mensajes')
  ) {
    return true;
  }

  return false;
}

function unavailableChapterStart(_chapterId: string): void {
  // startChapter is not on this branch yet. Do not call replay() as a stand-in.
}

/**
 * Starts the chapter the button names. startChapter when the runner exposes
 * it. startPageTour only if that chapter is the current page. Otherwise a
 * no-op — never replay() pretending to start another chapter.
 */
export function startListedChapter(actions: ReplayActions, chapterId: string, pathname: string): void {
  if (typeof actions.startChapter === 'function') {
    actions.startChapter(chapterId);
    return;
  }
  if (chapterMatchesCurrentPage(chapterId, actions.pageChapter?.chapterId ?? null, pathname)) {
    actions.startPageTour();
    return;
  }
  unavailableChapterStart(chapterId);
}

/**
 * Volver a hacer el recorrido starts the in-progress chapter, or the general
 * chapter. replay() is only the pre-merge stand-in for this control so the
 * button is not a silent no-op. Other chapter buttons must not use it.
 */
export function startGeneralReplay(
  actions: ReplayActions,
  chapters: readonly ReplayableChapter[],
  chapterStates: Readonly<Record<string, ChapterRunState>> | undefined,
  pathname: string,
): void {
  const chapterId = selectedOrGeneralChapterId(chapters, chapterStates);
  if (typeof actions.startChapter === 'function') {
    actions.startChapter(chapterId);
    return;
  }
  if (chapterMatchesCurrentPage(chapterId, actions.pageChapter?.chapterId ?? null, pathname)) {
    actions.startPageTour();
    return;
  }
  actions.replay();
}
