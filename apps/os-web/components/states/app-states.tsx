'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@isalwa/ui';
import { t } from '@/lib/i18n/es';

type StatePanelProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

function StatePanel({ title, description, action }: StatePanelProps) {
  return (
    <div
      className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-8 shadow-[var(--isalwa-shadow-soft)]"
      role="alert"
    >
      <h1 className="isalwa-page-title">{title}</h1>
      <p className="text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
        {description}
      </p>
      {action}
    </div>
  );
}

export function LoadingShell() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-live="polite" aria-busy="true">
      <p className="text-sm text-[var(--isalwa-slate)]">{t('states.loading')}</p>
    </div>
  );
}

export function SessionExpiredState() {
  return (
    <StatePanel
      title={t('states.sessionExpired')}
      description={t('states.sessionExpiredDesc')}
      action={
        <Link href="/login" className="inline-flex">
          <Button type="button" variant="primary">
            {t('states.goToLogin')}
          </Button>
        </Link>
      }
    />
  );
}

export function AccessDeniedState() {
  return (
    <StatePanel
      title={t('states.accessDenied')}
      description={t('states.accessDeniedDesc')}
      action={
        <Link href="/inicio" className="inline-flex">
          <Button type="button" variant="secondary">
            {t('nav.inicio')}
          </Button>
        </Link>
      }
    />
  );
}

export function AccountInactiveState() {
  return (
    <StatePanel
      title={t('states.accountInactive')}
      description={t('states.accountInactiveDesc')}
      action={
        <Link href="/login" className="inline-flex">
          <Button type="button" variant="primary">
            {t('states.goToLogin')}
          </Button>
        </Link>
      }
    />
  );
}

export function ServiceUnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <StatePanel
      title={t('states.serviceUnavailable')}
      description={t('states.serviceUnavailableDesc')}
      action={
        onRetry ? (
          <Button type="button" variant="secondary" onClick={onRetry}>
            {t('states.retry')}
          </Button>
        ) : (
          <Link href="/inicio" className="inline-flex">
            <Button type="button" variant="secondary">
              {t('nav.inicio')}
            </Button>
          </Link>
        )
      }
    />
  );
}

export function CapabilityLockedState({ message }: { message?: string }) {
  return (
    <StatePanel
      title={t('states.capabilityLocked')}
      description={message ?? t('states.capabilityLockedDesc')}
      action={
        <Link href="/inicio" className="inline-flex">
          <Button type="button" variant="secondary">
            {t('nav.inicio')}
          </Button>
        </Link>
      }
    />
  );
}

export function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-8">
      <h2 className="isalwa-section-label">{title}</h2>
      <p className="mt-3 max-w-2xl text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
        {description}
      </p>
    </div>
  );
}
