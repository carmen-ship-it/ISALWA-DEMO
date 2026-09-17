import { StatusPill } from '@isalwa/ui';
import {
  CERTAINTY_DEFINITION,
  certaintyBadgeLabel,
  certaintyLabel,
  certaintyTone,
  type CertaintyState,
} from '@/lib/certainty';

type CertaintyBadgeProps = {
  state: CertaintyState;
  /** Use compact Confirmado / Pendiente de confirmar labels. */
  compact?: boolean;
  className?: string;
};

export function CertaintyBadge({ state, compact = false, className }: CertaintyBadgeProps) {
  const label =
    compact && (state === 'confirmed' || state === 'pending')
      ? certaintyBadgeLabel(state)
      : certaintyLabel(state);
  return (
    <StatusPill
      tone={certaintyTone(state)}
      className={className}
      title={CERTAINTY_DEFINITION[state]}
      data-certainty={state}
    >
      {label}
    </StatusPill>
  );
}
