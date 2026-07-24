import Link from 'next/link';
import { EXPERIENCE_ROUTES } from '@isalwa/contracts';
import { cx } from '@isalwa/ui';
import { CommandPalette } from '@/components/command-palette';

const NAV = [
  { href: EXPERIENCE_ROUTES.pulso, label: 'Pulso', hint: 'Salud' },
  { href: EXPERIENCE_ROUTES.radar, label: 'Radar', hint: 'Atención' },
  { href: EXPERIENCE_ROUTES.personas, label: 'Personas', hint: 'Clientes' },
  { href: EXPERIENCE_ROUTES.territorio, label: 'Territorio', hint: 'Mapa' },
  { href: EXPERIENCE_ROUTES.senal, label: 'Señal', hint: 'WhatsApp' },
  { href: EXPERIENCE_ROUTES.cierre, label: 'Cierre', hint: 'Cotizar' },
  { href: EXPERIENCE_ROUTES.memoria, label: 'Memoria', hint: 'Historias' },
] as const;

export function AppShell({
  active,
  children,
}: {
  active: (typeof NAV)[number]['href'] | string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
      <aside className="border-b border-[var(--isalwa-mist)] bg-[var(--isalwa-kiln)] text-[var(--isalwa-porcelain)] md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r md:border-[color-mix(in_srgb,white_8%,transparent)]">
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <Link href="/pulso" className="group flex items-center gap-2.5">
            <span className="isalwa-alive-dot inline-block h-2.5 w-2.5 rounded-full bg-[var(--isalwa-glaze)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--isalwa-glaze)_25%,transparent)] transition-transform group-hover:scale-110" />
            <span className="text-[var(--isalwa-text-lg)] font-semibold tracking-[0.04em]">ISALWA</span>
          </Link>
          <kbd className="hidden rounded border border-[color-mix(in_srgb,white_14%,transparent)] px-1.5 py-0.5 text-[10px] tracking-wide text-[color-mix(in_srgb,white_45%,transparent)] md:inline">
            ⌘K
          </kbd>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-4 md:flex-col md:overflow-visible md:px-3"
          aria-label="Experiencias"
        >
          {NAV.map((item) => {
            const isActive = active === item.href || active.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  'group relative rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-[var(--isalwa-text-md)] whitespace-nowrap',
                  'transition-[background-color,color,transform] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)]',
                  'focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,white_35%,transparent)]',
                  isActive
                    ? 'bg-[color-mix(in_srgb,white_12%,transparent)] text-white'
                    : 'text-[color-mix(in_srgb,white_68%,transparent)] hover:bg-[color-mix(in_srgb,white_8%,transparent)] hover:text-white',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive ? (
                  <span
                    className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--isalwa-glaze)]"
                    aria-hidden
                  />
                ) : null}
                <span className="block leading-tight">{item.label}</span>
                <span
                  className={cx(
                    'mt-0.5 hidden text-[10px] tracking-wide uppercase md:block',
                    isActive ? 'text-[color-mix(in_srgb,white_55%,transparent)]' : 'text-[color-mix(in_srgb,white_32%,transparent)]',
                  )}
                >
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden px-5 pb-5 text-[11px] leading-relaxed text-[color-mix(in_srgb,white_35%,transparent)] md:block">
          Sistema operativo comercial
          <br />
          Santa Cruz · Bolivia
        </div>
      </aside>
      <div className="min-w-0">
        {children}
        <CommandPalette />
      </div>
    </div>
  );
}
