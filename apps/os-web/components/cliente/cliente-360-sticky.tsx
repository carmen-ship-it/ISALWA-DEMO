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
    <div className="sticky top-14 z-20 -mx-1 mb-8 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-1 backdrop-blur-md">
      {children}
    </div>
  );
}
