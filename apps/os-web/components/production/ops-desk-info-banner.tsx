import type { ReactNode } from 'react';
import { StatusPill } from '@isalwa/ui';

export type OpsDeskInfoColumn = {
  label: string;
  value: ReactNode;
};

type OpsDeskInfoBannerProps = {
  columns: readonly OpsDeskInfoColumn[];
  className?: string;
  /** columns — default three-up strip; compact-chips — lead copy + short boundary chips. */
  presentation?: 'columns' | 'compact-chips';
};

/**
 * One page-level boundary strip for operational desks — dense columns, not repeated cards.
 */
export function OpsDeskInfoBanner({ columns, className, presentation = 'columns' }: OpsDeskInfoBannerProps) {
  if (columns.length === 0) return null;
  if (presentation === 'compact-chips') {
    const [primary, ...chips] = columns;
    if (!primary) return null;
    return (
      <div
        className={[
          'mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-sky)] bg-[color-mix(in_srgb,var(--isalwa-sky)_45%,white)] px-4 py-2',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="note"
      >
        <div className="min-w-[12rem] flex-1">
          <p className="isalwa-section-label">{primary.label}</p>
          <p className="mt-0.5 text-sm leading-snug text-[var(--isalwa-kiln)]">{primary.value}</p>
        </div>
        {chips.map((col) => (
          <StatusPill
            key={col.label}
            tone={col.label.toLowerCase().includes('stock') ? 'neutral' : 'info'}
            icon="none"
          >
            {col.label}
          </StatusPill>
        ))}
      </div>
    );
  }

  return (
    <div
      className={[
        'mb-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-sky)] bg-[color-mix(in_srgb,var(--isalwa-sky)_45%,white)] px-4 py-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="note"
    >
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {columns.map((col, index) => (
          <div key={col.label} className={index === 0 ? 'min-w-[12rem] flex-1' : 'max-w-xs'}>
            <dt className="isalwa-section-label">{col.label}</dt>
            <dd className="mt-0.5 text-sm leading-snug text-[var(--isalwa-kiln)]">{col.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
