import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  interactive?: boolean;
};

export function Panel({ className, children, interactive, ...rest }: PanelProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)]',
        'shadow-[var(--isalwa-shadow-soft)]',
        'transition-[box-shadow,transform,border-color] duration-[var(--isalwa-motion-base)] ease-[var(--isalwa-ease-out)]',
        interactive &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--isalwa-glaze)_28%,var(--isalwa-mist))] hover:shadow-[var(--isalwa-shadow-lift)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
