/**
 * Generic chrome copy for WorkState. Callers override the Spanish slots.
 * A missing count stays null. This module does not invent a zero or a business fact.
 */

export type WorkStateKind =
  | 'loading'
  | 'empty'
  | 'zero-result'
  | 'error'
  | 'permission-denied'
  | 'disabled'
  | 'success';

/** Shared lock for selectors and quantity fields. Permission wins over a plain disable. */
export type FieldAccess = 'enabled' | 'disabled' | 'permission-denied';

export type WorkStateSlots = {
  title?: string;
  description?: string;
  /** Pass a number only when the caller already knows it. Omit to show no count. */
  count?: number | null;
};

export type WorkStateModel = {
  kind: WorkStateKind;
  title: string;
  description: string;
  count: number | null;
  showsCount: boolean;
};

export const WORK_STATE_COPY: Record<WorkStateKind, { title: string; description: string }> = {
  loading: {
    title: 'Cargando…',
    description: 'Espere un momento.',
  },
  empty: {
    title: 'Todavía no hay registros',
    description: 'Cuando existan, aparecerán aquí.',
  },
  'zero-result': {
    title: 'Ningún resultado coincide',
    description: 'Pruebe otra búsqueda o quite filtros.',
  },
  error: {
    title: 'No se pudo cargar',
    description: 'Intente de nuevo.',
  },
  'permission-denied': {
    title: 'Sin permiso',
    description: 'No tiene acceso a esta vista.',
  },
  disabled: {
    title: 'No disponible',
    description: 'Esta acción no está disponible.',
  },
  success: {
    title: 'Listo',
    description: 'La acción se completó.',
  },
};

export function resolveFieldAccess(disabled = false, access: FieldAccess = 'enabled'): FieldAccess {
  if (access === 'permission-denied') return 'permission-denied';
  if (disabled || access === 'disabled') return 'disabled';
  return 'enabled';
}

/** A missing reason stays the Spanish default. An enabled field has no lock copy. */
export function fieldAccessReason(
  access: FieldAccess,
  reason?: string,
  fallback?: { disabled: string; permission: string },
): string | null {
  if (access === 'enabled') return null;
  const supplied = reason?.trim() ?? '';
  if (supplied.length > 0) return supplied;
  if (access === 'permission-denied') {
    return fallback?.permission ?? WORK_STATE_COPY['permission-denied'].title;
  }
  return fallback?.disabled ?? WORK_STATE_COPY.disabled.title;
}

function slotText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : fallback;
}

export function workStateView(kind: WorkStateKind, slots: WorkStateSlots = {}): WorkStateModel {
  const copy = WORK_STATE_COPY[kind];
  const supplied = slots.count;
  const count = typeof supplied === 'number' && Number.isFinite(supplied) ? supplied : null;

  return {
    kind,
    title: slotText(slots.title, copy.title),
    description: slotText(slots.description, copy.description),
    count,
    showsCount: count !== null,
  };
}
