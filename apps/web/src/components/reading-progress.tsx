'use client';

import { useEffect, useState } from 'react';

/**
 * Thin reading progress for long dossier pages.
 * Fixed under the sticky header; CSS-only fill.
 */
export function ReadingProgress({ targetId }: { targetId?: string }) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = targetId ? document.getElementById(targetId) : document.documentElement;
      if (!el) return;
      const scrollTop = window.scrollY;
      const height = (el === document.documentElement ? el.scrollHeight : el.scrollHeight) - window.innerHeight;
      if (height <= 0) {
        setPct(0);
        return;
      }
      setPct(Math.min(100, Math.max(0, (scrollTop / height) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  if (pct <= 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-0 right-0 left-0 z-[25] h-[2px] md:left-[232px]"
      aria-hidden
    >
      <div
        className="h-full origin-left bg-[var(--isalwa-glaze)] transition-[width] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
