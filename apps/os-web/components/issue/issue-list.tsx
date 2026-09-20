'use client';

import Link from 'next/link';
import { OperatingRow, StatusPill } from '@isalwa/ui';
import { formatIssueStatus, formatReferenceType, statusToneForIssue } from '@/lib/issue/labels';
import { issueHref } from '@/lib/issue/navigation';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import type { IssueListItem } from '@/lib/issue/types';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

type IssueListProps = {
  items: IssueListItem[];
  memberLabels: MemberLabelMap;
  showHeader?: boolean;
  density?: 'compact' | 'comfortable';
};

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function issueTitle(item: IssueListItem): string {
  if (item.title?.trim() && !isEngineeringFixtureCopy(item.title)) {
    return presentHumanCopy(item.title);
  }
  const desc = item.description?.trim() ?? '';
  if (!desc || isEngineeringFixtureCopy(desc)) return 'Incidencia';
  const shown = presentHumanCopy(desc);
  return shown.length > 60 ? `${shown.slice(0, 57)}…` : shown;
}

function issueMeta(item: IssueListItem, memberLabels: MemberLabelMap): string {
  const parts: string[] = [];

  // Reference context
  if (item.references.length > 0) {
    const ref = item.references[0];
    const typeLabel = formatReferenceType(ref.referenceType);
    if (ref.label) {
      parts.push(`${typeLabel}: ${ref.label}`);
    } else {
      parts.push(typeLabel);
    }
  }

  // Reporter
  const reporter = memberLabel(memberLabels, item.reporterMemberId);
  parts.push(`Reportó: ${reporter}`);

  // Date
  parts.push(formatTimestamp(item.createdAt));

  return parts.join(' · ');
}

function isVisibleIssue(item: IssueListItem): boolean {
  return (
    !isEngineeringFixtureCopy(item.title) && !isEngineeringFixtureCopy(item.description)
  );
}

export function IssueList({ items, memberLabels, showHeader, density = 'compact' }: IssueListProps) {
  const visible = items.filter(isVisibleIssue);
  if (visible.length === 0) return null;

  return (
    <div className="min-w-0">
      {showHeader ? (
        <div
          role="row"
          className="sticky top-0 z-[1] flex items-center gap-3 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-3 py-2 backdrop-blur-md"
        >
          <span className="min-w-0 flex-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--isalwa-slate)]">
            Incidencia
          </span>
          <span className="w-24 shrink-0 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--isalwa-slate)]">
            Estado
          </span>
        </div>
      ) : null}
      <ul className="min-w-0">
        {visible.map((item) => (
          <li key={item.issueId}>
            <Link href={issueHref(item.issueId)} className="block">
              <OperatingRow
                subject={issueTitle(item)}
                meta={issueMeta(item, memberLabels)}
                status={
                  <StatusPill tone={statusToneForIssue(item.status)}>
                    {formatIssueStatus(item.status)}
                  </StatusPill>
                }
                density={density}
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
