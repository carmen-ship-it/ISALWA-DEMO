import Link from 'next/link';
import { administracionHref, accesosHref, capacidadesHref, equipoHref } from '@/lib/workforce/navigation';

const SECTIONS = [
  { href: equipoHref(), label: 'Equipo', description: 'Personas, roles y departamentos' },
  { href: accesosHref(), label: 'Accesos', description: 'Estados de acceso por empleado' },
  { href: capacidadesHref(), label: 'Capacidades', description: 'Disponibilidad del sistema' },
] as const;

export function AdminSubNav() {
  return (
    <nav
      aria-label="Secciones de administración"
      className="overflow-x-auto rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-2"
    >
      <ul className="flex min-w-max gap-1">
        <li>
          <Link
            href={administracionHref()}
            className="isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] px-3 text-sm font-medium text-[var(--isalwa-slate)] outline-none hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            Resumen
          </Link>
        </li>
        {SECTIONS.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] px-3 text-sm font-medium text-[var(--isalwa-slate)] outline-none hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AdminSectionCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="isalwa-t-fast rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-5 outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        >
          <h2 className="font-medium text-[var(--isalwa-kiln)]">{section.label}</h2>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{section.description}</p>
        </Link>
      ))}
    </div>
  );
}
