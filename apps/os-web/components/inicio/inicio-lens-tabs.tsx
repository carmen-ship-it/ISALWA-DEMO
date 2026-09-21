import Link from 'next/link';
import { cx } from '@isalwa/ui';
import {
  inicioLensTabHref,
  inicioPageLensLabel,
  type InicioPageLens,
} from '@/lib/inicio/page-lens';

type InicioLensTabsProps = {
  active: InicioPageLens;
  available: readonly InicioPageLens[];
  periodo: string;
};

export function InicioLensTabs({ active, available, periodo }: InicioLensTabsProps) {
  if (available.length <= 1) return null;
  return (
    <nav aria-label="Lectura de inicio" className="min-w-0">
      <ul className="flex flex-wrap gap-2">
        {available.map((lens) => {
          const isActive = lens === active;
          return (
            <li key={lens}>
              <Link
                href={inicioLensTabHref(lens, periodo)}
                className={cx(
                  'inline-flex rounded-[var(--isalwa-radius-control)] border px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-[var(--isalwa-glaze)] bg-[var(--isalwa-teal-100)] text-[var(--isalwa-kiln)]'
                    : 'border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {inicioPageLensLabel(lens)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
