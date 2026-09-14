'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { administracionHref, accesosHref, capacidadesHref, equipoHref } from '@/lib/workforce/navigation';

const SECTIONS = [
  { href: equipoHref(), label: 'Equipo', description: 'Directorio, roles y departamentos' },
  { href: accesosHref(), label: 'Accesos', description: 'Estado de acceso de cada persona' },
  { href: capacidadesHref(), label: 'Capacidades', description: 'Qué tiene habilitado la empresa' },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  if (href === administracionHref()) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass =
  'isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] px-3 text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function AdminSubNav() {
  const pathname = usePathname();
  const items = [{ href: administracionHref(), label: 'Resumen' }, ...SECTIONS];

  return (
    <nav aria-label="Secciones de administración" className="mt-2">
      <ul className="flex flex-wrap gap-2">
        {items.map((section) => {
          const current = isCurrent(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={current ? 'page' : undefined}
                className={`${linkClass} ${
                  current
                    ? 'font-medium text-[var(--isalwa-kiln)]'
                    : 'font-normal text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)]'
                }`}
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

export function AdminSectionCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="isalwa-t-fast rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-8 outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          <h2 className="font-medium text-[var(--isalwa-kiln)]">{section.label}</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
