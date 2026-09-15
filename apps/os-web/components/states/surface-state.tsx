import type { ReactNode } from 'react';
import { EmptyState, FeedbackNote, Skeleton, cx } from '@isalwa/ui';
import { t } from '@/lib/i18n/es';

export type SurfaceStateKind = 'loading' | 'empty' | 'error' | 'zero-result';

export type SurfaceStateProps = {
  kind: SurfaceStateKind;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const DEFAULTS: Record<SurfaceStateKind, { titleKey: string; descriptionKey: string }> = {
  loading: { titleKey: 'states.loading', descriptionKey: 'states.loadingHint' },
  empty: { titleKey: 'states.empty', descriptionKey: 'states.emptyHint' },
  error: { titleKey: 'states.errorLoad', descriptionKey: 'states.errorLoadHint' },
  'zero-result': { titleKey: 'states.zeroResult', descriptionKey: 'states.zeroResultHint' },
};

/**
 * Shared section chrome for loading / empty / error / zero-result.
 * Page lanes supply Spanish title/description; defaults stay generic and honest.
 */
export function SurfaceState({ kind, title, description, action, className }: SurfaceStateProps) {
  const defaults = DEFAULTS[kind];
  const resolvedTitle = title?.trim() || t(defaults.titleKey);
  const resolvedDescription = description?.trim() || t(defaults.descriptionKey);

  if (kind === 'loading') {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        data-surface-state="loading"
        className={cx('w-full max-w-xl space-y-3', className)}
      >
        <p className="text-sm text-[var(--isalwa-slate)]">{resolvedTitle}</p>
        <Skeleton h={16} />
        <Skeleton h={16} className="max-w-xs" />
        <span className="sr-only">{resolvedDescription}</span>
      </div>
    );
  }

  if (kind === 'error') {
    return (
      <div data-surface-state="error" className={cx('w-full max-w-xl space-y-3', className)}>
        <FeedbackNote tone="error" title={resolvedTitle} detail={resolvedDescription} />
        {action}
      </div>
    );
  }

  return (
    <div
      role="status"
      data-surface-state={kind}
      className={cx('w-full max-w-xl', className)}
    >
      <EmptyState title={resolvedTitle} description={resolvedDescription} action={action} />
    </div>
  );
}
