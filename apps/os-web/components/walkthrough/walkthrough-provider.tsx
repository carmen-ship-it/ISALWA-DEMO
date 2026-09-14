'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { loadWalkthroughContent } from '@/lib/walkthrough/content';
import { captureFocus, handleTourEscape, isTypingTarget, type Focusable, type TourSurface } from '@/lib/walkthrough/focus';
import {
  advanceRun,
  chapterForPathname,
  chapterHref,
  chapterRunState,
  flattenChapters,
  nextIndexSkippingMissing,
  pageKeyFromPathname,
  replayableChapters,
  shouldOfferFirstVisit,
  startRun,
  type PlannedStep,
  type ReplayableChapter,
} from '@/lib/walkthrough/plan';
import { loadWalkthrough, saveWalkthrough } from '@/lib/walkthrough/persistence';
import { getChapters, getWelcome } from '@/lib/walkthrough/registry';
import { initialWalkthroughRecord, reduceWalkthrough } from '@/lib/walkthrough/state';
import { hasBlockingDialog, prefersReducedMotion, routeMatches, scrollBehavior } from '@/lib/walkthrough/targeting';
import type { TourChapter, TourRunState, TourWelcome, WalkthroughRecord } from '@/lib/walkthrough/types';

type AnchorState = 'idle' | 'pending' | 'ready' | 'untargeted';

type WalkthroughApi = {
  record: WalkthroughRecord;
  surface: TourSurface;
  anchor: AnchorState;
  welcome: TourWelcome;
  step: PlannedStep | null;
  stepIndex: number;
  stepCount: number;
  pageChapter: TourChapter | null;
  canGoBack: boolean;
  canGoNext: boolean;
  openWelcome: () => void;
  startFromWelcome: () => void;
  exploreAlone: () => void;
  closeTour: () => void;
  continueLater: () => void;
  goHome: () => void;
  previous: () => void;
  next: () => void;
  replay: () => void;
  startPageTour: () => void;
  startChapter: (chapterId: string) => void;
  replayableChapters: ReplayableChapter[];
  chapterStates: Record<string, TourRunState>;
  resume: () => void;
  dismissPageOffer: () => void;
  acceptPageOffer: () => void;
  setLearningMode: (enabled: boolean) => void;
};

const WalkthroughContext = createContext<WalkthroughApi | null>(null);

let contentLoaded = false;

function ensureContent(): void {
  if (contentLoaded) return;
  contentLoaded = true;
  loadWalkthroughContent();
}

function findVisibleTarget(target: string): HTMLElement | null {
  if (!/^[a-z0-9-]+$/.test(target)) return null;
  const nodes = document.querySelectorAll(`[data-tour="${target}"]`);
  for (const node of nodes) {
    if (!(node instanceof HTMLElement) || !node.isConnected) continue;
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') continue;
    const box = node.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) return node;
  }
  return null;
}

function locationReady(nextRoute: string | undefined): boolean {
  if (!nextRoute || typeof window === 'undefined') return true;
  const [pathAndQuery] = nextRoute.split('#');
  const [path, query] = (pathAndQuery || '/').split('?');
  if (!routeMatches(window.location.pathname, path || '/')) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const actual = new URLSearchParams(window.location.search);
  for (const [key, value] of expected) {
    if (actual.get(key) !== value) return false;
  }
  return true;
}

function stepsForChapter(chapterId: string | null): PlannedStep[] {
  if (!chapterId) return [];
  const chapter = getChapters().find((item) => item.chapterId === chapterId);
  return chapter ? flattenChapters([chapter]) : [];
}

function stepsForRecord(record: WalkthroughRecord): PlannedStep[] {
  return stepsForChapter(record.scopeChapterId ?? record.chapterId);
}

export function useWalkthrough(): WalkthroughApi {
  const value = useContext(WalkthroughContext);
  if (!value) {
    throw new Error('El recorrido solo se usa dentro del shell.');
  }
  return value;
}

