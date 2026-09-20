import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export type AttentionDotTone = 'urgent' | 'attention' | 'active' | 'neutral';

export type AttentionDotProps = Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label'> & {
  tone?: AttentionDotTone;
  /** Pulse for urgent, actionable items. Disabled when prefers-reduced-motion is set. */
  pulse?: boolean;
  'aria-label': string;
};

const toneBg: Record<AttentionDotTone, string> = {
  urgent: 'bg-[var(--isalwa-danger)]',
  attention: 'bg-[var(--isalwa-warning)]',
  active: 'bg-[var(--isalwa-glaze)]',
  neutral: 'bg-[var(--isalwa-slate)]',
};

export function AttentionDot({
  tone = 'attention',
  pulse = false,
  className,
  'aria-label': ariaLabel,
  ...rest
}: AttentionDotProps) {
  const shouldPulse = pulse && (tone === 'urgent' || tone === 'attention');

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      className={cx(
        'isalwa-attention-dot',
        toneBg[tone],
        shouldPulse && 'isalwa-attention-dot--pulse',
        className,
      )}
      {...rest}
    />
  );
}
