/**
 * Commercial desk presentation tokens.
 * Class strings live here so Tailwind emits utilities used by @isalwa/ui Button /
 * StatusPill on commercial routes (package source is outside default content paths).
 */

/** Navy filled primary — same recipe as Trabajo ListSearchForm Buscar. */
export const commercialPrimaryButtonClass =
  'isalwa-t-fast inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-kiln)] bg-[var(--isalwa-kiln)] px-4 text-sm font-medium text-white outline-none hover:opacity-95 focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** Primary action rendered as an anchor (Nueva oportunidad, Agregar cliente). */
export const commercialPrimaryLinkClass =
  'isalwa-action-link isalwa-t-fast inline-flex h-10 items-center justify-center rounded-[var(--isalwa-radius-control)] px-4 text-sm font-medium focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** Soft porcelain page canvas behind white work surfaces. */
export const commercialPageCanvasClass =
  'min-w-0 !max-w-none bg-[color-mix(in_srgb,var(--isalwa-porcelain)_78%,var(--isalwa-mist))] px-0';

/** Constrains content after full-bleed canvas. */
export const commercialPageInnerClass =
  'mx-auto w-full max-w-[var(--isalwa-page-max)] px-4 pb-12 pt-6 md:px-6 md:pt-8';

/** White list / filter desk on porcelain. */
export const commercialWorkSurfaceClass =
  'overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] shadow-[var(--isalwa-shadow-soft)]';

/** Search + filter strip (Trabajo toolbar parity). */
export const commercialToolbarClass =
  'mb-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-3 shadow-[var(--isalwa-shadow-soft)] sm:p-4';

/**
 * Bridge: keep @isalwa/ui StatusPill / Button primary utilities in the CSS bundle
 * for Activo and other commercial status chips.
 */
export const commercialUiClassBridge = [
  'bg-[var(--isalwa-action)]',
  'text-[var(--isalwa-white)]',
  'hover:bg-[var(--isalwa-action-deep)]',
  'bg-[var(--isalwa-mist)]',
  'text-[var(--isalwa-slate)]',
  'bg-[color-mix(in_srgb,var(--isalwa-success)_12%,white)]',
  'text-[var(--isalwa-success)]',
  'bg-[color-mix(in_srgb,var(--isalwa-warning)_12%,white)]',
  'text-[var(--isalwa-warning)]',
  'bg-[color-mix(in_srgb,var(--isalwa-danger)_10%,white)]',
  'text-[var(--isalwa-danger)]',
  'bg-[color-mix(in_srgb,var(--isalwa-info)_10%,white)]',
  'text-[var(--isalwa-info)]',
  'bg-[color-mix(in_srgb,var(--isalwa-copper)_16%,white)]',
  'text-[color-mix(in_srgb,var(--isalwa-copper)_55%,var(--isalwa-kiln))]',
  'inline-flex',
  'items-center',
  'rounded-[var(--isalwa-radius-control)]',
  'px-2.5',
  'py-1',
  'text-[var(--isalwa-text-2xs)]',
  'font-medium',
  'tracking-[0.02em]',
] as const;

void commercialUiClassBridge;
