'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clienteSectionHref } from '@/lib/commercial/navigation';
import { CLIENTE360_NAV_SECTIONS, isCliente360NavSection } from '@/lib/cliente/nav-sections';

type Cliente360NavProps = {
  partyId: string;
  /** When nested under Cliente360Sticky, drop the own sticky chrome. */
  embedded?: boolean;
};

export function Cliente360Nav({ partyId, embedded = false }: Cliente360NavProps) {
  const [activeId, setActiveId] = useState<string>('resumen');

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (isCliente360NavSection(hash)) setActiveId(hash);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  return (
    <nav
      aria-label="Secciones del cliente"
      className={
        embedded
          ? 'max-w-full'
          : 'sticky top-14 z-10 mt-10 max-w-full border-b border-[var(--isalwa-mist)] bg-white'
      }
    >
      <div className="overflow-x-auto overscroll-x-contain">
        <ul className="flex w-max">
          {CLIENTE360_NAV_SECTIONS.map((section) => {
            const active = activeId === section.id;
            return (
              <li key={section.id}>
                <Link
                  href={clienteSectionHref(partyId, section.id)}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setActiveId(section.id)}
                  className={
                    active
                      ? 'inline-flex h-11 items-center border-b-2 border-[var(--isalwa-glaze)] px-3 text-sm font-medium text-[var(--isalwa-glaze)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]'
                      : 'inline-flex h-11 items-center border-b-2 border-transparent px-3 text-sm text-[var(--isalwa-slate)] outline-none hover:text-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]'
                  }
                >
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
