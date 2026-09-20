'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  listScaleExpandLabel,
  presentListScale,
  LIST_SCALE_PREVIEW_DEFAULT,
} from '@/lib/ui/list-scaling';

type ScaledListRevealProps = {
  /** Total row count in the loaded bound (not a fabricated catalog total). */
  total: number;
  previewCount?: number;
  empty: ReactNode;
  /** First N rows (or all when compact). Pass from Server Components as nodes. */
  preview: ReactNode;
  /** Full loaded bound. Only shown when expanding in-place (no moreHref). */
  full: ReactNode;
  /** Optional override for the expand control label. */
  expandLabel?: (total: number) => string;
  /**
   * When set, "Ver más" navigates here instead of expanding the full bound into the DOM.
   * Prefer this for histories and nested collections that can grow.
   */
  moreHref?: string;
  moreLabel?: string;
  /** When false, never dump the full loaded bound into the DOM. */
  allowExpand?: boolean;
};

/**
 * Client reveal for 6+ lists: show preview, then Ver todos / Ver más.
 * 0 → empty · 1–5 → full · 6+ → preview until expanded or navigated.
 */
export function ScaledListReveal({
  total,
  previewCount = LIST_SCALE_PREVIEW_DEFAULT,
  empty,
  preview,
  full,
  expandLabel = listScaleExpandLabel,
  moreHref,
  moreLabel,
  allowExpand = true,
}: ScaledListRevealProps) {
  const [expanded, setExpanded] = useState(false);
  const presentation = presentListScale(total, previewCount);

  if (presentation.mode === 'empty') return <>{empty}</>;
  if (presentation.mode === 'compact') return <>{full}</>;

  const canExpand = allowExpand && !moreHref;
  const showPreview = Boolean(moreHref) || !canExpand || !expanded;

  return (
    <div>
      {showPreview ? preview : full}
      {showPreview && (moreHref || canExpand || !allowExpand) ? (
        <div className="mt-4">
          {moreHref ? (
            <Link
              href={moreHref}
              className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
            >
              {moreLabel ?? 'Ver más'}
            </Link>
          ) : canExpand ? (
            <button
              type="button"
              className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              onClick={() => setExpanded(true)}
            >
              {expandLabel(presentation.total)}
            </button>
          ) : (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              Mostrando {presentation.visibleCount} de {presentation.total} en esta vista.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
