import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Panel({ className, children, ...rest }: PanelProps) {
  return (
    <div
      className={cx(
        'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)]',
        'shadow-[var(--isalwa-shadow-soft)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
