'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { AppNav } from '@/components/shell/app-nav';
import { ShellBreadcrumbs } from '@/components/shell/shell-breadcrumbs';
import { WalkthroughShell } from '@/components/walkthrough/walkthrough-shell';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
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
  /** Trusted scopes for nav labeling only — never used to hide destinations. */
  grantedScopes: readonly string[];
  capabilities: CapabilityStateReadModel[];
};

export function AppShell({
  children,
  displayLabel,
  givenName,
  showAdmin,
  canCreateCustomer,
  actorKey,
  grantedScopes,
  capabilities,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileTitleId = useId();

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

  // Close the mobile drawer on route change so deep links do not leave it open.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const panel = mobileNavRef.current;
    const focusables = () =>
      panel?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    const first = focusables()[0];
    (first ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const nodes = [...focusables()];
      if (nodes.length === 0) return;
      const firstNode = nodes[0]!;
      const lastNode = nodes[nodes.length - 1]!;
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  const actorLabel = givenName ?? displayLabel;

  return (
    <ShellIdentityContext.Provider value={givenName}>
      <div className="min-h-screen bg-[var(--isalwa-white)] lg:grid lg:grid-cols-[17.5rem_1fr]">
        {/* Desktop rail — sticky for orientation; not duplicated as page sticky headers. */}
        <aside className="hidden border-r border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] lg:sticky lg:top-0 lg:z-10 lg:flex lg:h-svh lg:flex-col lg:self-start lg:overflow-y-auto">
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
          <div className="flex-1 px-4 pb-8 pt-2">
            <AppNav showAdmin={showAdmin} grantedScopes={grantedScopes} capabilities={capabilities} />
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-col">
          {/* Top chrome — sticky so search/account stay reachable above content scroll. */}
          <header className="sticky top-0 z-40 flex min-w-0 items-center justify-between gap-2 overflow-visible border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-white)_92%,transparent)] px-4 py-3 backdrop-blur-md sm:gap-4 lg:px-8 lg:py-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <div className="flex min-w-0 items-center gap-3">
              <button
                ref={menuButtonRef}
                type="button"
                data-tour={TOUR_TARGET.navPrimary}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] lg:hidden"
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                aria-haspopup="dialog"
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

          <ShellBreadcrumbs />

          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            showAdmin={showAdmin}
            canCreateCustomer={canCreateCustomer}
            actorKey={actorKey}
            returnFocusRef={searchButtonRef}
          />

          {mobileOpen ? (
            <div className="fixed inset-0 z-30 lg:hidden" role="presentation">
              <button
                type="button"
                aria-label={t('nav.closeMenu')}
                className="absolute inset-0 bg-[color-mix(in_srgb,var(--isalwa-kiln)_28%,transparent)]"
                onClick={() => {
                  setMobileOpen(false);
                  menuButtonRef.current?.focus();
                }}
              />
              <div
                id="mobile-nav"
                ref={mobileNavRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={mobileTitleId}
                tabIndex={-1}
                className="absolute inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2.5rem))] flex-col overflow-y-auto bg-[var(--isalwa-porcelain)] pt-[env(safe-area-inset-top)] shadow-[var(--isalwa-shadow-floating)] outline-none"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] px-4 py-4">
                  <p
                    id={mobileTitleId}
                    className="font-[family-name:var(--isalwa-font-display)] text-lg italic text-[var(--isalwa-kiln)]"
                  >
                    {t('app.name')}
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
                    aria-label={t('nav.closeMenu')}
                    onClick={() => {
                      setMobileOpen(false);
                      menuButtonRef.current?.focus();
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
                <AppNav
                  showAdmin={showAdmin}
                  grantedScopes={grantedScopes}
                  capabilities={capabilities}
                  mobile
                  onNavigate={() => setMobileOpen(false)}
                />
                <div className="mt-auto border-t border-[var(--isalwa-mist)] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    disabled={signingOut}
                    className="isalwa-t-fast flex w-full items-center rounded-[var(--isalwa-radius-control)] px-3.5 py-3 text-left text-sm font-medium text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-white)] focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:opacity-60"
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
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <WalkthroughShell>{children}</WalkthroughShell>
          </div>
        </div>
      </div>
    </ShellIdentityContext.Provider>
  );
}
