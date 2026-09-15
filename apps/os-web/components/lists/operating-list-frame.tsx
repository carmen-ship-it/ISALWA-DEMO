import type { ReactNode } from 'react';
import { OperatingListHeader, cx } from '@isalwa/ui';
import type { ListDensity } from '@/lib/productivity/list-controls';

const WORK_COLUMNS = [
  { id: 'subject', label: 'Asunto', className: 'min-w-0 flex-1' },
  { id: 'status', label: 'Estado', className: 'shrink-0' },
] as const;

type OperatingListFrameProps = {
  children: ReactNode;
  density?: ListDensity;
  columns?: ReadonlyArray<{ id: string; label: string; className?: string }>;
  label?: string;
  className?: string;
  /** Max height before the sticky header pins inside the card. */
  scrollClassName?: string;
};

/**
 * Card shell for operating lists: sticky column headers + density-aware scroll body.
 */
export function OperatingListFrame({
  children,
  density = 'compact',
  columns = WORK_COLUMNS,
  label,
  className,
  scrollClassName = 'max-h-[min(70vh,36rem)] overflow-y-auto',
}: OperatingListFrameProps) {
  return (
    <div
      data-density={density}
      className={cx('overflow-hidden bg-white', className)}
      aria-label={label}
    >
      <div className={scrollClassName}>
        <OperatingListHeader columns={[...columns]} />
        {children}
      </div>
    </div>
  );
}
