'use client';

import Link from 'next/link';
import { EmptyState, SectionHeader, StatusPill } from '@isalwa/ui';
import { ReportIssueTrigger } from './report-issue-trigger';
import {
  ISSUE_COPY,
  formatIssueStatus,
  statusToneForIssue,
} from '@/lib/issue/labels';
import { issueHref, issueListHref } from '@/lib/issue/navigation';
import type { IssueListItem, ReportIssueContext } from '@/lib/issue/types';

type Cliente360IssuesProps = {
  items: IssueListItem[];
  partyId: string;
  partyLabel: string;
  reportedByLabel?: string;
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
  if (item.title?.trim()) return item.title.trim();
  const desc = item.description.trim();
  return desc.length > 50 ? `${desc.slice(0, 47)}…` : desc;
}

export function Cliente360Issues({
  items,
  partyId,
  partyLabel,
  reportedByLabel,
}: Cliente360IssuesProps) {
  const context: ReportIssueContext = {
    referenceType: 'party',
    referenceId: partyId,
    referenceLabel: partyLabel,
  };

  return (
    <div>
      <SectionHeader
        title={ISSUE_COPY.listTitle}
        action={
          <ReportIssueTrigger
            context={context}
            reportedByLabel={reportedByLabel}
            variant="secondary"
          />
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={ISSUE_COPY.cliente360Empty}
          description={ISSUE_COPY.cliente360EmptyHint}
        />
      ) : (
        <ul className="divide-y divide-[var(--isalwa-mist)]">
          {items.slice(0, 5).map((item) => (
            <li key={item.issueId} className="py-3">
              <Link
                href={issueHref(item.issueId)}
                className="block rounded-[var(--isalwa-radius-control)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)] -mx-2 px-2 py-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--isalwa-kiln)]">
                      {issueTitle(item)}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--isalwa-slate)]">
                      {formatTimestamp(item.createdAt)}
                    </p>
                  </div>
                  <StatusPill tone={statusToneForIssue(item.status)}>
                    {formatIssueStatus(item.status)}
                  </StatusPill>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length > 5 ? (
        <div className="mt-4">
          <Link
            href={`${issueListHref()}?subjectType=party&subjectId=${encodeURIComponent(partyId)}`}
            className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
          >
            Ver todas las incidencias ({items.length})
          </Link>
        </div>
      ) : null}
    </div>
  );
}
