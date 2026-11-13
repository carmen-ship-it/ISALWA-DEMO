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

/** Presentation state only: the Journey never selects an organization or data. */
type JourneyContextValue = {
  storyOpen: boolean;
  openStory: () => void;
  closeStory: (options?: CloseStoryOptions) => void;
  canOpenJourney: boolean;
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

/** `?story=1` reopens the panel for the allowed audience; nothing else is read from the URL. */
export function storyRequestedFromSearch(search: string, canOpenJourney: boolean): boolean {
  return canOpenJourney && new URLSearchParams(search).get('story') === '1';
}

const CLOSED: JourneyContextValue = {
  storyOpen: false,
  openStory: () => undefined,
  closeStory: () => undefined,
  canOpenJourney: false,
};

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider({
  children,
  canOpenJourney,
}: {
  children: ReactNode;
  canOpenJourney: boolean;
}) {
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    if (storyRequestedFromSearch(window.location.search, canOpenJourney)) setStoryOpen(true);
  }, [canOpenJourney]);

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
    () => ({ storyOpen, openStory, closeStory, canOpenJourney }),
    [storyOpen, openStory, closeStory, canOpenJourney],
  );

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney(): JourneyContextValue {
  return useContext(JourneyContext) ?? CLOSED;
}
