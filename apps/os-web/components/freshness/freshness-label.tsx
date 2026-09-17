import {
  formatFreshnessDisplay,
  MAY_NEED_CONFIRMATION_COPY,
} from '@/lib/freshness/display';

type FreshnessLabelProps = {
  lastUpdatedIso: string | null | undefined;
  asOf?: Date;
  mayNeedConfirmation?: boolean;
  className?: string;
};

/** Compact freshness line for surfaces that already have a known update instant. */
export function FreshnessLabel({
  lastUpdatedIso,
  asOf,
  mayNeedConfirmation = false,
  className,
}: FreshnessLabelProps) {
  const display = formatFreshnessDisplay(lastUpdatedIso, { asOf, mayNeedConfirmation });
  if (!display) return null;

  return (
    <p
      className={className ?? 'text-xs text-[var(--isalwa-slate)]'}
      title={display.absoluteLabel ?? undefined}
      data-freshness-label={display.label}
    >
      {display.label}
      {display.mayNeedConfirmation ? (
        <span className="mt-0.5 block text-[var(--isalwa-tint-amber-ink)]">
          {MAY_NEED_CONFIRMATION_COPY}
        </span>
      ) : null}
    </p>
  );
}
