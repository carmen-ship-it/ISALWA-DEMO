import { FINANCE_OPERATIONAL_RECORD_SCOPE } from '@isalwa/os-contracts';

/**
 * Operational finance desk copy. Not official accounting, not a ledger,
 * and not an Ingresos panel. Payment claim ≠ confirmed.
 *
 * User-facing strings must never interpolate scope keys like finance.operational.record.
 * The scopeRequired constant exists for code/test use ONLY; it must never render in UI.
 */
export const FINANCE_DESK_COPY = {
  kicker: 'Registro operativo',
  title: 'Finanzas operativas',
  intro:
    'Anote evidencia de pago reportada. No es contabilidad oficial y no confirma cobranza.',
  boundaryOfficial:
    'ISALWA no reemplaza la contabilidad oficial. Este escritorio no publica asientos ni declara ingresos fiscales.',
  boundaryConfirm:
    'Un reclamo de pago no confirma la cobranza. Todo queda pendiente de confirmar.',
  boundaryManual: 'Fuente: registro manual. Procedencia visible. Sin libro mayor.',
  noIngresos:
    'No hay panel de Ingresos aquí. Sin fuente autoritativa no se muestra cobranza como hecha.',
  permissionTitle: 'Sin permiso para el registro operativo',
  permissionRole: 'No tienes permiso para registrar información financiera operativa.',
  permissionSession: 'Hace falta una sesión activa de esta empresa. Otra empresa no se ve aquí.',
  permissionUnconfirmed:
    'No se pudo confirmar el permiso asignado. Sin confirmación de permisos no se abre el escritorio.',
  subjectIntro: 'Elija el pedido, cliente o cotización al que corresponde el reporte. El dato no confirma el pago.',
  subjectType: 'Tipo de sujeto',
  subjectId: 'Pedido / Cliente / Cotización',
  subjectSelectOrder: 'Seleccionar pedido',
  subjectSelectParty: 'Seleccionar cliente',
  subjectSelectQuote: 'Seleccionar cotización',
  subjectEmptyOrders: 'No hay pedidos abiertos disponibles para vincular en este momento.',
  subjectEmptyQuotes: 'No hay cotizaciones disponibles para vincular en este momento.',
  subjectSelected: 'Seleccionado',
  subjectParty: 'Cliente',
  subjectOrder: 'Pedido',
  subjectQuote: 'Cotización',
  emptyFacts: 'Todavía no hay pagos reportados en esta sesión.',
  /** Internal constant for code/tests. Must NEVER render in UI. */
  scopeRequired: FINANCE_OPERATIONAL_RECORD_SCOPE,
} as const;

export const FINANCE_FORBIDDEN_COPY = [
  /\bcobrado\b/i,
  /\bpagado\b/i,
  /pago confirmado/i,
  /pagado confirmado/i,
  /asiento contable/i,
  /factura fiscal/i,
  /contabilidad oficial habilitada/i,
  /ingresos del (d[ií]a|mes|periodo)/i,
  /cobranza confirmada/i,
] as const;
