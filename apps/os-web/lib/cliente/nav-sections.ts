export const CLIENTE360_NAV_SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'operacion', label: 'Operación' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'historial', label: 'Historial' },
] as const;

export type Cliente360NavSectionId = (typeof CLIENTE360_NAV_SECTIONS)[number]['id'];

export const CLIENTE360_DEFAULT_TAB: Cliente360NavSectionId = 'resumen';

export function isCliente360NavSection(id: string): id is Cliente360NavSectionId {
  return CLIENTE360_NAV_SECTIONS.some((section) => section.id === id);
}

/** Parse `?tab=` (or legacy hash-mapped value). Invalid → resumen. */
export function parseCliente360Tab(
  raw: string | string[] | undefined | null,
): Cliente360NavSectionId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === 'string' && isCliente360NavSection(value)) return value;
  return CLIENTE360_DEFAULT_TAB;
}
