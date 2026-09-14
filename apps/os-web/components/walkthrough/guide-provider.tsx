'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { journeysForViewer, type GuideViewer } from '@/lib/walkthrough/journeys';
import { GUIDE_STORAGE_KEY, loadGuide, saveGuide } from '@/lib/walkthrough/persistence';
import {
  continueGuide,
  dismissGuide,
  replayFromAyuda,
  resetGuide,
  resumeGuide,
  revealGuide,
  type ContinueOutcome,
  type GuideRecord,
} from '@/lib/walkthrough/progress';

type GuideContextValue = {
  ready: boolean;
  record: GuideRecord;
  journeys: ReturnType<typeof journeysForViewer>;
  dismiss: () => void;
  reveal: () => void;
  reset: () => void;
  replay: (journeyId: string) => void;
  continueCurrent: () => ContinueOutcome;
};

const GuideContext = createContext<GuideContextValue | null>(null);

function persist(record: GuideRecord) {
  if (typeof window === 'undefined') return;
  saveGuide(window.localStorage, record);
}

export function GuideProvider({
  children,
  viewer,
}: {
  children: ReactNode;
  viewer?: GuideViewer;
}) {
  const [record, setRecord] = useState<GuideRecord>(() => ({
    version: 1,
    currentJourneyId: null,
    stopIndex: 0,
    completedJourneyIds: [],
    panelHidden: true,
  }));
  const [ready, setReady] = useState(false);
  const [openHrefs, setOpenHrefs] = useState<readonly string[] | undefined>(viewer?.openHrefs);

  useEffect(() => {
    const loaded = loadGuide(window.localStorage);
    const pathname = window.location?.pathname ?? '/';
    setRecord(resumeGuide(loaded, pathname));
    setReady(true);
  }, []);

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
  }, [journeys, ready, record]);

  const commit = useCallback((next: GuideRecord) => {
    setRecord(next);
    persist(next);
  }, []);

  const value = useMemo<GuideContextValue>(
    () => ({
      ready,
      record,
      journeys,
      dismiss: () => commit(dismissGuide(record)),
      reveal: () => commit(revealGuide(record)),
      reset: () => commit(resetGuide()),
      replay: (journeyId: string) => commit(replayFromAyuda(record, journeyId)),
      continueCurrent: () => {
        const outcome = continueGuide(record, journeys);
        commit(outcome.record);
        return outcome;
      },
    }),
    [commit, journeys, ready, record],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide(): GuideContextValue | null {
  return useContext(GuideContext);
}

export { GUIDE_STORAGE_KEY };
