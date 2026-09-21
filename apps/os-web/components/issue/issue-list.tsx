'use client';

import { StatusPill } from '@isalwa/ui';
import { OperatingScanListHeader, OperatingScanRow } from '@/components/lists/operating-scan-row';
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

const DESKTOP_GRID = 'md:grid md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7.5rem] md:items-center md:gap-3';

const HEADER_COLUMNS = [
  { id: 'issue', label: 'Incidencia' },
  { id: 'context', label: 'Contexto' },
  { id: 'status', label: 'Estado' },
];

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
  return shown.length > 80 ? `${shown.slice(0, 77)}…` : shown;
}

function contextLabel(item: IssueListItem, memberLabels: MemberLabelMap): string {
  const parts: string[] = [];
  if (item.references.length > 0) {
    const ref = item.references[0];
    const typeLabel = formatReferenceType(ref.referenceType);
    parts.push(ref.label ? `${typeLabel}: ${ref.label}` : typeLabel);
  }
  parts.push(`Reportó: ${memberLabel(memberLabels, item.reporterMemberId)}`);
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

  const rows = (
    <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Lista de incidencias">
      {visible.map((item) => (
        <li key={item.issueId} className="list-none">
          <OperatingScanRow
            href={issueHref(item.issueId)}
            density={density}
            title={issueTitle(item)}
            desktopGridClassName={DESKTOP_GRID}
            fields={[
              {
                id: 'context',
                label: 'Contexto',
                value: contextLabel(item, memberLabels),
              },
            ]}
            status={
              <StatusPill tone={statusToneForIssue(item.status)}>
                {formatIssueStatus(item.status)}
              </StatusPill>
            }
            actionLabel="Ver incidencia"
          />
        </li>
      ))}
    </ul>
  );

  if (!showHeader) return rows;

  return (
    <div className="overflow-x-clip bg-white" aria-label="Lista de incidencias">
      <OperatingScanListHeader columns={HEADER_COLUMNS} className={DESKTOP_GRID} />
      {rows}
    </div>
  );
}
