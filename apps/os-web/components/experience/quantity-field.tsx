'use client';

import { formatBobDisplay, formatMoneyDisplay, parseQuantityDraft, quantityDisplayValue } from '@/lib/experience/format';

type QuantityFieldProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
  unit?: string;
  disabled?: boolean;
};

type BobAmountProps = {
  centavos: string | null | undefined;
  currency?: string;
};

/**
 * Use QuantityField for a caller-owned quantity and BobAmount to display an already-known centavo string.
 * Empty quantities stay empty, boliviano display does not convert other currencies, and formatBoliviaDate in @/lib/experience/format keeps a YYYY-MM-DD civil date on the America/La_Paz calendar instead of shifting it through UTC midnight.
 */
export function QuantityField({
  id,
  label,
  value,
  onChange,
  unit,
  disabled = false,
}: QuantityFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="isalwa-section-label">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          className="isalwa-field"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={quantityDisplayValue(value)}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw.trim() === '') {
              onChange(null);
              return;
            }
            const parsed = parseQuantityDraft(raw);
            if (parsed != null) onChange(parsed);
          }}
        />
        {unit ? <span className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{unit}</span> : null}
      </div>
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
