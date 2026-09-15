import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { ListQueryState } from '@/lib/lists/url-state';
import { sortOpenWorkByDue } from '@/lib/work/due-order';

export const LIST_SORTS = ['due', 'priority', 'title'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export const LIST_DENSITIES = ['compact', 'comfortable'] as const;
export type ListDensity = (typeof LIST_DENSITIES)[number];

export const LIST_FOCUSES = ['approval'] as const;
export type ListFocus = (typeof LIST_FOCUSES)[number];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Presentation filters that shrink the loaded page without changing query authority. */
export type ActiveListControls = {
  q: string | undefined;
  sort: ListSort;
  density: ListDensity;
  focus: ListFocus | undefined;
};

export function parseListSort(raw: string | undefined): ListSort {
  if (raw === 'priority' || raw === 'title') return raw;
  return 'due';
}

export function parseListDensity(raw: string | undefined): ListDensity {
  if (raw === 'comfortable') return 'comfortable';
  return 'compact';
}

export function parseListFocus(raw: string | undefined): ListFocus | undefined {
  if (raw === 'approval') return 'approval';
  return undefined;
}

export function readListControls(state: ListQueryState): ActiveListControls {
  return {
    q: state.q,
    sort: parseListSort(state.sort),
    density: parseListDensity(state.density),
    focus: parseListFocus(state.focus),
  };
}

/**
 * Counts presentation controls the user can clear (search, non-default sort,
 * comfortable density, focus lens). View tabs and party subject filters stay.
 */
export function countActiveListControls(controls: ActiveListControls): number {
  let count = 0;
  if (controls.q) count += 1;
  if (controls.sort !== 'due') count += 1;
  if (controls.density !== 'compact') count += 1;
  if (controls.focus) count += 1;
  return count;
}

/** Drops presentation controls while keeping view / subject context. */
export function clearListControls(state: ListQueryState): ListQueryState {
  const next: ListQueryState = { ...state };
  delete next.q;
  delete next.sort;
  delete next.density;
  delete next.focus;
  delete next.cursor;
  return next;
}

export function listSortLabel(sort: ListSort): string {
  switch (sort) {
    case 'priority':
      return 'Prioridad';
    case 'title':
      return 'Asunto';
    default:
      return 'Fecha';
  }
}

export function listDensityLabel(density: ListDensity): string {
  return density === 'comfortable' ? 'Cómoda' : 'Compacta';
}

export function listFocusLabel(focus: ListFocus): string {
  return focus === 'approval' ? 'Aprobación pendiente' : focus;
}

/**
 * Applies page-local focus and sort after the server list returns.
 * Does not invent rows or change ownership.
 */
export function presentWorkPage(
  items: readonly WorkSummaryReadModel[],
  controls: ActiveListControls,
  asOf = new Date(),
): WorkSummaryReadModel[] {
  let next = [...items];
  if (controls.focus === 'approval') {
    next = next.filter((item) => item.approvalStatus === 'pending');
  }
  if (controls.sort === 'priority') {
    return next.sort((left, right) => {
      const rank =
        (PRIORITY_RANK[left.priority] ?? 99) - (PRIORITY_RANK[right.priority] ?? 99);
      if (rank !== 0) return rank;
      return left.workItemId.localeCompare(right.workItemId);
    });
  }
  if (controls.sort === 'title') {
    return next.sort((left, right) => {
      const byTitle = left.title.localeCompare(right.title, 'es');
      if (byTitle !== 0) return byTitle;
      return left.workItemId.localeCompare(right.workItemId);
    });
  }
  return sortOpenWorkByDue(next, asOf);
}
