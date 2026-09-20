'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { Button, Chip, Panel, SearchField, StatusPill } from '@isalwa/ui';
import { ListToolbar } from '@/components/lists/list-toolbar';
import { useRolePreview } from '@/components/shell/role-preview-provider';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { approvalListActionLabel } from '@/lib/work/approval-action-label';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';

type ApprovalDeskPanelProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  subjects?: Map<string, string>;
  evaluationMode?: boolean;
  /** Authoritative canDecide per request — same truth as detail. */
  canDecideById?: Map<string, boolean>;
};

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CHIPS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'pending', label: 'Pendiente' },
  { id: 'approved', label: 'Aprobado' },
  { id: 'rejected', label: 'Rechazado' },
  { id: 'all', label: 'Todos' },
];

function normalizeStatus(status: string): StatusFilter {
  if (status === 'pending' || status === 'approved' || status === 'rejected') return status;
  return 'all';
}

export function ApprovalDeskPanel({
  items,
  memberLabels,
  subjects,
  evaluationMode = false,
  canDecideById,
}: ApprovalDeskPanelProps) {
  const { active: rolePreviewActive } = useRolePreview();
  // Prefer live client View As so labels match the Vista de evaluación banner
  // even if the server cookie lagged the first paint.
  const evaluationModeEffective = evaluationMode || rolePreviewActive;
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');

  const availableStatuses = useMemo(() => {
    const set = new Set(items.map((item) => normalizeStatus(item.status)));
    return STATUS_CHIPS.filter((chip) => chip.id === 'all' || set.has(chip.id));
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((approval) => {
      const status = normalizeStatus(approval.status);
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      const subject = (subjects?.get(approval.approvalRequestId) ?? APPROVAL_ROW_SUBJECT_FALLBACK).toLowerCase();
      const requester = memberLabel(memberLabels, approval.requestedByMemberId).toLowerCase();
      const reason = approval.decisionReason?.trim().toLowerCase() ?? '';
      return subject.includes(q) || requester.includes(q) || reason.includes(q);
    });
  }, [items, memberLabels, query, statusFilter, subjects]);

  return (
    <div className="min-w-0">
      <ListToolbar
        className="mb-3"
        search={
          <SearchField
            id="aprobaciones-buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cotización, cliente o solicitante"
            aria-label="Buscar en aprobaciones cargadas"
            autoComplete="off"
          />
        }
        filters={
          availableStatuses.length > 1 ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {availableStatuses.map((chip) => (
                <Chip
                  key={chip.id}
                  active={statusFilter === chip.id}
                  onClick={() => setStatusFilter(chip.id)}
                >
                  {chip.label}
                </Chip>
              ))}
            </div>
          ) : null
        }
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          Ninguna solicitud coincide con la búsqueda en esta página.
        </p>
      ) : (
        <ul className="grid min-w-0 gap-2" aria-label="Aprobaciones">
          {filtered.map((approval) => {
            const detailHref = approvalHref(approval.approvalRequestId);
            const subject = subjects?.get(approval.approvalRequestId) ?? APPROVAL_ROW_SUBJECT_FALLBACK;
            const requester = memberLabel(memberLabels, approval.requestedByMemberId);
            const isPending = approval.status === 'pending';
            const canDecide = evaluationModeEffective
              ? false
              : (canDecideById?.get(approval.approvalRequestId) ?? false);
            const actionLabel = approvalListActionLabel({
              status: approval.status,
              canDecide,
              evaluationMode: evaluationModeEffective,
            });
            const primaryDecide = actionLabel === 'Decidir';
            return (
              <li key={approval.approvalRequestId}>
                <Panel
                  className={
                    isPending
                      ? 'border-l-4 border-l-[var(--isalwa-warning)] p-3 shadow-[var(--isalwa-shadow-soft)]'
                      : 'p-3 shadow-[var(--isalwa-shadow-soft)]'
                  }
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--isalwa-kiln)]">{subject}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-[var(--isalwa-slate)]">
                        Solicitado por {requester}
                        {approval.decisionReason?.trim() ? ` · ${approval.decisionReason.trim()}` : null}
                      </p>
                    </div>
                    <StatusPill tone={statusToneForApproval(approval.status)} icon={isPending ? 'pending' : undefined}>
                      {formatApprovalStatus(approval.status)}
                    </StatusPill>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={detailHref} className="inline-flex">
                      <Button type="button" variant={primaryDecide ? 'primary' : 'secondary'} size="sm">
                        {actionLabel}
                      </Button>
                    </Link>
                  </div>
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
