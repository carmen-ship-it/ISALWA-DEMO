import Link from 'next/link';
import { EXPERIENCE_ROUTES } from '@isalwa/contracts';
import { cx } from '@isalwa/ui';
import { CommandPalette } from '@/components/command-palette';

const NAV = [
  { href: EXPERIENCE_ROUTES.pulso, label: 'Pulso' },
  { href: EXPERIENCE_ROUTES.radar, label: 'Radar' },
  { href: EXPERIENCE_ROUTES.personas, label: 'Personas' },
  { href: EXPERIENCE_ROUTES.territorio, label: 'Territorio' },
  { href: EXPERIENCE_ROUTES.senal, label: 'Señal' },
  { href: EXPERIENCE_ROUTES.cierre, label: 'Cierre' },
  { href: EXPERIENCE_ROUTES.memoria, label: 'Memoria' },
] as const;

export function AppShell({
  active,
  children,
}: {
  active: (typeof NAV)[number]['href'] | string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--isalwa-mist)] bg-[var(--isalwa-kiln)] text-[var(--isalwa-porcelain)] md:border-b-0 md:border-r md:border-[color-mix(in_srgb,white_8%,transparent)]">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--isalwa-glaze)]" />
            <span className="text-[var(--isalwa-text-lg)] font-semibold tracking-wide">ISALWA</span>
          </div>
          <span className="hidden text-[var(--isalwa-text-xs)] text-[color-mix(in_srgb,white_45%,transparent)] md:inline">
            ⌘K
          </span>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible"
          aria-label="Experiencias"
        >
          {NAV.map((item) => {
            const isActive = active === item.href || active.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'rounded-[var(--isalwa-radius-control)] px-3 py-2 text-[var(--isalwa-text-md)] whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-[color-mix(in_srgb,white_12%,transparent)] text-white'
                    : 'text-[color-mix(in_srgb,white_70%,transparent)] hover:bg-[color-mix(in_srgb,white_8%,transparent)] hover:text-white',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        {children}
        <CommandPalette />
      </div>
    </div>
  );
}
