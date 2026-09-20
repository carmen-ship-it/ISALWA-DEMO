import Link from 'next/link';
import { cx, type OperatingRowDensity } from '@isalwa/ui';
import type { ReactNode } from 'react';

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
  /** Extra controls beside the primary CTA (e.g. OverflowMenu). */
  secondaryActions?: ReactNode;
  density?: OperatingRowDensity;
  selected?: boolean;
  /** Tailwind grid template for md+ (include gap / col classes). */
  desktopGridClassName?: string;
  className?: string;
};

const actionLinkClass =
  'isalwa-t-fast inline-flex h-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-kiln)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/**
 * Operating list row with labeled scan zones — stacked card on phone, column grid on md+.
 */
export function OperatingScanRow({
  href,
  title,
  fields,
  status,
  actionLabel = 'Abrir',
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
        density === 'comfortable' ? 'py-3' : 'py-2.5',
        selected && 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,white)]',
        className,
      )}
    >
      <div
        className={cx(
          'flex flex-col gap-2.5 md:grid md:items-center md:gap-x-3 md:gap-y-0',
          desktopGridClassName,
        )}
      >
        <div className="min-w-0 md:col-span-1">
          <Link
            href={href}
            title={typeof title === 'string' ? title : undefined}
            className="isalwa-t-fast block break-words text-sm font-medium leading-5 text-[var(--isalwa-kiln)] outline-none hover:text-[var(--isalwa-glaze-deep)] focus-visible:shadow-[var(--isalwa-shadow-focus)] md:truncate"
          >
            {title}
          </Link>
        </div>

        {visibleFields.map((field) => (
          <div
            key={field.id}
            className={cx(
              'min-w-0 text-xs leading-4',
              field.hideOnMobile ? 'hidden md:block' : 'grid grid-cols-[auto_1fr] gap-x-2 md:block',
            )}
          >
            <span className="font-semibold tracking-[0.06em] text-[var(--isalwa-slate)] uppercase md:mb-0.5 md:block md:text-[10px] md:tracking-[0.1em]">
              {field.label}
            </span>
            <span
              className="truncate text-[var(--isalwa-kiln)] md:mt-0.5 md:block"
              title={typeof field.value === 'string' ? field.value : undefined}
            >
              {field.value}
            </span>
          </div>
        ))}

        {status ? <div className="flex shrink-0 items-center md:justify-end">{status}</div> : null}

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
          <Link href={href} className={actionLinkClass}>
            {actionLabel}
          </Link>
          {secondaryActions}
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
        'isalwa-sticky-under-shell hidden border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-3 py-2 backdrop-blur-md md:grid md:items-center md:gap-x-3',
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
