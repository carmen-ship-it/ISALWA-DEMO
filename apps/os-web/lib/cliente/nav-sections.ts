export const CLIENTE360_NAV_SECTIONS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'operacion', label: 'Operación' },
  { id: 'trabajo', label: 'Trabajo' },
  { id: 'documentos', label: 'Documentos' },
  { id: 'historial', label: 'Historial' },
] as const;

export type Cliente360NavSectionId = (typeof CLIENTE360_NAV_SECTIONS)[number]['id'];

export function isCliente360NavSection(id: string): id is Cliente360NavSectionId {
  return CLIENTE360_NAV_SECTIONS.some((section) => section.id === id);
}
