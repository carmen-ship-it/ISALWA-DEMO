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
import { GUIDE_STORAGE_KEY, loadGuide, saveGuide } from '@/lib/walkthrough/persistence';
import {
  initialGuideRecord,
  markPageTourSeen,
  clearPageTourSeen,
  hasSeenPageTour,
  replayIntro,
  resetGuide,
  resumeGuide,
  setLearningMode,
  skipIntro,
  startIntro,
  toggleLearningMode,
  type GuideRecord,
} from '@/lib/walkthrough/progress';

export type GuideViewer = {
  openHrefs?: readonly string[];
  roleKeys?: readonly string[];
};

type GuideContextValue = {
  ready: boolean;
  record: GuideRecord;
  viewerRoleKeys: readonly string[];
  reset: () => void;
  startIntro: () => void;
  skipIntro: () => void;
  replayIntro: () => void;
  toggleLearningMode: () => void;
  setLearningMode: (enabled: boolean) => void;
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

  useEffect(() => {
    const loaded = loadGuide(window.localStorage, storageScopeKey);
    const pathname = window.location?.pathname ?? '/';
    setRecord(resumeGuide(loaded, pathname));
    setReady(true);
  }, [storageScopeKey]);

  const viewerRoleKeys = useMemo(() => viewer?.roleKeys ?? [], [viewer?.roleKeys]);

  const persist = useCallback((next: GuideRecord) => {
    if (typeof window === 'undefined') return;
    saveGuide(window.localStorage, next, scopeRef.current);
  }, []);

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
      viewerRoleKeys,
      reset: () => commit(resetGuide()),
      startIntro: () => commit(startIntro(record)),
      skipIntro: () => commit(skipIntro(record)),
      replayIntro: () => commit(replayIntro(record)),
      toggleLearningMode: () => commit(toggleLearningMode(record)),
      setLearningMode: (enabled: boolean) => commit(setLearningMode(record, enabled)),
      markPageTourSeen: (pageId: string) => commit(markPageTourSeen(record, pageId)),
      clearPageTourSeen: (pageId: string) => commit(clearPageTourSeen(record, pageId)),
      hasSeenPageTour: (pageId: string) => hasSeenPageTour(record, pageId),
    }),
    [commit, ready, record, viewerRoleKeys],
  );

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>;
}

export function useGuide(): GuideContextValue | null {
  return useContext(GuideContext);
}

export { GUIDE_STORAGE_KEY };
