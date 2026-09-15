import { OperatingRow, StatusPill } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import type { AgingFact } from '@/lib/work/aging/types';
import {
  approvalAgeLabelForAttention,
  dueTodayLabelForAttention,
} from '@/lib/work/aging/attention';
import type { ListDensity } from '@/lib/productivity/list-controls';
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
  density?: ListDensity;
  asOf?: Date;
  dueTodayByWorkId?: ReadonlyMap<string, string>;
  approvalAges?: ReadonlyMap<string, string>;
};

export function AttentionList({
  items,
  subjects,
  compact = false,
  density,
  asOf,
  dueTodayByWorkId,
  approvalAges,
}: AttentionListProps) {
  const clock = asOf ?? new Date();
  const rowDensity = density ?? (compact ? 'compact' : 'comfortable');
  return (
    <ul className="min-w-0" aria-label="Elementos que requieren atención">
      {items.map((item) => {
        const href = attentionTargetHref(item);
        const mapped = usableStaffTitle(subjects?.get(item.attentionKey));
        const subject = mapped ?? attentionStaffSubject(item);
        const dueToday =
          dueTodayLabelForAttention(item, clock) ??
          (item.workItemId ? dueTodayByWorkId?.get(item.workItemId) : null) ??
          null;
        const dueLabel = dueToday ?? attentionStoredDueLabel(item);
        const approvalAge =
          approvalAgeLabelForAttention(item, clock) ??
          (item.approvalRequestId ? approvalAges?.get(item.approvalRequestId) : null) ??
          null;
        const reason = formatAttentionReason(item);
        const statusLabel = formatAttentionType(item.attentionType);
        const meta = [dueLabel, approvalAge, !compact && reason !== statusLabel ? reason : null]
          .filter((part): part is string => Boolean(part))
          .join(' · ');

        return (
          <li key={item.attentionKey}>
            <OperatingRow
              density={rowDensity}
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

/** Extra factual rows. No status pill, so a label is not shown as a new work state. */
export function FactualDueList({
  facts,
  label,
  density = 'compact',
}: {
  facts: readonly AgingFact[];
  label: string;
  density?: ListDensity;
}) {
  if (facts.length === 0) return null;
  return (
    <ul className="min-w-0" aria-label={label}>
      {facts.map((fact) => (
        <li key={fact.key}>
          <OperatingRow
            density={density}
            href={fact.href ?? undefined}
            subject={fact.subject}
            meta={fact.label}
          />
        </li>
      ))}
    </ul>
  );
}
