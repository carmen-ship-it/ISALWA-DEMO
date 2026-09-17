/**
 * Lanes this worker did not invent an API for.
 * Absence is the result. Do not fill these with placeholder hits.
 */
export const PRODUCTIVITY_NOT_IMPLEMENTED = [
  {
    id: 'org-what-changed',
    reason: 'No hay un historial de organización. Qué cambió solo existe para un cliente ya autorizado.',
  },
  {
    id: 'commitments',
    reason: 'No hay API de compromisos. No se cuenta ni se marca un compromiso cumplido.',
  },
  {
    id: 'overdue-follow-up-view',
    reason: 'Seguimientos vencidos no tienen clave de URL. No se edita url-state.',
  },
  {
    id: 'my-customers-view',
    reason: 'La lista de clientes no filtra por responsable.',
  },
  {
    id: 'unconfirmed-reported-payments',
    reason: 'No hay lista de pagos reportados en esta vía.',
  },
  {
    id: 'report-builder',
    reason: 'No es un constructor de reportes.',
  },
  {
    id: 'whatsapp-search',
    reason:
      'No hay WhatsApp en vivo. La búsqueda de conversaciones solo cubre registros de empresa y demostración vía /conversaciones.',
  },
  {
    id: 'global-contact-search',
    reason: 'No hay índice de contactos. Un contacto aparece solo si el detalle autorizado del cliente ya lo trae y coincide.',
  },
  {
    id: 'global-location-search',
    reason: 'Las ubicaciones solo se consultan para un cliente ya conocido. No hay mapa nuevo.',
  },
  {
    id: 'team-coverage-picker',
    reason: 'Un responsable de equipo no tiene búsqueda acotada de miembros. La cobertura de otra persona queda en administración; la propia usa la sesión.',
  },
  {
    id: 'member-directory-typeahead',
    reason:
      'Picker de miembros activos usa búsqueda servidor (/members/active-options?q=). El directorio admin completo sigue siendo people.admin con consulta acotada.',
  },
  {
    id: 'coverage-reassignment',
    reason: 'La cobertura no reasigna trabajo.',
  },
  {
    id: 'other-member-list-deeplink',
    reason: 'No hay clave de URL por responsable. La cobertura de otra persona no abre la lista del usuario.',
  },
] as const;

export type ProductivityGapId = (typeof PRODUCTIVITY_NOT_IMPLEMENTED)[number]['id'];

export function productivityGap(id: ProductivityGapId): string {
  return PRODUCTIVITY_NOT_IMPLEMENTED.find((item) => item.id === id)?.reason ?? id;
}
