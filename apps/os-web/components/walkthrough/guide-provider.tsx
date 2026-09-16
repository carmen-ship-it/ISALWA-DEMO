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
import { journeysForViewer, type GuideViewer } from '@/lib/walkthrough/journeys';
import { GUIDE_STORAGE_KEY, loadGuide, saveGuide } from '@/lib/walkthrough/persistence';
import {
  advanceIntro,
  continueGuide,
  dismissGuide,
  clearPageTourSeen,
  hasSeenPageTour,
  markPageTourSeen,
  replayFromAyuda,
  replayIntro,
  resetGuide,
  resumeGuide,
  revealGuide,
  setIntroStep,
  setLearningMode,
  skipIntro,
  startIntro,
  toggleLearningMode,
  type ContinueOutcome,
  type GuideRecord,
} from '@/lib/walkthrough/progress';
import { initialGuideRecord } from '@/lib/walkthrough/progress';

/** Total steps in the first-use intro sequence. */
export const INTRO_TOTAL_STEPS = 7;

type GuideContextValue = {
  ready: boolean;
  record: GuideRecord;
  journeys: ReturnType<typeof journeysForViewer>;
  viewerRoleKeys: readonly string[];
  dismiss: () => void;
  reveal: () => void;
  reset: () => void;
  replay: (journeyId: string) => void;
  continueCurrent: () => ContinueOutcome;
  // First-use intro
  startIntro: () => void;
  skipIntro: () => void;
  advanceIntro: () => { href: string | null };
  setIntroStep: (index: number) => void;
  replayIntro: () => void;
  // Learning mode
  toggleLearningMode: () => void;
  setLearningMode: (enabled: boolean) => void;
  // Page micro-tours
  markPageTourSeen: (pageId: string) => void;
  clearPageTourSeen: (pageId: string) => void;
  hasSeenPageTour: (pageId: string) => boolean;
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider({
  children,
  viewer,
  /** Trusted shell actorKey (`orgId:memberId`). Required for member-isolated persistence. */
  storageScopeKey = null,
}: {
  children: ReactNode;
  viewer?: GuideViewer;
  storageScopeKey?: string | null;
}) {
  const scopeRef = useRef(storageScopeKey);
  scopeRef.current = storageScopeKey;

  const [record, setRecord] = useState<GuideRecord>(() => initialGuideRecord());
  const [ready, setReady] = useState(false);
  const [openHrefs, setOpenHrefs] = useState<readonly string[] | undefined>(viewer?.openHrefs);

  useEffect(() => {
    const loaded = loadGuide(window.localStorage, storageScopeKey);
    const pathname = window.location?.pathname ?? '/';
    setRecord(resumeGuide(loaded, pathname));
    setReady(true);
  }, [storageScopeKey]);

  useEffect(() => {
    if (viewer?.openHrefs) {
      setOpenHrefs(viewer.openHrefs);
      return;
    }
    const hrefs = [...document.querySelectorAll('nav a[href]')]
      .map((node) => node.getAttribute('href') ?? '')
      .filter((href) => href.startsWith('/'));
    if (hrefs.length > 0) setOpenHrefs(hrefs);
  }, [viewer?.openHrefs]);

  const journeys = useMemo(
    () => journeysForViewer({ openHrefs, roleKeys: viewer?.roleKeys }),
    [openHrefs, viewer?.roleKeys],
  );

  const viewerRoleKeys = useMemo(() => viewer?.roleKeys ?? [], [viewer?.roleKeys]);

  const persist = useCallback((next: GuideRecord) => {
    if (typeof window === 'undefined') return;
    saveGuide(window.localStorage, next, scopeRef.current);
  }, []);

  useEffect(() => {
    if (!ready || journeys.length === 0) return;
    if (journeys.some((journey) => journey.id === record.currentJourneyId)) return;
    const next = {
      ...record,
      currentJourneyId: journeys[0]?.id ?? null,
      stopIndex: 0,
    };
    setRecord(next);
    persist(next);
  }, [journeys, ready, record, persist]);

  const commit = useCallback(
    (next: GuideRecord) => {
      setRecord(next);
      persist(next);
    },
    [persist],
  );

  const value = useMemo<GuideContextValue>(
    () => ({
      ready,
      record,
      journeys,
      viewerRoleKeys,
      dismiss: () => commit(dismissGuide(record)),
      reveal: () => commit(revealGuide(record)),
      reset: () => commit(resetGuide()),
      replay: (journeyId: string) => commit(replayFromAyuda(record, journeyId)),
      continueCurrent: () => {
        const outcome = continueGuide(record, journeys);
        commit(outcome.record);
        return outcome;
      },
      // First-use intro
      startIntro: () => commit(startIntro(record)),
      skipIntro: () => commit(skipIntro(record)),
      advanceIntro: () => {
        const result = advanceIntro(record, INTRO_TOTAL_STEPS);
        commit(result.record);
        return { href: result.href };
      },
      setIntroStep: (index: number) => commit(setIntroStep(record, index)),
      replayIntro: () => commit(replayIntro(record)),
      // Learning mode
      toggleLearningMode: () => commit(toggleLearningMode(record)),
      setLearningMode: (enabled: boolean) => commit(setLearningMode(record, enabled)),
      // Page micro-tours
      markPageTourSeen: (pageId: string) => commit(markPageTourSeen(record, pageId)),
      clearPageTourSeen: (pageId: string) => commit(clearPageTourSeen(record, pageId)),
      hasSeenPageTour: (pageId: string) => hasSeenPageTour(record, pageId),
    }),
    [commit, journeys, ready, record, viewerRoleKeys],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide(): GuideContextValue | null {
  return useContext(GuideContext);
}

export { GUIDE_STORAGE_KEY };