export function WalkthroughProvider({
  children,
  access,
}: {
  children: ReactNode;
  access?: ReadonlySet<string> | readonly string[] | null;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const [record, setRecord] = useState<WalkthroughRecord>(initialWalkthroughRecord);
  const [hydrated, setHydrated] = useState(false);
  const [surface, setSurface] = useState<TourSurface>('closed');
  const [anchor, setAnchor] = useState<AnchorState>('idle');
  const [forceHome, setForceHome] = useState(false);
  const openerRef = useRef<Focusable | null>(null);
  const surfaceRef = useRef<TourSurface>('closed');
  const recordRef = useRef(record);
  const offeredRef = useRef(new Set<string>());
  const navRef = useRef<string | null>(null);
  recordRef.current = record;
  surfaceRef.current = surface;

  useEffect(() => {
    ensureContent();
    setRecord(loadWalkthrough(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveWalkthrough(window.localStorage, record);
  }, [hydrated, record]);

  const chapters = getChapters();
  const welcome = getWelcome();
  const pageChapter = chapterForPathname(chapters, pathname);
  const scopedSteps = useMemo(
    () => stepsForRecord(record),
    [record.scopeChapterId, record.chapterId, chapters],
  );
  const stepIndex = Math.max(
    0,
    scopedSteps.findIndex((item) => item.stepId === record.stepId),
  );
  const step = surface === 'step' ? (scopedSteps[stepIndex] ?? null) : null;
  const chapterStates = useMemo(() => {
    const states: Record<string, TourRunState> = {};
    for (const chapter of chapters) {
      states[chapter.chapterId] = chapterRunState(record, chapter.chapterId);
    }
    return states;
  }, [chapters, record]);
  const listedChapters = useMemo(
    () => replayableChapters(chapters, access),
    [access, chapters],
  );

  const closeSurface = useCallback(() => {
    const opener = openerRef.current;
    openerRef.current = null;
    surfaceRef.current = 'closed';
    setSurface('closed');
    setAnchor('idle');
    setForceHome(false);
    queueMicrotask(() => {
      try {
        opener?.focus();
      } catch {
        // Detached opener. Closing still succeeds.
      }
    });
  }, []);

  const openSurface = useCallback((next: TourSurface) => {
    if (surfaceRef.current === 'closed') {
      openerRef.current = captureFocus(document.activeElement);
    }
    surfaceRef.current = next;
    setSurface(next);
  }, []);

  const finish = useCallback(
    (chapterId: string | null) => {
      setRecord((current) => reduceWalkthrough(current, { type: 'COMPLETE', chapterId }));
      closeSurface();
    },
    [closeSurface],
  );

  const openWelcome = useCallback(() => {
    setRecord((current) => reduceWalkthrough(current, { type: 'MARK_WELCOME_CLOSED' }));
    openSurface('welcome');
  }, [openSurface]);

  const begin = useCallback(
    (steps: PlannedStep[], scopeChapterId: string | null) => {
      if (steps.length === 0) {
        openWelcome();
        return;
      }
      const started = startRun(recordRef.current, steps, scopeChapterId ?? steps[0]?.chapterId ?? null);
      setRecord(started);
      setForceHome(false);
      navRef.current = null;
      if (started.runState === 'COMPLETED' || !started.stepId) {
        closeSurface();
        return;
      }
      openSurface('step');
    },
    [closeSurface, openSurface, openWelcome],
  );

  const startChapter = useCallback(
    (chapterId: string) => {
      const steps = stepsForChapter(chapterId);
      if (steps.length === 0) return;
      begin(steps, chapterId);
      const href = chapterHref(chapterId);
      if (href && !routeMatches(pathname, href)) router.push(href);
    },
    [begin, pathname, router],
  );

  const startFromWelcome = useCallback(() => {
    const steps = stepsForChapter('global');
    if (steps.length === 0) {
      setRecord((current) => startRun(current, [], 'global'));
      closeSurface();
      return;
    }
    begin(steps, 'global');
  }, [begin, closeSurface]);

  const exploreAlone = useCallback(() => {
    setRecord((current) => reduceWalkthrough(current, { type: 'DISMISS', chapterId: 'global' }));
    closeSurface();
  }, [closeSurface]);

  const closeTour = useCallback(() => {
    setRecord((current) => reduceWalkthrough(current, { type: 'CLOSE' }));
    closeSurface();
  }, [closeSurface]);

  const continueLater = useCallback(() => {
    setRecord((current) => reduceWalkthrough(current, { type: 'PAUSE' }));
    closeSurface();
  }, [closeSurface]);

  const goHome = useCallback(() => {
    setForceHome(true);
    navRef.current = null;
    const steps = stepsForChapter('global');
    if (steps.length === 0) {
      router.push('/inicio');
      openWelcome();
      return;
    }
    const first = steps[0];
    if (!first) return;
    setRecord((current) =>
      reduceWalkthrough(current, {
        type: 'START',
        chapterId: first.chapterId,
        stepId: first.stepId,
        scopeChapterId: 'global',
      }),
    );
    openSurface('step');
    router.push('/inicio');
  }, [openSurface, openWelcome, router]);

  const previous = useCallback(() => {
    setForceHome(false);
    const steps = stepsForRecord(recordRef.current);
    const index = steps.findIndex((item) => item.stepId === recordRef.current.stepId);
    const previousIndex = index <= 0 ? null : index - 1;
    if (previousIndex === null) return;
    const target = steps[previousIndex];
    if (!target) return;
    setRecord((current) =>
      reduceWalkthrough(current, { type: 'BACK', chapterId: target.chapterId, stepId: target.stepId }),
    );
    if (surfaceRef.current === 'closed') openSurface('step');
  }, [openSurface]);

  const next = useCallback(() => {
    setForceHome(false);
    const currentRecord = recordRef.current;
    const steps = stepsForRecord(currentRecord);
    const index = steps.findIndex((item) => item.stepId === currentRecord.stepId);
    const following = index < 0 ? 0 : index + 1;
    if (following >= steps.length) {
      finish(currentRecord.scopeChapterId ?? currentRecord.chapterId);
      return;
    }
    setRecord(advanceRun(currentRecord, steps, following));
    if (surfaceRef.current === 'closed') openSurface('step');
  }, [finish, openSurface]);

  const replay = useCallback(() => {
    startChapter('global');
  }, [startChapter]);

  const startPageTour = useCallback(() => {
    const chapter = chapterForPathname(getChapters(), pathname);
    if (!chapter) return;
    startChapter(chapter.chapterId);
  }, [pathname, startChapter]);

  const resume = useCallback(() => {
    if (recordRef.current.runState !== 'IN_PROGRESS' || !recordRef.current.stepId) return;
    openSurface('step');
  }, [openSurface]);

  const dismissPageOffer = useCallback(() => {
    const pageKey = pageKeyFromPathname(pathname);
    const chapter = chapterForPathname(getChapters(), pathname);
    setRecord((current) =>
      reduceWalkthrough(current, { type: 'DISMISS_PAGE', pageKey, chapterId: chapter?.chapterId }),
    );
    closeSurface();
  }, [closeSurface, pathname]);

  const acceptPageOffer = useCallback(() => {
    const chapter = chapterForPathname(getChapters(), pathname);
    if (!chapter) {
      openWelcome();
      return;
    }
    startChapter(chapter.chapterId);
  }, [openWelcome, pathname, startChapter]);

  const setLearningMode = useCallback((enabled: boolean) => {
    setRecord((current) => reduceWalkthrough(current, { type: 'SET_LEARNING_MODE', enabled }));
  }, []);

  useEffect(() => {
    if (!hydrated || surface !== 'closed') return;
    if (offeredRef.current.has(pathname)) return;
    if (hasBlockingDialog(document)) return;
    if (
      !shouldOfferFirstVisit({
        record,
        pathname,
        chapters: getChapters(),
        surfaceOpen: false,
        blockingDialog: false,
        access,
      })
    ) {
      return;
    }
    offeredRef.current.add(pathname);
    setRecord((current) =>
      reduceWalkthrough(current, { type: 'MARK_PAGE_OFFERED', pageKey: pageKeyFromPathname(pathname) }),
    );
    openSurface('page-offer');
  }, [access, hydrated, pathname, record, surface, openSurface]);

  useEffect(() => {
    if (surface !== 'step' || !step) {
      if (surface !== 'step') setAnchor('idle');
      return;
    }
    let cancelled = false;
    let timer = 0;
    setAnchor('pending');
    const reduced = prefersReducedMotion((query) => window.matchMedia(query).matches);
    const stayHome = forceHome && routeMatches(pathname, '/inicio');

    const skipMissing = () => {
      const steps = stepsForRecord(recordRef.current);
      const index = steps.findIndex((item) => item.stepId === step.stepId);
      const following = nextIndexSkippingMissing(steps, index + 1, (target) => Boolean(findVisibleTarget(target)));
      if (following === null) {
        setAnchor('untargeted');
        return;
      }
      setRecord(advanceRun(recordRef.current, steps, following));
    };

    const reveal = () => {
      let attempts = 0;
      const tick = () => {
        if (cancelled) return;
        if (!step.target) {
          setAnchor('untargeted');
          return;
        }
        const found = findVisibleTarget(step.target);
        if (found) {
          found.scrollIntoView({ behavior: scrollBehavior(reduced), block: 'center', inline: 'nearest' });
          setAnchor('ready');
          return;
        }
        attempts += 1;
        if (attempts < 8) {
          timer = window.setTimeout(tick, reduced ? 0 : 60);
          return;
        }
        skipMissing();
      };
      tick();
    };

    if (step.nextRoute && !stayHome && !locationReady(step.nextRoute)) {
      if (navRef.current !== step.stepId) {
        navRef.current = step.stepId;
        router.push(step.nextRoute);
      }
      timer = window.setTimeout(() => {
        if (cancelled) return;
        if (!locationReady(step.nextRoute)) {
          skipMissing();
          return;
        }
        reveal();
      }, 700);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    reveal();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [forceHome, pathname, router, step, surface]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (hasBlockingDialog(document) && surfaceRef.current === 'closed') return;
      if (event.key === 'Escape') {
        if (hasBlockingDialog(document)) return;
        const result = handleTourEscape({ key: event.key }, {
          surface: surfaceRef.current,
          opener: openerRef.current,
        });
        if (!result.handled) return;
        event.preventDefault();
        event.stopPropagation();
        if (surfaceRef.current === 'page-offer') {
          const pageKey = pageKeyFromPathname(window.location.pathname);
          const chapter = chapterForPathname(getChapters(), window.location.pathname);
          setRecord((current) =>
            reduceWalkthrough(current, { type: 'DISMISS_PAGE', pageKey, chapterId: chapter?.chapterId }),
          );
        } else {
          setRecord((current) => reduceWalkthrough(current, { type: 'CLOSE' }));
        }
        openerRef.current = null;
        surfaceRef.current = 'closed';
        setSurface('closed');
        setAnchor('idle');
        setForceHome(false);
        return;
      }
      if (surfaceRef.current !== 'step') return;
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      const active = event.target instanceof HTMLElement ? event.target : null;
      if (isTypingTarget(active?.tagName, active?.isContentEditable === true)) return;
      event.preventDefault();
      if (event.key === 'ArrowRight') next();
      else previous();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, previous]);

  const api = useMemo<WalkthroughApi>(
    () => ({
      record,
      surface,
      anchor,
      welcome,
      step,
      stepIndex,
      stepCount: scopedSteps.length,
      pageChapter,
      canGoBack: stepIndex > 0,
      canGoNext: true,
      openWelcome,
      startFromWelcome,
      exploreAlone,
      closeTour,
      continueLater,
      goHome,
      previous,
      next,
      replay,
      startPageTour,
      startChapter,
      replayableChapters: listedChapters,
      chapterStates,
      resume,
      dismissPageOffer,
      acceptPageOffer,
      setLearningMode,
    }),
    [
      acceptPageOffer,
      anchor,
      chapterStates,
      closeTour,
      continueLater,
      dismissPageOffer,
      exploreAlone,
      goHome,
      listedChapters,
      next,
      openWelcome,
      pageChapter,
      previous,
      record,
      replay,
      resume,
      setLearningMode,
      startChapter,
      startFromWelcome,
      startPageTour,
      step,
      stepIndex,
      scopedSteps.length,
      surface,
      welcome,
    ],
  );

  return <WalkthroughContext.Provider value={api}>{children}</WalkthroughContext.Provider>;
}
