import type { ReactNode } from 'react';

type Cliente360StickyProps = {
  children: ReactNode;
};

/**
 * White ops command chrome on porcelain canvas — identity, next step, tabs.
 * Sticks to the top of the shell scrollport (`.isalwa-sticky-under-shell`).
 * Porcelain stays page canvas only.
 */
export function Cliente360Sticky({ children }: Cliente360StickyProps) {
  return (
    <div
      id="cliente360-command"
      className="isalwa-sticky-under-shell -mx-1 mb-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-surface-ops)_92%,transparent)] px-3 shadow-[var(--isalwa-shadow-card-resting)] backdrop-blur-md md:mb-5 md:px-4"
    >
      {children}
    </div>
  );
}
