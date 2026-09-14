'use client';

import { Button } from '@isalwa/ui';
import { QUANTITY_FIELD_COPY, formatBobDisplay, formatMoneyDisplay, parseQuantityDraft, quantityDisplayValue, stepQuantity } from '@/lib/experience/format';
import { fieldAccessReason, resolveFieldAccess, type FieldAccess } from '@/lib/experience/work-state';

type QuantityFieldProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  unit?: string;
  disabled?: boolean;
  access?: FieldAccess;
  disabledReason?: string;
  min?: number;
  max?: number;
};

type BobAmountProps = {
  centavos: string | null | undefined;
  currency?: string;
};

/**
 * Use QuantityField for a caller-owned integer quantity and BobAmount to display an already-known centavo string.
 * Empty quantities stay empty. Decrementing an empty field does not invent 0. The step buttons stay visible; they are not hover-only.
 * Boliviano display does not convert other currencies, and formatBoliviaDate in @/lib/experience/format keeps a YYYY-MM-DD civil date on the America/La_Paz calendar instead of shifting it through UTC midnight.
 */
export function QuantityField({
  id,
  label,
  value,
  onChange,
  unit,
  disabled = false,
  access = 'enabled',
  disabledReason,
  min,
  max,
}: QuantityFieldProps) {
  const resolvedAccess = resolveFieldAccess(disabled, access);
  const locked = resolvedAccess !== 'enabled';
  const hintId = `${id}-hint`;
  const unitId = `${id}-unit`;
  const describedBy = [unit ? unitId : null, hintId].filter(Boolean).join(' ');
  const lockCopy = fieldAccessReason(resolvedAccess, disabledReason, {
    disabled: QUANTITY_FIELD_COPY.disabled,
    permission: QUANTITY_FIELD_COPY.permission,
  });
  const hint =
    lockCopy ??
    (value == null ? QUANTITY_FIELD_COPY.empty : null);

  function step(direction: 'up' | 'down') {
    if (locked) return;
    onChange(stepQuantity(value, direction, { min, max }));
  }

  return (
    <div>
      <label htmlFor={id} className="isalwa-section-label">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={locked || value == null || value <= (min ?? 0)}
          aria-label={QUANTITY_FIELD_COPY.decrease}
          onClick={() => step('down')}
        >
          −
        </Button>
        <input
          id={id}
          className="isalwa-field"
          inputMode="numeric"
          autoComplete="off"
          disabled={locked}
          aria-disabled={locked}
          aria-describedby={describedBy}
          value={quantityDisplayValue(value)}
          onChange={(event) => {
            if (locked) return;
            const raw = event.target.value;
            if (raw.trim() === '') {
              onChange(null);
              return;
            }
            const parsed = parseQuantityDraft(raw);
            if (parsed != null) onChange(parsed);
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={
            locked ||
            (max != null && (value == null ? Math.max(min ?? 0, 1) > max : value >= max))
          }
          aria-label={QUANTITY_FIELD_COPY.increase}
          onClick={() => step('up')}
        >
          +
        </Button>
        {unit ? (
          <span id={unitId} className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
            {unit}
          </span>
        ) : null}
      </div>
      <p
        id={hintId}
        role={resolvedAccess === 'permission-denied' ? 'alert' : 'status'}
        className="mt-1 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]"
      >
        {hint ?? '\u00a0'}
      </p>
    </div>
  );
}

/** Displays caller-supplied centavos. Missing input renders a dash, not a fabricated zero. */
export function BobAmount({ centavos, currency = 'BOB' }: BobAmountProps) {
  if (centavos == null || centavos.trim() === '') {
    return <span className="text-[var(--isalwa-slate)]">—</span>;
  }

  const text = currency === 'BOB' ? formatBobDisplay(centavos) : formatMoneyDisplay(centavos, currency);
  return <span className="isalwa-metric text-[var(--isalwa-text-md)] text-[var(--isalwa-kiln)]">{text}</span>;
}
