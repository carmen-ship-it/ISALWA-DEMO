import Link from 'next/link';
import { ListRow, StatusPill } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import {
  attentionHeadline,
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
    <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Elementos que requieren atención">
      {items.map((item) => {
        const href = attentionTargetHref(item);
        const subject = formatSubjectType(item.subjectType);
        const content = (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[var(--isalwa-kiln)]">{attentionHeadline(item)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                {formatAttentionReason(item)}
              </p>
              {!compact ? (
                <p className="mt-2 text-xs text-[var(--isalwa-slate)]">
                  Se muestra porque el sistema detectó una condición pendiente — no es una tarea
                  separada.
                </p>
              ) : null}
              {subject ? (
                <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Relacionado con: {subject}</p>
              ) : null}
              {href ? (
                <p className="mt-2 text-sm font-medium text-[var(--isalwa-glaze)]">
                  {attentionInspectLabel(item)} →
                </p>
              ) : null}
            </div>
            <StatusPill tone="warning">{formatAttentionType(item.attentionType)}</StatusPill>
          </div>
        );

        return (
          <ListRow key={item.attentionKey} as="li" className="px-1 py-1">
            {href ? (
              <Link
                href={href}
                className="isalwa-t-fast block rounded-[var(--isalwa-radius-control)] px-3 py-3 outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              >
                {content}
              </Link>
            ) : (
              <div className="px-3 py-3">{content}</div>
            )}
          </ListRow>
        );
      })}
    </ul>
  );
}
