import type { ReactNode } from 'react';

type CommercialStickyBarProps = {
  children: ReactNode;
  className?: string;
  /** Landmark for long forms (enviar / convertir). */
  id?: string;
};

/**
 * Sticky strip at the top of the shell scrollport.
 * Prefer this over ActionBar sticky top-0 so identity/actions stay visible
 * without inventing a second header offset (see `.isalwa-sticky-under-shell`).
 */
export function CommercialStickyBar({ children, className, id }: CommercialStickyBarProps) {
  return (
    <div
      id={id}
      className={[
        'isalwa-sticky-under-shell flex flex-wrap items-center justify-between gap-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-4 py-3 backdrop-blur-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
