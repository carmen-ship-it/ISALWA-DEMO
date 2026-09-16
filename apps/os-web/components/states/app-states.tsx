'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, EmptyState, Skeleton, StatusPill } from '@isalwa/ui';
import { EndSessionButton } from '@/components/auth/end-session-button';
import {
  statusLabelForSemantic,
  statusToneForSemantic,
  type StatusSemantic,
} from '@/lib/a11y/status-vocabulary';
import { t } from '@/lib/i18n/es';

type AccessSemantic = StatusSemantic;

function AccessState({
  title,
  description,
  semantic,
  action,
}: {
  title: string;
  description: string;
  semantic: AccessSemantic;
  action?: ReactNode;
}) {
  const tone = statusToneForSemantic(semantic);
  const pill = statusLabelForSemantic(semantic);
  return (
    <div role="alert" className="w-full max-w-lg">
      <EmptyState
        title={title}
        description={description}
        action={
          <div className="flex flex-col items-start gap-4">
            <StatusPill tone={tone}>{pill}</StatusPill>
            {action}
          </div>
        }
      />
    </div>
  );
}

export function LoadingShell() {
  return (
    <div
      className="flex min-h-[40vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4"
      aria-live="polite"
      aria-busy="true"
      data-surface-state="loading-shell"
    >
      <p className="text-sm text-[var(--isalwa-slate)]">{t('states.loading')}</p>
      <div className="w-full space-y-3" aria-hidden>
        <Skeleton h={16} />
        <Skeleton h={16} className="max-w-xs" />
        <Skeleton h={16} className="max-w-sm" />
      </div>
    </div>
  );
}

export function SessionExpiredState() {
  return (
    <AccessState
      title={t('states.sessionExpired')}
      description={t('states.sessionExpiredDesc')}
      semantic="warn"
      action={<EndSessionButton reason="expired" label={t('states.goToLogin')} />}
    />
  );
}

export function AccessDeniedState() {
  return (
    <div role="status" className="w-full max-w-lg">
      <EmptyState
        title={t('states.accessDenied')}
        description={t('states.accessDeniedDesc')}
        action={
          <div className="flex flex-col items-start gap-4">
            <StatusPill tone="info">Sin permiso</StatusPill>
            <Link href="/inicio" className="inline-flex">
              <Button type="button" variant="primary">
                {t('nav.inicio')}
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}

export function AccountInactiveState() {
  return (
    <AccessState
      title={t('states.accountInactive')}
      description={t('states.accountInactiveDesc')}
      semantic="blocked"
      action={<EndSessionButton reason="revoked" label={t('states.goToLogin')} />}
    />
  );
}

export function ServiceUnavailableState({ onRetry }: { onRetry?: () => void }) {
  return (
    <AccessState
      title={t('states.serviceUnavailable')}
      description={t('states.serviceUnavailableDesc')}
      semantic="info"
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
      semantic="pending"
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
    <div className="rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-6 sm:p-8">
      <h2 className="isalwa-section-label">{title}</h2>
      <p className="mt-3 max-w-2xl text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
        {description}
      </p>
    </div>
  );
}
