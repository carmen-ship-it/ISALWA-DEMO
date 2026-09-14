'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, EmptyState, StatusPill } from '@isalwa/ui';
import { EndSessionButton } from '@/components/auth/end-session-button';
import { t } from '@/lib/i18n/es';

type AccessTone = 'warning' | 'info' | 'neutral';

function AccessState({
  title,
  description,
  tone,
  action,
}: {
  title: string;
  description: string;
  tone: AccessTone;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="w-full max-w-lg">
      <EmptyState
        title={title}
        description={description}
        action={
          <div className="flex flex-col items-start gap-4">
            <StatusPill tone={tone}>{title}</StatusPill>
            {action}
          </div>
        }
      />
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
    <AccessState
      title={t('states.sessionExpired')}
      description={t('states.sessionExpiredDesc')}
      tone="warning"
      action={<EndSessionButton reason="expired" label={t('states.goToLogin')} />}
    />
  );
}

export function AccessDeniedState() {
  return (
    <AccessState
      title={t('states.accessDenied')}
      description={t('states.accessDeniedDesc')}
      tone="neutral"
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
    <AccessState
      title={t('states.accountInactive')}
      description={t('states.accountInactiveDesc')}
      tone="neutral"
      action={<EndSessionButton reason="revoked" label={t('states.goToLogin')} />}
    />
  );
}

export function ServiceUnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <AccessState
      title={t('states.serviceUnavailable')}
      description={t('states.serviceUnavailableDesc')}
      tone="info"
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
    <AccessState
      title={t('states.capabilityLocked')}
      description={message ?? t('states.capabilityLockedDesc')}
      tone="neutral"
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
