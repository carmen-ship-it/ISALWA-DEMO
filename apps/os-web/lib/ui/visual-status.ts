/**
 * Visual separation helpers for Cliente360 + Compromisos.
 * Prefer existing @isalwa/ui tokens; constitution accents map to kiln/glaze/surface mixes.
 *
 * Color constitution (prefer tokens when present):
 * - navy primary ≈ --isalwa-kiln (#18324b ≈ #12324A)
 * - teal tabs ≈ --isalwa-glaze (#287a78 ≈ #2C8C88)
 * - soft teal selected ≈ --isalwa-surface-active / --isalwa-teal-100 (≈ #EAF6F4)
 * - soft green completed ≈ success mix (≈ #E7F4EC)
 * - amber pending ≈ warning mix
 * - soft red overdue ≈ danger mix (≈ #FBE9E7)
 */

export type VisualStatusTone = 'selected' | 'completed' | 'pending' | 'overdue' | 'neutral';

export const visualStatusSurfaceClass: Record<VisualStatusTone, string> = {
  selected: 'bg-[var(--isalwa-surface-active)] text-[var(--isalwa-glaze)]',
  completed:
    'bg-[color-mix(in_srgb,var(--isalwa-success)_12%,white)] text-[var(--isalwa-success)]',
  pending:
    'bg-[color-mix(in_srgb,var(--isalwa-warning)_12%,white)] text-[var(--isalwa-warning)]',
  overdue:
    'bg-[color-mix(in_srgb,var(--isalwa-danger)_10%,white)] text-[var(--isalwa-danger)]',
  neutral: 'bg-[var(--isalwa-mist)] text-[var(--isalwa-slate)]',
};

/** Tab chrome — inactive vs selected (soft teal active operational). */
export const clienteTabInactiveClass =
  'inline-flex h-11 items-center rounded-t-[var(--isalwa-radius-control)] border-b-2 border-transparent px-3.5 text-sm text-[var(--isalwa-slate)] outline-none hover:bg-[color-mix(in_srgb,var(--isalwa-teal-100)_55%,transparent)] hover:text-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export const clienteTabActiveClass =
  'inline-flex h-11 items-center rounded-t-[var(--isalwa-radius-control)] border-b-2 border-[var(--isalwa-glaze)] border-l-[3px] border-l-[var(--isalwa-glaze-deep)] bg-[var(--isalwa-surface-active)] px-3.5 text-sm font-semibold text-[var(--isalwa-glaze-deep)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** White work surface on porcelain canvas. */
export const deskPanelClass =
  'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-surface-ops,var(--isalwa-white))] shadow-[var(--isalwa-shadow-card-resting)]';

/** Sky contextual help link (not primary navy, not teal ops). */
export const helpLinkClass =
  'text-sm font-medium text-[var(--isalwa-info)] underline-offset-4 hover:underline';
