/**
 * Action hierarchy helpers — one primary (navy filled), one secondary (white + navy border),
 * remaining actions live under + Acciones.
 * Prefer these class strings / labels over inventing parallel button recipes.
 */

export const ACTION_HIERARCHY_COPY = {
  overflow: '+ Acciones',
} as const;

/** Navy filled primary link / button surface (os-web remaps --isalwa-action → kiln). */
export const actionPrimaryClass =
  'isalwa-action-link isalwa-t-fast inline-flex h-10 items-center justify-center rounded-[var(--isalwa-radius-control)] px-4 text-sm font-medium focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** White + navy border secondary. */
export const actionSecondaryClass =
  'isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-btn-secondary-border)] bg-[var(--isalwa-btn-secondary-bg)] px-4 text-sm font-medium text-[var(--isalwa-btn-secondary-fg)] hover:border-[var(--isalwa-btn-secondary-border-hover)] hover:bg-[var(--isalwa-btn-secondary-bg-hover)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

/** Tertiary / overflow trigger (+ Acciones). */
export const actionOverflowClass =
  'isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-transparent bg-transparent px-3 text-sm font-medium text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';
