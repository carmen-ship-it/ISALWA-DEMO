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
  /** Short example of what belongs here — teaches the empty surface */
  example?: ReactNode;
  /** Optional walkthrough / secondary help link */
  walkthrough?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  example,
  walkthrough,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'flex flex-col items-start gap-4 rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_70%,white)] p-6 md:p-8',
        className,
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] text-[var(--isalwa-glaze)]">
        <span aria-hidden className="text-lg">
          ◌
        </span>
      </div>
      <div>
        <p className="font-semibold text-[var(--isalwa-kiln)]">{title}</p>
        {description ? (
          <p className="mt-2 max-w-md text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
            {description}
          </p>
        ) : null}
        {example ? (
          <p className="mt-3 max-w-md rounded-[var(--isalwa-radius-control)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_6%,white)] px-3 py-2 text-[var(--isalwa-text-xs)] leading-relaxed text-[var(--isalwa-slate)]">
            <span className="font-semibold text-[var(--isalwa-glaze)]">Ejemplo · </span>
            {example}
          </p>
        ) : null}
      </div>
      {action}
      {walkthrough ? (
        <div className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{walkthrough}</div>
      ) : null}
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
    <header
      className={cx(
        'isalwa-enter mb-8 flex flex-wrap items-end justify-between gap-4 md:mb-10',
        className,
      )}
    >
      <div className="max-w-3xl">
        <p className="isalwa-kicker">{kicker}</p>
        <h1 className="isalwa-page-title mt-2">{title}</h1>
        {subtitle ? (
          <div className="mt-3 max-w-2xl text-[var(--isalwa-text-md)] leading-relaxed text-[var(--isalwa-slate)]">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
