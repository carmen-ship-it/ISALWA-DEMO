import type { ReactNode } from 'react';

type Cliente360StickyProps = {
  children: ReactNode;
};

/**
 * Keeps customer identity, primary actions, and section nav visible while scrolling Cliente 360.
 * Sits under the shell header (top-14).
 */
export function Cliente360Sticky({ children }: Cliente360StickyProps) {
  return (
    <div className="sticky top-14 z-20 -mx-1 mb-8 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_94%,white)] px-3 shadow-[var(--isalwa-shadow-soft)] backdrop-blur-md md:px-4">
      {children}
    </div>
  );
}
