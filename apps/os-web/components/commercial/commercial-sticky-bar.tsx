import type { ReactNode } from 'react';

type CommercialStickyBarProps = {
  children: ReactNode;
  className?: string;
  /** Landmark for long forms (enviar / convertir). */
  id?: string;
};

/**
 * Sticky strip under the shell header. Prefer this over ActionBar sticky top-0
 * so identity/actions stay visible below the global chrome.
 */
export function CommercialStickyBar({ children, className, id }: CommercialStickyBarProps) {
  return (
    <div
      id={id}
      className={[
        'sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-4 py-3 backdrop-blur-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
