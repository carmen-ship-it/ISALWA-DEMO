import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import {
  attentionStatusTone,
  attentionStoredDueLabel,
  formatAttentionReason,
  formatAttentionType,
} from '@/lib/work/labels';
import { attentionStaffSubject, usableStaffTitle } from '@/lib/work/staff-subject';
import { attentionInspectLabel, attentionTargetHref } from '@/lib/work/navigation';

type AttentionListProps = {
  items: AttentionItemReadModel[];
  subjects?: Map<string, string>;
  compact?: boolean;
};

export function AttentionList({ items, subjects, compact = false }: AttentionListProps) {
  return (
    <ul className="min-w-0" aria-label="Elementos que requieren atención">
      {items.map((item) => {
        const href = attentionTargetHref(item);
        const mapped = usableStaffTitle(subjects?.get(item.attentionKey));
        const subject = mapped ?? attentionStaffSubject(item);
        const dueLabel = attentionStoredDueLabel(item);
        const reason = formatAttentionReason(item);
        const statusLabel = formatAttentionType(item.attentionType);
        const meta = [dueLabel, !compact && reason !== statusLabel ? reason : null]
          .filter((part): part is string => Boolean(part))
          .join(' · ');

        return (
          <li key={item.attentionKey}>
            <OperatingRow
              className="py-tight !py-1"
              href={href ?? undefined}
              subject={
                <>
                  {subject}
                  {href ? <span className="sr-only">. {attentionInspectLabel(item)}</span> : null}
                </>
              }
              meta={meta || undefined}
              status={
                <StatusPill tone={attentionStatusTone(item.attentionType)} className="shrink-0">
                  {statusLabel}
                </StatusPill>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
