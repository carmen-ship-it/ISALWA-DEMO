'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronsLeft, ChevronsRight, Menu, X } from 'lucide-react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { cx } from '@isalwa/ui';
import { AppNav } from '@/components/shell/app-nav';
import { ShellBreadcrumbs } from '@/components/shell/shell-breadcrumbs';
import { WalkthroughShell } from '@/components/walkthrough/walkthrough-shell';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { CommandPalette, CommandPaletteTrigger } from '@/components/shell/command-palette';
import { UserMenu } from '@/components/shell/user-menu';
import { ShellChromeBar, ShellChromeProvider } from '@/components/shell/shell-chrome';
import { RolePreviewProvider } from '@/components/shell/role-preview-provider';
import { RolePreviewBanner } from '@/components/shell/role-preview-banner';
import { RolePreviewDesktopControl } from '@/components/shell/role-preview-desktop-control';
import { RolePreviewMenu } from '@/components/shell/role-preview-menu';
import { canUseRolePreview } from '@/lib/role-preview/access';
import { OwnerDemoProvider, useOwnerDemo } from '@/components/demo/owner-demo-provider';
import { withStoryDemoDatos } from '@/lib/demo/story-mode-steps';
import { DemoFictitiousBanner } from '@/components/demo/demo-fictitious-banner';
import { DemoDataFilterToggle } from '@/components/demo/demo-data-filter-toggle';
import { OwnerStoryMode } from '@/components/demo/owner-story-mode';
import { VerEjemploCompletoButton } from '@/components/demo/ver-ejemplo-completo-button';
import { signOutAction } from '@/lib/auth/actions';
import { t } from '@/lib/i18n/es';
import { loadUiPreferences, saveUiPreferences } from '@/lib/shell/ui-preferences';

const ShellIdentityContext = createContext<string | null>(null);

export function useShellGivenName(): string | null {
  return useContext(ShellIdentityContext);
}

