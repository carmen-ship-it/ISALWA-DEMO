import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--isalwa-glaze)] text-[var(--isalwa-white)] hover:bg-[var(--isalwa-glaze-deep)] active:scale-[0.98]',
  secondary:
    'bg-[var(--isalwa-white)] text-[var(--isalwa-kiln)] border border-[var(--isalwa-mist)] hover:border-[var(--isalwa-glaze)] hover:bg-[var(--isalwa-porcelain)] active:scale-[0.98]',
  ghost: 'bg-transparent text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]',
};

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--isalwa-radius-control)] px-4 py-2 text-[var(--isalwa-text-md)] font-medium',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
        'disabled:opacity-50 disabled:pointer-events-none',
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
