import Link from 'next/link';
import { clienteSectionHref } from '@/lib/commercial/navigation';

const SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'contactos', label: 'Contactos' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'trabajo', label: 'Seguimiento' },
  { id: 'oportunidades', label: 'Oportunidades' },
  { id: 'cotizaciones', label: 'Cotizaciones' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'historial', label: 'Historial' },
] as const;

type Cliente360NavProps = {
  partyId: string;
};

export function Cliente360Nav({ partyId }: Cliente360NavProps) {
  return (
    <nav
      aria-label="Secciones del cliente"
      className="overflow-x-auto rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-2"
    >
      <ul className="flex min-w-max gap-1">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              href={clienteSectionHref(partyId, section.id)}
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
