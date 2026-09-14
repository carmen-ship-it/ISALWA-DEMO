import type { ReactNode } from 'react';
import { EmptyState, FeedbackNote, Skeleton, StatusPill } from '@isalwa/ui';
import { workStateView, type WorkStateKind } from '@/lib/experience/work-state';

type WorkStateProps = {
  kind: WorkStateKind;
  title?: string;
  description?: string;
  /** Omit unless the caller already has a count. A missing count is not shown as 0. */
  count?: number | null;
  action?: ReactNode;
};

/**
 * Use WorkState for loading, empty, zero-result, error, permission denied, disabled, and success.
 * Pass Spanish title and description slots when the page has its own copy; the defaults are generic and do not invent a count of zero or any business fact.
 */
export function WorkState({ kind, title, description, count, action }: WorkStateProps) {
  const view = workStateView(kind, { title, description, count });
  const countSlot = view.showsCount ? (
    <p className="isalwa-metric text-[var(--isalwa-text-sm)] text-[var(--isalwa-kiln)]">{view.count}</p>
  ) : null;
  const denseEmpty = '!gap-2 !p-3 md:!p-3';

  if (view.kind === 'loading') {
    return (
      <div aria-live="polite" aria-busy="true" className="space-y-2">
        <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{view.title}</p>
        <Skeleton h={16} />
        <Skeleton h={16} className="max-w-xs" />
        {countSlot}
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <div className="space-y-2">
        <FeedbackNote tone="error" title={view.title} detail={view.description} />
        {countSlot}
        {action}
      </div>
    );
  }

  if (view.kind === 'success') {
    return (
      <div className="space-y-2">
        <FeedbackNote tone="success" title={view.title} detail={view.description} />
        {countSlot}
        {action}
      </div>
    );
  }

  if (view.kind === 'permission-denied' || view.kind === 'disabled') {
    return (
      <div role={view.kind === 'permission-denied' ? 'alert' : 'status'} className="space-y-2">
        <StatusPill tone="neutral">{view.title}</StatusPill>
        <EmptyState className={denseEmpty} title={view.description} action={action} />
        {countSlot}
      </div>
    );
  }

  return (
    <div role="status" className="space-y-2">
      <EmptyState className={denseEmpty} title={view.title} description={view.description} action={action} />
      {countSlot}
    </div>
  );
}
