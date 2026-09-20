'use client';

import Link from 'next/link';
import { cx } from '@isalwa/ui';
import { ENTREGA_PAGE_SECTIONS } from '@/lib/delivery/entrega-sections';

export { ENTREGA_PAGE_SECTIONS };

type EntregaSectionNavProps = {
  className?: string;
};

/**
 * Compact local navigator. Sticks under the shared shell header on long pages.
 * Single short row — not a second tall sticky chrome layer.
 */
export function EntregaSectionNav({ className }: EntregaSectionNavProps) {
  return (
    <nav
      className={cx('mb-4', className)}
      aria-label="Secciones de entregas"
      data-entrega-section-nav=""
    >
      <ul
        className={cx(
          'flex flex-wrap gap-1.5 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)]',
          'bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-2 py-1.5 backdrop-blur-md',
          'sticky z-10 top-[var(--isalwa-shell-header-offset,3.5rem)]',
        )}
      >
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
