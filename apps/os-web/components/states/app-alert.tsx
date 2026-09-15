'use client';

import type { ReactNode } from 'react';
import { StatusPill, cx } from '@isalwa/ui';
import {
  statusLabelForSemantic,
  statusToneForSemantic,
  type StatusSemantic,
} from '@/lib/a11y/status-vocabulary';

export type AppAlertVariant = Extract<
  StatusSemantic,
  'info' | 'warn' | 'blocked' | 'manual' | 'pending'
>;

export type AppAlertProps = {
  variant: AppAlertVariant;
  title: string;
  detail?: string;
  /** Override the default vocabulary pill label. */
  pillLabel?: string;
  action?: ReactNode;
  className?: string;
};

const variantSurface: Record<AppAlertVariant, string> = {
  info: 'border-[var(--isalwa-tint-blue-border)] bg-[var(--isalwa-tint-blue)]',
  warn: 'border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-tint-amber)]',
  blocked: 'border-[var(--isalwa-tint-red-border)] bg-[var(--isalwa-tint-red)]',
  manual: 'border-[color-mix(in_srgb,var(--isalwa-copper)_22%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-copper)_10%,white)]',
  pending: 'border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)]',
};

/**
 * Semantic alert for info / warn / blocked / manual / pending.
 * Uses role=alert for blocked and warn; status for the quieter variants.
 */
export function AppAlert({
  variant,
  title,
  detail,
  pillLabel,
  action,
  className,
}: AppAlertProps) {
  const tone = statusToneForSemantic(variant);
  const label = pillLabel ?? statusLabelForSemantic(variant);
  const assertive = variant === 'blocked' || variant === 'warn';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      data-alert-variant={variant}
      className={cx(
        'w-full max-w-xl rounded-[var(--isalwa-radius-panel)] border px-4 py-3',
        variantSurface[variant],
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={tone}>{label}</StatusPill>
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{title}</p>
      </div>
      {detail ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{detail}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
