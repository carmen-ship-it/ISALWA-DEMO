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
    'border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-status-amber-2)] bg-white shadow-[var(--isalwa-shadow-soft)]',
  'mi-dia':
    'border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-kiln)] bg-white shadow-[var(--isalwa-shadow-resting)]',
  commercial:
    'border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-glaze)] bg-white shadow-[var(--isalwa-shadow-soft)]',
  operations:
    'border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-sky)] bg-white shadow-[var(--isalwa-shadow-soft)]',
  issues:
    'border-[var(--isalwa-mist)] border-l-4 border-l-[var(--isalwa-danger)] bg-white shadow-[var(--isalwa-shadow-soft)]',
  recent:
    'border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-soft)]',
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
