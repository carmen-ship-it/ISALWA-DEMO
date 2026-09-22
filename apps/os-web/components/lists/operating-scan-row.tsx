import Link from 'next/link';
import { cx, type OperatingRowDensity } from '@isalwa/ui';
import type { ReactNode } from 'react';
import '@/components/lists/operating-scan.css';

export type OperatingScanField = {
  id: string;
  label: string;
  value: ReactNode;
  /** Hide labeled field on narrow viewports (title/status stay visible). */
  hideOnMobile?: boolean;
};

export type OperatingScanRowProps = {
  href: string;
  title: ReactNode;
  fields: OperatingScanField[];
  status?: ReactNode;
  actionLabel?: string;
  /** Navy next action, shown before the outlined row link. */
  primaryAction?: ReactNode;
  /** Extra controls beside the primary CTA (e.g. OverflowMenu). */
  secondaryActions?: ReactNode;
  density?: OperatingRowDensity;
  selected?: boolean;
  /** Tailwind grid template for md+ (include gap / col classes). */
  desktopGridClassName?: string;
  className?: string;
};

const actionLinkClass =
  'isalwa-scan-row-action isalwa-t-fast inline-flex h-11 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)] sm:h-8';

/**
 * Operating list row with labeled scan zones — stacked card on phone, column grid on md+.
 * Identity is strongest. Metadata is quiet. Status is a chip. Action is isolated.
 */
export function OperatingScanRow({
  href,
  title,
  fields,
  status,
  actionLabel = 'Abrir',
  primaryAction,
  secondaryActions,
  density = 'compact',
  selected = false,
  desktopGridClassName = 'md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto_auto]',
  className,
}: OperatingScanRowProps) {
  const visibleFields = fields.filter((field) => field.value != null && field.value !== '');

  return (
    <div
      data-selected={selected ? 'true' : undefined}
      data-density={density}
      className={cx(
        'isalwa-operating-scan-row border-b border-[color-mix(in_srgb,var(--isalwa-mist)_80%,white)] px-3 last:border-b-0',
        density === 'comfortable' ? 'py-3' : 'py-2',
        selected && 'bg-[var(--isalwa-teal-100)]',
        className,
      )}
    >
      <div
        className={cx(
          'flex flex-col gap-2 md:grid md:items-center md:gap-x-3 md:gap-y-0',
          desktopGridClassName,
        )}
      >
        <div className="min-w-0 md:col-span-1">
          <Link
            href={href}
            title={typeof title === 'string' ? title : undefined}
            className="isalwa-scan-row-identity isalwa-t-fast block break-words text-[0.9375rem] font-semibold leading-5 text-[var(--isalwa-kiln)] outline-none line-clamp-2 hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          >
            {title}
          </Link>
        </div>

        {visibleFields.map((field) => (
          <div
            key={field.id}
            className={cx(
              'isalwa-scan-row-meta min-w-0 text-xs leading-4',
              field.hideOnMobile ? 'hidden md:block' : 'grid grid-cols-[auto_1fr] gap-x-2 md:block',
            )}
          >
            <span className="font-semibold tracking-[0.06em] text-[var(--isalwa-slate)] uppercase md:sr-only">
              {field.label}
            </span>
            <span
              className="line-clamp-2 break-words text-[var(--isalwa-slate)] md:mt-0"
              title={typeof field.value === 'string' ? field.value : undefined}
            >
              {field.value}
            </span>
          </div>
        ))}

        {status !== undefined && status !== null ? (
          <div className="isalwa-scan-row-status flex min-h-8 min-w-0 shrink-0 items-center md:min-w-[7rem] md:justify-end">
            {status}
          </div>
        ) : null}

        <div className="isalwa-scan-row-actions flex min-w-0 shrink-0 flex-wrap items-center gap-2 md:min-w-[10rem] md:flex-nowrap md:justify-end md:border-l md:border-[var(--isalwa-mist)] md:pl-3">
          {primaryAction}
          {secondaryActions}
          <Link href={href} className={actionLinkClass} data-scan-row-open="">
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function OperatingScanListHeader({
  columns,
  className,
}: {
  columns: Array<{ id: string; label: string; className?: string }>;
  className?: string;
}) {
  return (
    <div
      role="row"
      className={cx(
        'isalwa-operating-scan-header isalwa-sticky-under-shell hidden border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky)_28%,var(--isalwa-porcelain))] px-3 py-2 backdrop-blur-md md:grid md:items-center md:gap-x-3',
        className,
      )}
    >
      {columns.map((column) => (
        <span
          key={column.id}
          role="columnheader"
          className={cx(
            'text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase',
            column.className,
          )}
        >
          {column.label}
        </span>
      ))}
    </div>
  );
}
