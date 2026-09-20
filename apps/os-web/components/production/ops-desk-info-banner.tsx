import type { ReactNode } from 'react';

export type OpsDeskInfoColumn = {
  label: string;
  value: ReactNode;
};

type OpsDeskInfoBannerProps = {
  columns: readonly OpsDeskInfoColumn[];
  className?: string;
};

/**
 * One page-level boundary strip for operational desks — dense columns, not repeated cards.
 */
export function OpsDeskInfoBanner({ columns, className }: OpsDeskInfoBannerProps) {
  if (columns.length === 0) return null;
  return (
    <div
      className={[
        'mb-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-200)_32%,white)] px-4 py-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="note"
    >
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {columns.map((col) => (
          <div key={col.label}>
            <dt className="isalwa-section-label">{col.label}</dt>
            <dd className="mt-1 text-sm leading-snug text-[var(--isalwa-kiln)]">{col.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
