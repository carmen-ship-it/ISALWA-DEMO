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
  closeStory: (options?: CloseStoryOptions) => void;
  canUseOwnerDemo: boolean;
};

export type CloseStoryOptions = {
  /**
   * CTA destination. When set, do not rewrite the current URL.
   * Step 20 stays on /inicio, so replaceState would drop lente= before navigation.
   */
  navigateTo?: string | null;
};

/**
 * URL after closing the overlay without a CTA navigation.
 * Returns null when the caller is navigating, so replaceState cannot win over the destination query.
 */
export function storyCloseReplacementUrl(
  currentHref: string,
  options?: CloseStoryOptions,
): string | null {
  if (options?.navigateTo?.trim()) return null;
  const absolute = currentHref.startsWith('http')
    ? currentHref
    : `http://local.invalid${currentHref.startsWith('/') ? currentHref : `/${currentHref}`}`;
  const url = new URL(absolute);
  url.searchParams.delete('story');
  return `${url.pathname}${url.search}${url.hash}`;
}

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
    // Explicit ?datos=demo|real wins; else last local choice. Opening the
    // Journey never changes organization or data mode.
    let mode: DemoDataMode = loadDemoDataMode(window.localStorage);
    if (datos === 'demo') mode = 'demo';
    else if (datos === 'real') mode = 'real';
    if (storyRequested) setStoryOpen(true);
    setDataModeState(mode);
    saveDemoDataMode(window.localStorage, mode);
    setReady(true);
  }, [canUseOwnerDemo]);

  const setDataMode = useCallback((mode: DemoDataMode) => {
    setDataModeState(mode);
    saveDemoDataMode(window.localStorage, mode);
  }, []);

  const openStory = useCallback(() => {
    setStoryOpen(true);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('story', '1');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  const closeStory = useCallback((options?: CloseStoryOptions) => {
    setStoryOpen(false);
    if (typeof window === 'undefined') return;
    const next = storyCloseReplacementUrl(window.location.href, options);
    if (!next) return;
    const url = new URL(next, window.location.origin);
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
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