function ShellBrandHomeLink({ collapsed }: { collapsed: boolean }) {
  const { dataMode } = useOwnerDemo();
  const href = dataMode === 'demo' ? (withStoryDemoDatos('/inicio') ?? '/inicio') : '/inicio';
  return (
    <Link
      href={href}
      className="block rounded-[var(--isalwa-radius-control)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
      title={t('app.name')}
    >
      {collapsed ? (
        <p
          aria-label={t('app.name')}
          className="flex h-10 items-center justify-center font-[family-name:var(--isalwa-font-display)] text-2xl italic leading-none text-[var(--isalwa-kiln)]"
        >
          I
        </p>
      ) : (
        <>
          <p className="font-[family-name:var(--isalwa-font-display)] text-[1.65rem] italic leading-none text-[var(--isalwa-kiln)]">
            {t('app.name')}
          </p>
          <p className="mt-3 max-w-[14rem] text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {t('app.tagline')}
          </p>
        </>
      )}
    </Link>
  );
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
  /** UX-5 notification bell/drawer slot (integrator mount while UX-1 parked). */
  notificationSlot?: ReactNode;
  /** Person-specific Asesor options for Vista de evaluación. */
  asesorOptions?: readonly { memberId: string; label: string }[];
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
  notificationSlot,
  asesorOptions = [],
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [prefsReady, setPrefsReady] = useState(false);
  const [signingOut, startSignOut] = useTransition();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const shellScrollRef = useRef<HTMLDivElement>(null);
  const mobileTitleId = useId();

  useEffect(() => {
    const prefs = loadUiPreferences(window.localStorage);
    setSidebarCollapsed(prefs.sidebarCollapsed);
    setPrefsReady(true);
  }, []);

  function persistSidebarCollapsed(next: boolean) {
    setSidebarCollapsed(next);
    saveUiPreferences(window.localStorage, { sidebarCollapsed: next });
  }

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
  const railCollapsed = prefsReady && sidebarCollapsed;
  const showRolePreview = canUseRolePreview(grantedScopes);

  return (
    <RolePreviewProvider
      actorKey={actorKey}
      grantedScopes={grantedScopes}
      asesorOptions={asesorOptions}
    >
    <OwnerDemoProvider canUseOwnerDemo={showRolePreview}>
    <ShellIdentityContext.Provider value={givenName}>
      <div
        className={cx(
          'h-svh overflow-hidden bg-[var(--isalwa-surface-canvas)] lg:grid',
          railCollapsed ? 'lg:grid-cols-[4.5rem_1fr]' : 'lg:grid-cols-[17.5rem_1fr]',
        )}
      >
        {/* Desktop rail — navy/teal structure on porcelain canvas. Collapses to icon rail ≥ lg only. */}
        <aside
          id="desktop-nav-rail"
          className={cx(
            'hidden border-r border-[color-mix(in_srgb,var(--isalwa-kiln)_28%,var(--isalwa-glaze))] bg-[color-mix(in_srgb,var(--isalwa-kiln)_12%,var(--isalwa-sky-100))] lg:flex lg:h-svh lg:flex-col lg:overflow-y-auto',
            railCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-[17.5rem]',
          )}
          data-sidebar={railCollapsed ? 'collapsed' : 'expanded'}
        >
          <div className={cx(railCollapsed ? 'px-2 pb-3 pt-6' : 'px-6 pb-4 pt-8')}>
            <ShellBrandHomeLink collapsed={railCollapsed} />
          </div>
          <div className={cx('flex-1 pb-4 pt-2', railCollapsed ? 'px-1.5' : 'px-4')}>
            <AppNav
              showAdmin={showAdmin}
              grantedScopes={grantedScopes}
              capabilities={capabilities}
              collapsed={railCollapsed}
            />
          </div>
          <div
            className={cx(
              'mt-auto border-t border-[var(--isalwa-mist)] pb-[max(0.75rem,env(safe-area-inset-bottom))]',
              railCollapsed ? 'px-1.5 py-3' : 'px-4 py-3',
            )}
          >
            <button
              type="button"
              className={cx(
                'isalwa-t-fast inline-flex h-10 w-full items-center rounded-[var(--isalwa-radius-control)] text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-white)] focus-visible:shadow-[var(--isalwa-shadow-focus)]',
                railCollapsed ? 'justify-center px-0' : 'justify-start gap-2 px-3.5 text-sm font-medium',
              )}
              aria-expanded={!railCollapsed}
              aria-controls="desktop-nav-rail"
              title={railCollapsed ? 'Expandir menú' : 'Contraer menú'}
              onClick={() => persistSidebarCollapsed(!railCollapsed)}
            >
              {railCollapsed ? (
                <>
                  <span className="sr-only">Expandir menú</span>
                  <ChevronsRight size={18} strokeWidth={1.75} aria-hidden />
                </>
              ) : (
                <>
                  <ChevronsLeft size={18} strokeWidth={1.75} aria-hidden />
                  <span>Contraer</span>
                </>
              )}
            </button>
          </div>
        </aside>

        <div className="flex h-svh min-h-0 min-w-0 flex-col overflow-hidden">
          <ShellChromeProvider scrollRef={shellScrollRef}>
            {/* Top chrome stays outside the page scroll so titles never pass underneath. */}
            <ShellChromeBar>
              <header
                data-shell-header
                className="isalwa-glass-light relative z-40 flex min-w-0 shrink-0 items-center justify-between gap-2 overflow-visible border-b border-[var(--isalwa-glass-light-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 lg:px-8 lg:py-4"
              >
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
                  <p
                    data-shell-brand-mobile
                    className="min-w-0 truncate font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)] lg:hidden"
                  >
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
                  {showRolePreview ? <DemoDataFilterToggle /> : null}
                  {showRolePreview ? <VerEjemploCompletoButton /> : null}
                  <RolePreviewDesktopControl grantedScopes={grantedScopes} />
                  {notificationSlot}
                  <UserMenu displayLabel={actorLabel} />
                </div>
              </header>

              <RolePreviewBanner />
              <DemoFictitiousBanner />
            </ShellChromeBar>

            <OwnerStoryMode />

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
                  {showRolePreview ? (
                    <div className="border-t border-[var(--isalwa-mist)] px-4 py-3">
                      <RolePreviewMenu onSelect={() => setMobileOpen(false)} />
                    </div>
                  ) : null}
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

            <div
              ref={shellScrollRef}
              data-shell-scroll
              className="isalwa-shell-main min-h-0 min-w-0 flex-1 overflow-y-auto"
            >
              <WalkthroughShell storageScopeKey={actorKey}>{children}</WalkthroughShell>
            </div>
          </ShellChromeProvider>
        </div>
      </div>
    </ShellIdentityContext.Provider>
    </OwnerDemoProvider>
    </RolePreviewProvider>
  );
}
