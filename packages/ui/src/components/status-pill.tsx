import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
};

const tones = {
  neutral: 'bg-[var(--isalwa-mist)] text-[var(--isalwa-slate)]',
  success: 'bg-[color-mix(in_srgb,var(--isalwa-success)_12%,white)] text-[var(--isalwa-success)]',
  warning: 'bg-[color-mix(in_srgb,var(--isalwa-warning)_12%,white)] text-[var(--isalwa-warning)]',
  danger: 'bg-[color-mix(in_srgb,var(--isalwa-danger)_10%,white)] text-[var(--isalwa-danger)]',
  info: 'bg-[color-mix(in_srgb,var(--isalwa-info)_10%,white)] text-[var(--isalwa-info)]',
} as const;

export function StatusPill({ tone = 'neutral', className, children, ...rest }: StatusPillProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-[var(--isalwa-radius-control)] px-2.5 py-1',
        'text-[var(--isalwa-text-2xs)] font-medium tracking-[0.02em]',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
