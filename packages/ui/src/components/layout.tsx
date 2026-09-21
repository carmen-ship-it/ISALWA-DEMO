import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type PageContainerProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  /** Accessible name for the main landmark */
  label?: string;
  /** Wider / unconstrained (maps, inbox workspaces) */
  bleed?: boolean;
};

/** Standard experience page chrome — Mission 11 `.isalwa-page` as a component. */
export function PageContainer({
  children,
  className,
  label,
  bleed,
  ...rest
}: PageContainerProps) {
  return (
    <main
      className={cx(bleed ? 'min-h-full' : 'isalwa-page', className)}
      aria-label={label}
      {...rest}
    >
      {children}
    </main>
  );
}

export type PageSectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  /** Wrap in Panel-like white card */
  card?: boolean;
  /**
   * Controlled operating surface when `card` is set.
   * ops = white · context = sky · active = teal · attention = amber
   */
  surface?: 'ops' | 'context' | 'active' | 'attention';
};

const SURFACE_BG: Record<NonNullable<PageSectionProps['surface']>, string> = {
  ops: 'bg-[var(--isalwa-surface-ops,var(--isalwa-white))]',
  context: 'bg-[var(--isalwa-surface-context,var(--isalwa-sky-100))]',
  active: 'bg-[var(--isalwa-surface-active,var(--isalwa-teal-100))]',
  attention:
    'bg-[var(--isalwa-status-amber-bg,var(--isalwa-surface-attention))]',
};

export function PageSection({ children, className, card, surface = 'ops', ...rest }: PageSectionProps) {
  return (
    <section
      className={cx(
        card &&
          cx(
            'overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] shadow-[var(--isalwa-shadow-card-resting)]',
            SURFACE_BG[surface],
          ),
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

export type SectionHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
  kicker?: string;
  className?: string;
};

export function SectionHeader({ title, action, kicker, className }: SectionHeaderProps) {
  return (
    <div className={cx('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      <div>
        {kicker ? <p className="isalwa-section-label mb-1">{kicker}</p> : null}
        {typeof title === 'string' ? (
          <h2 className="isalwa-section-label">{title}</h2>
        ) : (
          title
        )}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export type DashboardGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  cols?: 2 | 3 | 4;
};

export function DashboardGrid({ children, className, cols = 4, ...rest }: DashboardGridProps) {
  return (
    <div
      className={cx(
        'grid items-stretch gap-4',
        cols === 2 && 'sm:grid-cols-2',
        cols === 3 && 'grid-cols-1 sm:grid-cols-3',
        cols === 4 && 'sm:grid-cols-2 xl:grid-cols-4',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type ActionBarProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  sticky?: boolean;
};

export function ActionBar({ children, className, sticky, ...rest }: ActionBarProps) {
  return (
    <div
      className={cx(
        'flex flex-wrap items-center justify-between gap-3',
        sticky &&
          'sticky top-0 z-20 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-surface-ops,var(--isalwa-white))_92%,transparent)] px-4 py-3 shadow-[var(--isalwa-glass-light-edge)] backdrop-blur-md md:px-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
