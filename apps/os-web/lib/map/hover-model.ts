import type { AttentionItemReadModel, WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { MapPartyCommercialSnapshot } from '@/lib/map/commercial-lens';
import type { MapCustomerRow } from '@/lib/map/build-view-model';

export type MapHoverStatusTone = 'info' | 'warning' | 'manual' | 'success' | 'danger';

export type MapHoverSnapshot = {
  partyId: string;
  clientName: string;
  responsible: string | null;
  opportunityCount: number;
  quotedValueLabel: string | null;
  orderCount: number;
  orderValueLabel: string | null;
  /** Raw recorded values for bubble sizing — null when absent. */
  opportunityValueCentavos: number | null;
  quotedValueCentavos: number | null;
  orderValueCentavos: number | null;
  /** Active attention + overdue work count for this party. */
  attentionCount: number;
  nextAttention: string | null;
  statusLabel: string;
  statusTone: MapHoverStatusTone;
};

const ATTENTION_LABEL: Record<string, string> = {
  overdue_work: 'Trabajo vencido',
  open_work_assigned: 'Trabajo asignado',
  pending_approval: 'Aprobación pendiente',
  reassigned_work: 'Trabajo reasignado',
};

function statusFromRow(row: MapCustomerRow): { label: string; tone: MapHoverStatusTone } {
  if (row.hasCoordinates) return { label: 'Ubicación confirmada', tone: 'success' };
  if (row.hasProvenance) return { label: 'Ubicación por confirmar', tone: 'manual' };
  return { label: 'Sin ubicación', tone: 'warning' };
}

function nextAttentionLabel(
  partyId: string,
  attention: readonly AttentionItemReadModel[],
  overdueWork: readonly WorkSummaryReadModel[],
): string | null {
  const overdue = overdueWork.find(
    (row) => row.status === 'open' && row.subjectType === 'party' && row.subjectId === partyId,
  );
  if (overdue) {
    return overdue.title.trim() || 'Seguimiento vencido';
  }

  const item = attention.find(
    (row) => row.isActive && row.subjectType === 'party' && row.subjectId === partyId,
  );
  if (!item) return null;
  return ATTENTION_LABEL[item.attentionType] ?? item.reasonCode;
}

export function countPartyAttention(
  partyId: string,
  attention: readonly AttentionItemReadModel[],
  overdueWork: readonly WorkSummaryReadModel[],
): number {
  let count = 0;
  for (const row of overdueWork) {
    if (row.status === 'open' && row.subjectType === 'party' && row.subjectId === partyId) count += 1;
  }
  for (const item of attention) {
    if (item.isActive && item.subjectType === 'party' && item.subjectId === partyId) count += 1;
  }
  return count;
}

export function buildMapHoverSnapshot(input: {
  row: MapCustomerRow;
  ownerLabel: string | null;
  commercial: MapPartyCommercialSnapshot | null;
  attention?: readonly AttentionItemReadModel[];
  overdueWork?: readonly WorkSummaryReadModel[];
}): MapHoverSnapshot {
  const status = statusFromRow(input.row);
  const commercial = input.commercial;
  const attentionCount = countPartyAttention(
    input.row.partyId,
    input.attention ?? [],
    input.overdueWork ?? [],
  );
  return {
    partyId: input.row.partyId,
    clientName: input.row.displayName,
    responsible: input.ownerLabel,
    opportunityCount: commercial?.opportunityCount ?? 0,
    quotedValueLabel: commercial?.quotedValueLabel ?? null,
    orderCount: commercial?.orderCount ?? 0,
    orderValueLabel: commercial?.orderValueLabel ?? null,
    opportunityValueCentavos: commercial?.opportunityValueCentavos ?? null,
    quotedValueCentavos: commercial?.quotedValueCentavos ?? null,
    orderValueCentavos: commercial?.orderValueCentavos ?? null,
    attentionCount,
    nextAttention: nextAttentionLabel(
      input.row.partyId,
      input.attention ?? [],
      input.overdueWork ?? [],
    ),
    statusLabel: status.label,
    statusTone: status.tone,
  };
}
