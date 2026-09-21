import type { ReactNode } from 'react';
import { cx } from '@isalwa/ui';

export type InicioVisualBandTone =
  | 'attention'
  | 'mi-dia'
  | 'commercial'
  | 'operations'
  | 'issues'
  | 'recent'
  | 'neutral';

const BAND_CLASS: Record<InicioVisualBandTone, string> = {
  attention:
    'border-[var(--isalwa-status-amber-2)] bg-[var(--isalwa-status-amber-bg)] shadow-[var(--isalwa-shadow-soft)]',
  'mi-dia':
    'border-[color-mix(in_srgb,var(--isalwa-kiln)_18%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-kiln)_8%,white)] shadow-[var(--isalwa-shadow-resting)]',
  commercial:
    'border-[var(--isalwa-glaze)] bg-[var(--isalwa-teal-100)] shadow-[var(--isalwa-shadow-soft)]',
  operations:
    'border-[var(--isalwa-sky)] bg-[var(--isalwa-sky)] shadow-[var(--isalwa-shadow-soft)]',
  issues:
    'border-[color-mix(in_srgb,var(--isalwa-danger)_28%,var(--isalwa-mist))] bg-[var(--isalwa-status-red-bg)] shadow-[var(--isalwa-shadow-soft)]',
  recent:
    'border-[var(--isalwa-mist)] bg-[var(--isalwa-sky-100)] shadow-[var(--isalwa-shadow-soft)]',
  neutral:
    'border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]',
};

type InicioVisualBandProps = {
  tone: InicioVisualBandTone;
  children: ReactNode;
  className?: string;
  label?: string;
};

/** Semantic filled band for Inicio — color is readable before text. */
export function InicioVisualBand({ tone, children, className, label }: InicioVisualBandProps) {
  return (
    <div
      className={cx(
        'min-w-0 rounded-[var(--isalwa-radius-panel)] border p-4 md:p-5',
        BAND_CLASS[tone],
        className,
      )}
      data-inicio-band={tone}
      aria-label={label}
    >
      {children}
    </div>
  );
}
