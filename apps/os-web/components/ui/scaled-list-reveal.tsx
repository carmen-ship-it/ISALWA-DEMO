'use client';

import { useState, type ReactNode } from 'react';
import {
  listScaleExpandLabel,
  presentListScale,
  LIST_SCALE_PREVIEW_DEFAULT,
} from '@/lib/ui/list-scaling';

type ScaledListRevealProps = {
  /** Total row count (drives empty / compact / scaled). */
  total: number;
  previewCount?: number;
  empty: ReactNode;
  /** First N rows (or all when compact). Pass from Server Components as nodes. */
  preview: ReactNode;
  /** Full list. Shown when compact or after Ver todos. */
  full: ReactNode;
  /** Optional override for the expand control label. */
  expandLabel?: (total: number) => string;
};

/**
 * Client reveal for 6+ lists: show preview, then Ver todos (N).
 * 0 → empty · 1–5 → full · 6+ → preview until expanded.
 *
 * Preview/full must be React nodes (not render props) so Server Components
 * can pass them across the RSC boundary.
 */
export function ScaledListReveal({
  total,
  previewCount = LIST_SCALE_PREVIEW_DEFAULT,
  empty,
  preview,
  full,
  expandLabel = listScaleExpandLabel,
}: ScaledListRevealProps) {
  const [expanded, setExpanded] = useState(false);
  const presentation = presentListScale(total, previewCount);

  if (presentation.mode === 'empty') return <>{empty}</>;
  if (presentation.mode === 'compact') return <>{full}</>;

  return (
    <div>
      {expanded ? full : preview}
      {!expanded ? (
        <div className="mt-4">
          <button
            type="button"
            className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
            onClick={() => setExpanded(true)}
          >
            {expandLabel(presentation.total)}
          </button>
        </div>
      ) : null}
    </div>
  );
}
