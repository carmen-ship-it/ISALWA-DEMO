import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Approximate height in px */
  h?: number;
  rounded?: 'control' | 'panel' | 'pill';
};

export function Skeleton({ h = 16, rounded = 'control', className, ...rest }: SkeletonProps) {
  return (
    <div
      className={cx(
        'isalwa-skeleton',
        rounded === 'panel' && 'rounded-[var(--isalwa-radius-panel)]',
        rounded === 'control' && 'rounded-[var(--isalwa-radius-control)]',
        rounded === 'pill' && 'rounded-[var(--isalwa-radius-pill)]',
        className,
      )}
      style={{ height: h }}
      aria-hidden
      {...rest}
    />
  );
}

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-start gap-3 rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-6',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--isalwa-glaze)_12%,white)] text-[var(--isalwa-glaze)]">
        <span aria-hidden className="text-lg">
          ◌
        </span>
      </div>
      <div>
        <p className="font-semibold text-[var(--isalwa-kiln)]">{title}</p>
        {description ? (
          <p className="mt-1 max-w-md text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export type ExperienceHeaderProps = {
  kicker: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function ExperienceHeader({
  kicker,
  title,
  subtitle,
  actions,
  className,
}: ExperienceHeaderProps) {
  return (
    <header className={cx('isalwa-enter mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-3xl">
        <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.14em] text-[var(--isalwa-glaze)] uppercase">
          {kicker}
        </p>
        <h1
          className="mt-2 text-[var(--isalwa-text-2xl)] leading-[1.15] text-[var(--isalwa-kiln)] md:text-[var(--isalwa-text-3xl)]"
          style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', fontWeight: 400, letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
        {subtitle ? (
          <div className="mt-3 text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
