import type { AttentionItemReadModel, AttentionType } from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import {
  approvalAgeLabelForAttention,
  dueTodayLabelForAttention,
} from '@/lib/work/aging/attention';
import { sortAttentionByDue } from '@/lib/work/due-order';

/**
 * Display order of existing attention types only. No score or rank.
 * Within a group, a stored due date orders items when present. Missing dates
 * keep attentionKey order. This does not classify a past date as another type.
 */
export const INICIO_ATTENTION_GROUP_ORDER = [
  'overdue_work',
  'reassigned_work',
  'pending_approval',
  'open_work_assigned',
] as const satisfies readonly AttentionType[];

export type InicioAttentionGroupId = (typeof INICIO_ATTENTION_GROUP_ORDER)[number] | 'other';

export type InicioAttentionGroup = {
  id: InicioAttentionGroupId;
  title: string;
  items: AttentionItemReadModel[];
};

export type InicioAttentionCta = {
  href: string;
  label: string;
};

/** Contract max so grouping is not a truncated ranking. */
export const INICIO_ATTENTION_LIMIT = 100;

const GROUP_TITLE_KEYS: Record<(typeof INICIO_ATTENTION_GROUP_ORDER)[number], string> = {
  overdue_work: 'pages.inicio.attentionOverdue',
  reassigned_work: 'pages.inicio.attentionReassigned',
  pending_approval: 'pages.inicio.attentionApprovals',
  open_work_assigned: 'pages.inicio.attentionOpen',
};

export function inicioAttentionGroupTitle(id: InicioAttentionGroupId): string {
  if (id === 'other') return t('pages.inicio.attentionOther');
  return t(GROUP_TITLE_KEYS[id]);
}

export function groupInicioAttention(items: AttentionItemReadModel[]): InicioAttentionGroup[] {
  const buckets = new Map<AttentionType, AttentionItemReadModel[]>();
  const other: AttentionItemReadModel[] = [];

  for (const item of items) {
    if ((INICIO_ATTENTION_GROUP_ORDER as readonly string[]).includes(item.attentionType)) {
      const current = buckets.get(item.attentionType) ?? [];
      current.push(item);
      buckets.set(item.attentionType, current);
      continue;
    }
    other.push(item);
  }

  const groups: InicioAttentionGroup[] = [];
  for (const id of INICIO_ATTENTION_GROUP_ORDER) {
    const grouped = buckets.get(id);
    if (!grouped || grouped.length === 0) continue;
    groups.push({
      id,
      title: inicioAttentionGroupTitle(id),
      items: sortAttentionByDue(grouped),
    });
  }

  if (other.length > 0) {
    groups.push({
      id: 'other',
      title: inicioAttentionGroupTitle('other'),
      items: sortAttentionByDue(other),
    });
  }

  return groups;
}

/** "Vence hoy" from a stored due instant. Does not move the item into another group. */
export function inicioAttentionDueTodayLabel(
  item: AttentionItemReadModel,
  asOf = new Date(),
): string | null {
  return dueTodayLabelForAttention(item, asOf);
}

/** Elapsed fact for a pending approval when the request instant is already stored. */
export function inicioAttentionApprovalAgeLabel(
  item: AttentionItemReadModel,
  asOf = new Date(),
): string | null {
  return approvalAgeLabelForAttention(item, asOf);
}

export function inicioAttentionEmptyMessage(): string {
  return t('pages.inicio.attentionEmpty');
}

export function inicioAttentionEmptyCtas(): InicioAttentionCta[] {
  return [
    { href: '/trabajo', label: t('states.viewWork') },
    { href: '/clientes', label: t('states.goToClientesAttention') },
  ];
}
