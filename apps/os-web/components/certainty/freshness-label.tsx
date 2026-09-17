import {
  formatFreshnessWording,
  mayRequireConfirmation,
  type FreshnessMayRequireReason,
} from '@/lib/certainty';

type FreshnessLabelProps = {
  updatedAt: string | Date | null | undefined;
  asOf?: Date;
  preferAbsolute?: boolean;
  mayRequire?: FreshnessMayRequireReason | null;
  className?: string;
};

export function FreshnessLabel({
  updatedAt,
  asOf,
  preferAbsolute,
  mayRequire = null,
  className,
}: FreshnessLabelProps) {
  const wording = formatFreshnessWording({ updatedAt, asOf, preferAbsolute });
  const caution = mayRequireConfirmation(mayRequire);
  if (!wording && !caution) return null;
  return (
    <p
      className={className ?? 'text-sm text-[var(--isalwa-slate)]'}
      data-freshness={wording ? 'present' : 'none'}
      data-may-require={caution ? 'yes' : 'no'}
    >
      {wording}
      {wording && caution ? ' · ' : null}
      {caution}
    </p>
  );
}
