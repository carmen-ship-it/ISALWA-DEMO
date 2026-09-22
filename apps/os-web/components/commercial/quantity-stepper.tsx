'use client';

import { Button, cx } from '@isalwa/ui';

type QuantityStepperProps = {
  id: string;
  name?: string;
  value: string;
  onChange: (next: string) => void;
  min?: number;
  className?: string;
  'aria-label'?: string;
};

function parseQuantity(raw: string, min: number): number {
  const parsed = Number.parseInt(raw.replace(/[^\d]/g, ''), 10);
  if (!Number.isFinite(parsed) || parsed < min) return min;
  return parsed;
}

/** Quoted quantity only. Never stock, produced, purchased, or delivered. */
export function QuantityStepper({
  id,
  name,
  value,
  onChange,
  min = 1,
  className,
  'aria-label': ariaLabel = 'Cantidad cotizada',
}: QuantityStepperProps) {
  const current = parseQuantity(value, min);

  function setQuantity(next: number) {
    onChange(String(Math.max(min, next)));
  }

  return (
    <div
      className={cx(
        'inline-flex items-center gap-1 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white p-1',
        className,
      )}
      role="group"
      aria-label={ariaLabel}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-11 w-11 shrink-0 px-0 sm:h-8 sm:w-8"
        aria-label="Disminuir cantidad"
        onClick={() => setQuantity(current - 1)}
        disabled={current <= min}
      >
        −
      </Button>
      <input
        id={id}
        name={name}
        inputMode="numeric"
        required
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d]/g, '');
          if (digits === '') {
            onChange('');
            return;
          }
          onChange(String(Math.max(min, Number.parseInt(digits, 10) || min)));
        }}
        onBlur={() => {
          if (!value.trim()) onChange(String(min));
          else onChange(String(parseQuantity(value, min)));
        }}
        className="h-11 w-14 border-0 bg-transparent text-center text-sm font-medium text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] sm:h-8 sm:w-12"
      />
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-11 w-11 shrink-0 px-0 sm:h-8 sm:w-8"
        aria-label="Aumentar cantidad"
        onClick={() => setQuantity(current + 1)}
      >
        +
      </Button>
    </div>
  );
}
