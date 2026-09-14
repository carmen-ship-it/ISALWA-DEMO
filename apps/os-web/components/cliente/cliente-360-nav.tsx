'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clienteSectionHref } from '@/lib/commercial/navigation';

const SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'ubicaciones', label: 'Ubicaciones' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'trabajo', label: 'Seguimiento' },
  { id: 'historial', label: 'Historial' },
] as const;

type Cliente360NavProps = {
  partyId: string;
};

export function Cliente360Nav({ partyId }: Cliente360NavProps) {
  const [activeId, setActiveId] = useState<string>('resumen');

  useEffect(() => {
    const fromHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (SECTIONS.some((section) => section.id === hash)) setActiveId(hash);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);

  return (
    <nav
      aria-label="Secciones del cliente"
      className="sticky top-14 z-10 mt-10 max-w-full border-b border-[var(--isalwa-mist)] bg-white"
    >
      <div className="overflow-x-auto overscroll-x-contain">
        <ul className="flex w-max">
          {SECTIONS.map((section) => {
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
