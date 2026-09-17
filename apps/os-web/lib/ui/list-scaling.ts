/**
 * Shared list density rules for Cliente360 / Compromisos desks.
 * 0 → empty · 1–5 → compact (show all) · 6+ → scaled preview + Ver todos (N).
 */

export const LIST_SCALE_COMPACT_MAX = 5;
export const LIST_SCALE_PREVIEW_DEFAULT = 5;
export const LIST_SCALE_PREVIEW_LARGE = 10;

export type ListScaleMode = 'empty' | 'compact' | 'scaled';

export type ListScalePresentation = {
  mode: ListScaleMode;
  total: number;
  /** How many rows to render before expand. */
  visibleCount: number;
  showExpand: boolean;
  previewCount: number;
};

export function presentListScale(
  total: number,
  previewCount: number = LIST_SCALE_PREVIEW_DEFAULT,
): ListScalePresentation {
  const safeTotal = Math.max(0, Math.floor(total));
  const safePreview = Math.max(1, Math.floor(previewCount));

  if (safeTotal === 0) {
    return {
      mode: 'empty',
      total: 0,
      visibleCount: 0,
      showExpand: false,
      previewCount: safePreview,
    };
  }

  if (safeTotal <= LIST_SCALE_COMPACT_MAX) {
    return {
      mode: 'compact',
      total: safeTotal,
      visibleCount: safeTotal,
      showExpand: false,
      previewCount: safePreview,
    };
  }

  return {
    mode: 'scaled',
    total: safeTotal,
    visibleCount: Math.min(safePreview, safeTotal),
    showExpand: true,
    previewCount: safePreview,
  };
}

export function sliceForListScale<T>(
  items: readonly T[],
  expanded: boolean,
  previewCount: number = LIST_SCALE_PREVIEW_DEFAULT,
): T[] {
  const presentation = presentListScale(items.length, previewCount);
  if (presentation.mode !== 'scaled' || expanded) return [...items];
  return items.slice(0, presentation.visibleCount);
}

export function listScaleExpandLabel(total: number): string {
  return `Ver todos (${total})`;
}
