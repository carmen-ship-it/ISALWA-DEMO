import type { HTMLAttributes, ReactNode } from 'react';

/**
 * Soft porcelain nest so white working cards lift off the page canvas.
 * Shared visual rhythm for Wave2 operational desks — no new palette.
 */
export const OPS_DESK_SURFACE_CLASS =
  'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_58%,white)] p-4 shadow-[var(--isalwa-shadow-soft)] md:p-6';

export const OPS_STICKY_ACTION_CLASS =
  'sticky bottom-0 z-10 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_94%,white)] backdrop-blur-md';

type OpsDeskSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function OpsDeskSurface({ children, className, ...rest }: OpsDeskSurfaceProps) {
  return (
    <div className={[OPS_DESK_SURFACE_CLASS, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}
