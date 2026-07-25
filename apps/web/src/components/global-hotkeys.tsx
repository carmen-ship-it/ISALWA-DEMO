'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const GO_MAP: Record<string, string> = {
  p: '/pulso',
  r: '/radar',
  c: '/personas',
  t: '/territorio',
  s: '/senal',
  x: '/cierre',
  m: '/memoria',
};

/**
 * Global keyboard chords: g then letter for navigation.
 * Skips when typing in inputs.
 */
export function GlobalHotkeys() {
  const router = useRouter();
  const pendingG = useRef(false);
  const clearTimer = useRef<number | null>(null);

  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return Boolean(
        t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'SELECT' ||
            t.isContentEditable),
      );
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (pendingG.current) {
        pendingG.current = false;
        if (clearTimer.current) window.clearTimeout(clearTimer.current);
        const href = GO_MAP[e.key.toLowerCase()];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      if (e.key.toLowerCase() === 'g') {
        pendingG.current = true;
        if (clearTimer.current) window.clearTimeout(clearTimer.current);
        clearTimer.current = window.setTimeout(() => {
          pendingG.current = false;
        }, 900);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    };
  }, [router]);

  return null;
}
