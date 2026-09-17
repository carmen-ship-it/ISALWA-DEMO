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
    'border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-tint-amber)] shadow-[var(--isalwa-shadow-soft)]',
  'mi-dia':
    'border-[color-mix(in_srgb,var(--isalwa-kiln)_18%,var(--isalwa-mist))] bg-white shadow-[var(--isalwa-shadow-resting)]',
  commercial:
    'border-[var(--isalwa-tint-teal-border)] bg-[color-mix(in_srgb,var(--isalwa-teal-100)_75%,white)] shadow-[var(--isalwa-shadow-soft)]',
  operations:
    'border-[color-mix(in_srgb,var(--isalwa-sky-200)_80%,var(--isalwa-mist))] bg-[color-mix(in_srgb,var(--isalwa-sky-100)_85%,white)] shadow-[var(--isalwa-shadow-soft)]',
  issues:
    'border-[var(--isalwa-tint-red-border)] bg-[var(--isalwa-tint-red)] shadow-[var(--isalwa-shadow-soft)]',
  recent:
    'border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] shadow-[var(--isalwa-shadow-soft)]',
  neutral:
    'border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-resting)]',
};

type InicioVisualBandProps = {
  tone: InicioVisualBandTone;
  children: ReactNode;
  className?: string;
  label?: string;
};

/** Semantic band chrome for Inicio sections — color communicates meaning. */
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
