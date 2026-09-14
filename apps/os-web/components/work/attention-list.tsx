import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import {
  attentionHeadline,
  attentionStatusTone,
  attentionStoredDueLabel,
  formatAttentionReason,
  formatAttentionType,
  formatSubjectType,
} from '@/lib/work/labels';
import {
  attentionInspectLabel,
  attentionTargetHref,
} from '@/lib/work/navigation';

type AttentionListProps = {
  items: AttentionItemReadModel[];
  compact?: boolean;
};

export function AttentionList({ items, compact = false }: AttentionListProps) {
  return (
    <ul className="min-w-0" aria-label="Elementos que requieren atención">
      {items.map((item) => {
        const href = attentionTargetHref(item);
        const subject = formatSubjectType(item.subjectType);
        const dueLabel = attentionStoredDueLabel(item);
        const overdue = item.attentionType === 'overdue_work';
        const content = (
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words font-medium text-[var(--isalwa-kiln)]">{attentionHeadline(item)}</p>
              <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">
                {formatAttentionReason(item)}
              </p>
              {dueLabel ? (
                <p
                  className={
                    overdue
                      ? 'mt-1 text-sm font-medium text-[var(--isalwa-kiln)]'
                      : 'mt-1 text-sm text-[var(--isalwa-slate)]'
                  }
                >
                  {dueLabel}
                </p>
              ) : null}
              {!compact && subject ? (
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Relacionado con: {subject}</p>
              ) : null}
              {href ? (
                <p className="mt-2 text-sm font-medium text-[var(--isalwa-glaze)]">
                  {attentionInspectLabel(item)}
                </p>
              ) : null}
            </div>
            <StatusPill tone={attentionStatusTone(item.attentionType)} className="shrink-0">
              {formatAttentionType(item.attentionType)}
            </StatusPill>
          </div>
        );

        return (
          <ListRow key={item.attentionKey} as="li">
            {href ? (
              <Link
                href={href}
                className="isalwa-t-fast block min-w-0 flex-1 rounded-[var(--isalwa-radius-control)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              >
                {content}
              </Link>
            ) : (
              <div className="min-w-0 flex-1">{content}</div>
            )}
          </ListRow>
        );
      })}
    </ul>
  );
}
