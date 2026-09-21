'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cx } from '@isalwa/ui';
import { ENTREGA_PAGE_SECTIONS } from '@/lib/delivery/entrega-sections';

export { ENTREGA_PAGE_SECTIONS };

type EntregaSectionNavProps = {
  className?: string;
};

/**
 * Compact local navigator. Active section uses the operational teal treatment.
 * Labels stay exactly Pendientes / Notas de entrega / Salidas / Entregas / Historial.
 */
export function EntregaSectionNav({ className }: EntregaSectionNavProps) {
  const [activeId, setActiveId] = useState<string>(ENTREGA_PAGE_SECTIONS[0].id);

  useEffect(() => {
    const read = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (ENTREGA_PAGE_SECTIONS.some((section) => section.id === hash)) setActiveId(hash);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

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
        {ENTREGA_PAGE_SECTIONS.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id} className="min-w-0">
              <Link
                href={`#${section.id}`}
                aria-current={active ? 'true' : undefined}
                className={cx(
                  'isalwa-t-fast inline-flex max-w-full truncate rounded-[var(--isalwa-radius-control)] px-2.5 py-1 text-xs font-medium tracking-[0.04em] uppercase',
                  active
                    ? 'bg-[var(--isalwa-teal-100)] text-[var(--isalwa-kiln)]'
                    : 'text-[var(--isalwa-slate)] hover:bg-white hover:text-[var(--isalwa-kiln)]',
                )}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
