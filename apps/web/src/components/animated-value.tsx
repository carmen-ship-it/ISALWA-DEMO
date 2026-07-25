'use client';

import { useEffect, useRef, useState } from 'react';
import { dur } from '@/lib/motion';

/**
 * Smooth count-up for numeric labels. Keeps non-digit prefixes/suffixes intact.
 * Example: "Bs 12.450,00" animates the numeric core.
 */
export function AnimatedValue({
  value,
  duration,
  className,
}: {
  value: string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const ms = duration ?? dur('deliberate');

  useEffect(() => {
    if (ms === 0 || prev.current === value) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const match = value.match(/-?\d[\d.,]*/);
    if (!match || match.index == null) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const raw = match[0];
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + raw.length);
    const to = Number(raw.replace(/\./g, '').replace(',', '.'));
    const fromMatch = prev.current.match(/-?\d[\d.,]*/);
    const from = fromMatch
      ? Number(fromMatch[0].replace(/\./g, '').replace(',', '.'))
      : 0;

    if (!Number.isFinite(to)) {
      setDisplay(value);
      prev.current = value;
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      const formatted =
        Number.isInteger(to) && !raw.includes(',')
          ? Math.round(current).toLocaleString('es-BO')
          : current.toLocaleString('es-BO', {
              minimumFractionDigits: raw.includes(',') ? 2 : 0,
              maximumFractionDigits: raw.includes(',') ? 2 : 0,
            });
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        setDisplay(value);
        prev.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return <span className={className}>{display}</span>;
}
