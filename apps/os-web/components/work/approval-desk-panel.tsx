'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import type { ApprovalSummaryReadModel } from '@isalwa/os-contracts';
import { Button, Panel, StatusPill } from '@isalwa/ui';
import { ListSearchForm, ListToolbar } from '@/components/lists/list-toolbar';
import { useRolePreview } from '@/components/shell/role-preview-provider';
import { APPROVAL_ROW_SUBJECT_FALLBACK } from '@/lib/work/approval-row-subject';
import { approvalListActionLabel } from '@/lib/work/approval-action-label';
import { formatApprovalStatus, statusToneForApproval } from '@/lib/work/labels';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { approvalHref } from '@/lib/work/navigation';
import { listHref, type ListQueryState } from '@/lib/lists/url-state';

type ApprovalDeskPanelProps = {
  items: ApprovalSummaryReadModel[];
  memberLabels: MemberLabelMap;
  subjects?: Map<string, string>;
  evaluationMode?: boolean;
  /** Authoritative canDecide per request — same truth as detail. */
  canDecideById?: Map<string, boolean>;
  /** URL list state so search/filter survives open → back. */
  listState: ListQueryState;
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

function parseStatusFilter(raw: string | undefined): StatusFilter {
  if (raw === 'pending' || raw === 'approved' || raw === 'rejected' || raw === 'all') return raw;
  return 'pending';
}

export function ApprovalDeskPanel({
  items,
  memberLabels,
  subjects,
  evaluationMode = false,
  canDecideById,
  listState,
}: ApprovalDeskPanelProps) {
  const { active: rolePreviewActive } = useRolePreview();
  // Prefer live client View As so labels match the Vista de evaluación banner
  // even if the server cookie lagged the first paint.
  const evaluationModeEffective = evaluationMode || rolePreviewActive;
  const query = listState.q?.trim() ?? '';
  const statusFilter = parseStatusFilter(listState.status);


  const filtered = useMemo(() => {
    const q = query.toLowerCase();
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

  const clearHref = listHref('/aprobaciones', { ...listState, q: undefined, status: undefined }, [
    'q',
    'status',
    'cursor',
  ]);
  const hasActiveFilter = Boolean(query) || statusFilter !== 'pending';

  return (
    <div className="min-w-0">
      <ListToolbar
        className="mb-3"
        search={
          <ListSearchForm
            action="/aprobaciones"
            initialQuery={query}
            placeholder="Cotización, cliente o solicitante"
            label="Buscar"
            clearHref={query ? clearHref : undefined}
            hiddenFields={{
              status: statusFilter === 'pending' ? undefined : statusFilter,
              cursor: undefined,
            }}
          />
        }
        filters={
          (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
              {STATUS_CHIPS.map((chip) => {
                const href = listHref(
                  '/aprobaciones',
                  {
                    ...listState,
                    status: chip.id === 'pending' ? undefined : chip.id,
                    q: query || undefined,
                  },
                  ['cursor'],
                );
                const active = statusFilter === chip.id;
                return (
                  <Link
                    key={chip.id}
                    href={href}
                    aria-current={active ? 'true' : undefined}
                    className={
                      active
                        ? 'inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-kiln)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)] px-3 text-xs font-medium text-[var(--isalwa-kiln)]'
                        : 'inline-flex h-8 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-xs font-medium text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]'
                    }
                  >
                    {chip.label}
                  </Link>
                );
              })}
            </div>
          )
        }
      />

      {filtered.length === 0 ? (
        <div className="rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-white px-4 py-6">
          <p className="text-sm text-[var(--isalwa-kiln)]">
            Ninguna solicitud coincide con la búsqueda en esta página.
          </p>
          {hasActiveFilter ? (
            <p className="mt-3">
              <Link
                href={clearHref}
                className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
              >
                Limpiar búsqueda y filtros
              </Link>
            </p>
          ) : null}
        </div>
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
            const reason = approval.decisionReason?.trim() ?? '';
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
                      <p className="truncate text-sm font-semibold text-[var(--isalwa-kiln)]" title={subject}>
                        {subject}
                      </p>
                      <p
                        className="mt-0.5 truncate text-xs leading-relaxed text-[var(--isalwa-slate)]"
                        title={reason ? `Solicitado por ${requester} · ${reason}` : `Solicitado por ${requester}`}
                      >
                        Solicitado por {requester}
                        {reason ? ` · ${reason}` : null}
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
