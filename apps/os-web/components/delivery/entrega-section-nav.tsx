'use client';

import Link from 'next/link';
import { cx } from '@isalwa/ui';
import { ENTREGA_PAGE_SECTIONS } from '@/lib/delivery/entrega-sections';

export { ENTREGA_PAGE_SECTIONS };

type EntregaSectionNavProps = {
  className?: string;
};

/**
 * Compact local navigator. Sticks at the top of the shell scrollport
 * (global header is outside that scroll — use isalwa-sticky-under-shell, top:0).
 */
export function EntregaSectionNav({ className }: EntregaSectionNavProps) {
  return (
    <nav
      className={cx(
        'isalwa-sticky-under-shell mb-4 border-b border-[var(--isalwa-mist)]',
        'bg-[color-mix(in_srgb,var(--isalwa-porcelain)_96%,white)] py-1.5 backdrop-blur-md',
        className,
      )}
      aria-label="Secciones de entregas"
      data-entrega-section-nav=""
    >
      <ul className="flex flex-wrap gap-1.5 px-0.5">
        {ENTREGA_PAGE_SECTIONS.map((section) => (
          <li key={section.id} className="min-w-0">
            <Link
              href={`#${section.id}`}
              className="isalwa-t-fast inline-flex max-w-full truncate rounded-[var(--isalwa-radius-control)] px-2.5 py-1 text-xs font-medium tracking-[0.04em] text-[var(--isalwa-slate)] uppercase hover:bg-white hover:text-[var(--isalwa-kiln)]"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
