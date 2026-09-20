/** Exact Task-7 human section labels — do not rename. */
export const ENTREGA_PAGE_SECTIONS = [
  { id: 'entregas-pendientes', label: 'Pendientes' },
  { id: 'entregas-notas', label: 'Notas de entrega' },
  { id: 'entregas-salidas', label: 'Salidas' },
  { id: 'entregas-entregas', label: 'Entregas' },
  { id: 'entregas-historial', label: 'Historial' },
] as const;

export type EntregaPageSectionId = (typeof ENTREGA_PAGE_SECTIONS)[number]['id'];
