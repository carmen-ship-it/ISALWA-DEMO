'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

type ShellChromeContextValue = {
  compact: boolean;
};

const ShellChromeContext = createContext<ShellChromeContextValue>({ compact: false });

export function useShellChrome(): ShellChromeContextValue {
  return useContext(ShellChromeContext);
}

/** Scroll past this (px) → compact. Drop below expand threshold → full. */
export const SHELL_COMPACT_ENTER_PX = 48;
export const SHELL_COMPACT_EXIT_PX = 12;

type ShellChromeProviderProps = {
  children: ReactNode;
  /** Scrollport that owns page content (data-shell-scroll). */
  scrollRef: RefObject<HTMLElement | null>;
};

/**
 * Shared shell chrome compact mode — driven by the main column scrollport only.
 * No page-specific sticky hacks.
 */
export function ShellChromeProvider({ children, scrollRef }: ShellChromeProviderProps) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    function sync() {
      const top = node!.scrollTop;
      setCompact((wasCompact) => {
        if (wasCompact) return top > SHELL_COMPACT_EXIT_PX;
        return top >= SHELL_COMPACT_ENTER_PX;
      });
    }

    sync();
    node.addEventListener('scroll', sync, { passive: true });
    return () => node.removeEventListener('scroll', sync);
  }, [scrollRef]);

  return (
    <ShellChromeContext.Provider value={{ compact }}>{children}</ShellChromeContext.Provider>
  );
}

/** Sticky top chrome wrapper — full at page top, compact after scroll. */
export function ShellChromeBar({ children }: { children: ReactNode }) {
  const { compact } = useShellChrome();
  return (
    <div
      data-shell-chrome
      data-shell-compact={compact ? 'true' : 'false'}
      className="relative z-40 shrink-0"
    >
      {children}
    </div>
  );
}
