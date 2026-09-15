import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const styles: Record<Variant, string> = {
  primary:
    'bg-[var(--isalwa-btn-primary-bg)] text-[var(--isalwa-btn-primary-fg)] hover:bg-[var(--isalwa-btn-primary-bg-hover)] active:scale-[0.98]',
  secondary:
    'bg-[var(--isalwa-btn-secondary-bg)] text-[var(--isalwa-btn-secondary-fg)] border border-[var(--isalwa-btn-secondary-border)] hover:border-[var(--isalwa-btn-secondary-border-hover)] hover:bg-[var(--isalwa-btn-secondary-bg-hover)] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[var(--isalwa-slate)] hover:text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)] active:scale-[0.98]',
  danger:
    'bg-[color-mix(in_srgb,var(--isalwa-danger)_12%,white)] text-[var(--isalwa-danger)] border border-[color-mix(in_srgb,var(--isalwa-danger)_22%,var(--isalwa-mist))] hover:bg-[color-mix(in_srgb,var(--isalwa-danger)_18%,white)] active:scale-[0.98]',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[var(--isalwa-text-sm)]',
  md: 'h-10 px-4 text-[var(--isalwa-text-md)]',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[var(--isalwa-radius-control)] font-medium cursor-pointer',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)]',
        'focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
        'disabled:opacity-45 disabled:pointer-events-none',
        sizes[size],
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
