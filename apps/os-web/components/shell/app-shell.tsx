'use client';

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { AppNav } from '@/components/shell/app-nav';
import { CommandPalette, CommandPaletteTrigger } from '@/components/shell/command-palette';
import { UserMenu } from '@/components/shell/user-menu';
import { signOutAction } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';

const ShellIdentityContext = createContext<string | null>(null);

export function useShellGivenName(): string | null {
  return useContext(ShellIdentityContext);
}

type AppShellProps = {
  children: ReactNode;
  displayLabel: string;
  givenName: string | null;
  showAdmin: boolean;
  canCreateCustomer: boolean;
  actorKey: string | null;
  capabilities: CapabilityStateReadModel[];
};

export function AppShell({
  children,
  displayLabel,
  givenName,
  showAdmin,
  canCreateCustomer,
  actorKey,
  capabilities,
}: AppShellProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        router.refresh();
      }
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey) || event.altKey) return;
      event.preventDefault();
      setPaletteOpen((open) => !open);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const panel = mobileNavRef.current;
    const firstLink = panel?.querySelector<HTMLElement>('a[href]');
    (firstLink ?? panel)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const actorLabel = givenName ?? displayLabel;

  return (
    <ShellIdentityContext.Provider value={givenName}>
    <div className="min-h-screen bg-[var(--isalwa-white)] lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="hidden bg-[var(--isalwa-mist)] lg:sticky lg:top-0 lg:z-10 lg:flex lg:h-svh lg:flex-col lg:self-start lg:overflow-y-auto">
        <div className="px-6 pb-4 pt-8">
          <Link
            href="/inicio"
            className="block rounded-[var(--isalwa-radius-control)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            <p className="font-[family-name:var(--isalwa-font-display)] text-[1.65rem] italic leading-none text-[var(--isalwa-kiln)]">
              {t('app.name')}
            </p>
            <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {t('app.tagline')}
            </p>
          </Link>
        </div>
        <div className="px-4 pb-8 pt-4">
          <AppNav showAdmin={showAdmin} capabilities={capabilities} />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex min-w-0 items-center justify-between gap-2 overflow-visible border-b border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-4 py-4 sm:gap-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">{mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}</span>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <p className="min-w-0 truncate font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)] lg:hidden">
              {t('app.name')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <CommandPaletteTrigger
              buttonRef={searchButtonRef}
              onOpen={() => {
                setMobileOpen(false);
                setPaletteOpen(true);
              }}
            />
            <UserMenu displayLabel={actorLabel} />
          </div>
        </header>
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          showAdmin={showAdmin}
          canCreateCustomer={canCreateCustomer}
          actorKey={actorKey}
          returnFocusRef={searchButtonRef}
        />

        {mobileOpen ? (
          <div
            id="mobile-nav"
            ref={mobileNavRef}
            tabIndex={-1}
            className="min-w-0 overflow-x-hidden bg-[var(--isalwa-mist)] outline-none lg:hidden"
          >
            <AppNav
              showAdmin={showAdmin}
              capabilities={capabilities}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
            <div className="px-4 pb-5">
              <button
                type="button"
                disabled={signingOut}
                className="isalwa-t-fast flex w-full items-center rounded-[var(--isalwa-radius-control)] px-3.5 py-3 text-left text-sm font-medium text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-white)] focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:opacity-60"
                onClick={() => {
                  startSignOut(async () => {
                    await signOutAction();
                  });
                }}
              >
                {signingOut ? 'Cerrando sesión…' : t('account.signOut')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
    </ShellIdentityContext.Provider>
  );
}
