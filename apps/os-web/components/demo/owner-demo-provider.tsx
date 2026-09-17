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
import {
  companyForDemoDataMode,
  saveOwnerEffectiveCompanyCookie,
} from '@/lib/demo/owner-company-context';
import {
  DEMO_DATA_MODE_STORAGE_KEY,
  loadDemoDataMode,
  saveDemoDataMode,
  type DemoDataMode,
} from '@/lib/demo/owner-demo-identity';

type OwnerDemoContextValue = {
  dataMode: DemoDataMode;
  setDataMode: (mode: DemoDataMode) => void;
  storyOpen: boolean;
  openStory: () => void;
  closeStory: () => void;
  canUseOwnerDemo: boolean;
};

const OwnerDemoContext = createContext<OwnerDemoContextValue | null>(null);

export function OwnerDemoProvider({
  children,
  canUseOwnerDemo,
}: {
  children: ReactNode;
  canUseOwnerDemo: boolean;
}) {
  const [dataMode, setDataModeState] = useState<DemoDataMode>('real');
  const [storyOpen, setStoryOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const storyRequested = params.get('story') === '1' && canUseOwnerDemo;
    const datos = params.get('datos')?.trim().toLowerCase();
    // Explicit ?datos=demo|real wins; Story forces demo; else last local choice.
    let mode: DemoDataMode = loadDemoDataMode(window.localStorage);
    if (storyRequested || datos === 'demo') mode = 'demo';
    else if (datos === 'real') mode = 'real';
    if (storyRequested) setStoryOpen(true);
    setDataModeState(mode);
    // Keep cookie + localStorage aligned so SSR desks honor the same mode across nav.
    saveDemoDataMode(window.localStorage, mode);
    saveOwnerEffectiveCompanyCookie(companyForDemoDataMode(mode));
    setReady(true);
  }, [canUseOwnerDemo]);

  const setDataMode = useCallback((mode: DemoDataMode) => {
    setDataModeState(mode);
    saveDemoDataMode(window.localStorage, mode);
    saveOwnerEffectiveCompanyCookie(companyForDemoDataMode(mode));
  }, []);

  const openStory = useCallback(() => {
    setDataMode('demo');
    setStoryOpen(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('datos', 'demo');
      url.searchParams.set('story', '1');
      window.history.replaceState({}, '', url.toString());
    }
  }, [setDataMode]);

  const closeStory = useCallback(() => {
    setStoryOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('story');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const value = useMemo(
    () => ({
      dataMode: ready ? dataMode : 'real',
      setDataMode,
      storyOpen,
      openStory,
      closeStory,
      canUseOwnerDemo,
    }),
    [ready, dataMode, setDataMode, storyOpen, openStory, closeStory, canUseOwnerDemo],
  );

  return <OwnerDemoContext.Provider value={value}>{children}</OwnerDemoContext.Provider>;
}

export function useOwnerDemo(): OwnerDemoContextValue {
  const ctx = useContext(OwnerDemoContext);
  if (!ctx) {
    return {
      dataMode: 'real',
      setDataMode: () => undefined,
      storyOpen: false,
      openStory: () => undefined,
      closeStory: () => undefined,
      canUseOwnerDemo: false,
    };
  }
  return ctx;
}

export function demoDataModeStorageKey(): string {
  return DEMO_DATA_MODE_STORAGE_KEY;
}
