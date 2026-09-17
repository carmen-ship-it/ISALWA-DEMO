'use client';

import { useState, type ReactNode } from 'react';
import {
  listScaleExpandLabel,
  presentListScale,
  sliceForListScale,
  LIST_SCALE_PREVIEW_DEFAULT,
} from '@/lib/ui/list-scaling';

type ScaledListRevealProps<T> = {
  items: readonly T[];
  previewCount?: number;
  empty: ReactNode;
  children: (visible: T[]) => ReactNode;
  /** Optional override for the expand control label. */
  expandLabel?: (total: number) => string;
};

/**
 * Client reveal for 6+ lists: show previewCount (default 5), then Ver todos (N).
 * 0 → empty · 1–5 → all rows · 6+ → scaled until expanded.
 */
export function ScaledListReveal<T>({
  items,
  previewCount = LIST_SCALE_PREVIEW_DEFAULT,
  empty,
  children,
  expandLabel = listScaleExpandLabel,
}: ScaledListRevealProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const presentation = presentListScale(items.length, previewCount);

  if (presentation.mode === 'empty') return <>{empty}</>;

  const visible = sliceForListScale(items, expanded, previewCount);

  return (
    <div>
      {children(visible)}
      {presentation.showExpand && !expanded ? (
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
