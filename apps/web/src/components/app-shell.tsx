'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { EXPERIENCE_ROUTES } from '@isalwa/contracts';
import { cx } from '@isalwa/ui';
import { CommandPalette } from '@/components/command-palette';
import { GlobalHotkeys } from '@/components/global-hotkeys';
import { GuidedTour } from '@/components/guided-tour';
import { PageTransition } from '@/components/page-transition';
import { ShortcutSheet } from '@/components/shortcut-sheet';
import { ToastProvider } from '@/components/toast-provider';

const NAV = [
  { href: EXPERIENCE_ROUTES.pulso, label: 'Pulso', hint: 'Salud' },
  { href: EXPERIENCE_ROUTES.radar, label: 'Radar', hint: 'Atención' },
  { href: EXPERIENCE_ROUTES.personas, label: 'Personas', hint: 'Clientes' },
  { href: EXPERIENCE_ROUTES.territorio, label: 'Territorio', hint: 'Mapa' },
  { href: EXPERIENCE_ROUTES.senal, label: 'Señal', hint: 'WhatsApp' },
  { href: EXPERIENCE_ROUTES.cierre, label: 'Cierre', hint: 'Cotizar' },
  { href: EXPERIENCE_ROUTES.memoria, label: 'Memoria', hint: 'Historias' },
] as const;

function NavLinks({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV.map((item) => {
        const isActive = active === item.href || active.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cx(
              'group relative rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-[var(--isalwa-text-md)] whitespace-nowrap',
              'isalwa-t-fast',
              'focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_color-mix(in_srgb,white_32%,transparent)]',
              isActive
                ? 'bg-[color-mix(in_srgb,white_11%,transparent)] text-white'
                : 'text-[color-mix(in_srgb,white_62%,transparent)] hover:bg-[color-mix(in_srgb,white_6%,transparent)] hover:text-[color-mix(in_srgb,white_92%,transparent)]',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive ? (
              <span
                className="absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[var(--isalwa-glaze)]"
                aria-hidden
              />
            ) : null}
            <span className="block leading-tight">{item.label}</span>
            <span
              className={cx(
                'mt-1 hidden text-[10px] tracking-[0.12em] uppercase md:block',
                isActive
                  ? 'text-[color-mix(in_srgb,white_50%,transparent)]'
                  : 'text-[color-mix(in_srgb,white_28%,transparent)] group-hover:text-[color-mix(in_srgb,white_40%,transparent)]',
              )}
            >
              {item.hint}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export function AppShell({
  active,
  children,
}: {
  active: (typeof NAV)[number]['href'] | string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <a
        href="#isalwa-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-[var(--isalwa-radius-control)] focus:bg-white focus:px-3 focus:py-2 focus:text-[var(--isalwa-kiln)] focus:shadow-[var(--isalwa-shadow-lift)]"
      >
        Saltar al contenido
      </a>

      <div className="min-h-screen md:grid md:grid-cols-[232px_1fr]">
        {/* Mobile top bar — safe area for notched devices */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] bg-[var(--isalwa-kiln)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 text-[var(--isalwa-porcelain)] md:hidden">
          <Link href="/pulso" className="flex min-h-11 items-center gap-2.5">
            <span className="isalwa-alive-dot inline-block h-2.5 w-2.5 rounded-full bg-[var(--isalwa-glaze)]" />
            <span className="text-[var(--isalwa-text-md)] font-semibold tracking-[0.06em]">ISALWA</span>
          </Link>
          <button
            type="button"
            className="isalwa-interactive min-h-11 min-w-11 rounded-[var(--isalwa-radius-control)] border border-[color-mix(in_srgb,white_14%,transparent)] px-3 py-2 text-[var(--isalwa-text-sm)]"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Cerrar' : 'Menú'}
          </button>
        </div>

        {/* Mobile drawer */}
        {open ? (
          <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Navegación">
            <button
              type="button"
              className="absolute inset-0 bg-[color-mix(in_srgb,var(--isalwa-kiln)_55%,transparent)] isalwa-fade-in"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
            />
            <aside
              id={panelId}
              className="isalwa-slide-left absolute top-0 left-0 flex h-full w-[min(288px,86vw)] flex-col bg-[var(--isalwa-kiln)] text-[var(--isalwa-porcelain)] shadow-[var(--isalwa-shadow-lift)]"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <span className="text-[var(--isalwa-text-lg)] font-semibold tracking-[0.06em]">ISALWA</span>
                <button
                  type="button"
                  className="rounded-[var(--isalwa-radius-control)] px-2 py-1 text-[var(--isalwa-text-sm)] text-[color-mix(in_srgb,white_70%,transparent)]"
                  onClick={() => setOpen(false)}
                >
                  ✕
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-6" aria-label="Experiencias">
                <NavLinks active={active} onNavigate={() => setOpen(false)} />
              </nav>
              <div className="border-t border-[color-mix(in_srgb,white_8%,transparent)] px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[11px] leading-relaxed text-[color-mix(in_srgb,white_42%,transparent)]">
                Sistema operativo comercial
                <br />
                Santa Cruz · Bolivia
              </div>
            </aside>
          </div>
        ) : null}

        {/* Desktop sidebar */}
        <aside className="hidden flex-col border-r border-[color-mix(in_srgb,white_8%,transparent)] bg-[var(--isalwa-kiln)] text-[var(--isalwa-porcelain)] md:sticky md:top-0 md:flex md:h-screen">
          <div className="flex items-center justify-between gap-2 px-5 py-5">
            <Link href="/pulso" className="group flex items-center gap-3">
              <span className="isalwa-alive-dot inline-block h-2.5 w-2.5 rounded-full bg-[var(--isalwa-glaze)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--isalwa-glaze)_22%,transparent)] transition-transform duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] group-hover:scale-110" />
              <span className="text-[var(--isalwa-text-lg)] font-semibold tracking-[0.06em]">ISALWA</span>
            </Link>
            <kbd
              data-tour="cmdpalette-trigger"
              className="rounded-[6px] border border-[color-mix(in_srgb,white_12%,transparent)] px-1.5 py-1 text-[10px] tracking-wide text-[color-mix(in_srgb,white_48%,transparent)]"
              title="Paleta de comandos"
            >
              ⌘K
            </kbd>
          </div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-6" aria-label="Experiencias">
            <NavLinks active={active} />
          </nav>
          <div className="mt-auto border-t border-[color-mix(in_srgb,white_8%,transparent)] px-5 py-5 text-[11px] leading-relaxed text-[color-mix(in_srgb,white_42%,transparent)]">
            Sistema operativo comercial
            <br />
            Santa Cruz · Bolivia
          </div>
        </aside>

        <div id="isalwa-main" className="min-w-0 pb-[env(safe-area-inset-bottom)]" tabIndex={-1}>
          <ToastProvider>
            <PageTransition>{children}</PageTransition>
            <CommandPalette />
            <ShortcutSheet />
            <GlobalHotkeys />
          </ToastProvider>
        </div>
      </div>

      <GuidedTour />
    </>
  );
}
