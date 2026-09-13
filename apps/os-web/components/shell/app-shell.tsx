'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { AppNav } from '@/components/shell/app-nav';
import { UserMenu } from '@/components/shell/user-menu';
import { t } from '@/lib/i18n/es';

type AppShellProps = {
  children: ReactNode;
  displayLabel: string;
  showAdmin: boolean;
  capabilities: CapabilityStateReadModel[];
};

export function AppShell({ children, displayLabel, showAdmin, capabilities }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_88%,white)] lg:flex lg:flex-col">
        <div className="border-b border-[var(--isalwa-mist)] px-5 py-6">
          <Link href="/inicio" className="block">
            <p className="isalwa-kicker">{t('app.name')}</p>
            <p className="mt-1 font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
              {t('app.tagline')}
            </p>
          </Link>
        </div>
        <div className="flex-1 px-3 py-4">
          <AppNav showAdmin={showAdmin} capabilities={capabilities} />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-4 py-3 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white text-[var(--isalwa-kiln)] lg:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span className="sr-only">{mobileOpen ? t('nav.closeMenu') : t('nav.openMenu')}</span>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="lg:hidden">
              <p className="isalwa-kicker">{t('app.name')}</p>
            </div>
          </div>
          <UserMenu displayLabel={displayLabel} />
        </header>

        {mobileOpen ? (
          <div
            id="mobile-nav"
            className="border-b border-[var(--isalwa-mist)] bg-white lg:hidden"
          >
            <AppNav
              showAdmin={showAdmin}
              capabilities={capabilities}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        ) : null}

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
