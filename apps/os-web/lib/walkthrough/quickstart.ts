/** Role-aware quick starts — instructional only; no automatic records. */

export type RoleQuickstartId = 'asesor' | 'produccion' | 'almacen' | 'entregas';

export type RoleQuickstart = {
  id: RoleQuickstartId;
  title: string;
  steps: readonly string[];
};

export const ROLE_QUICKSTARTS: Record<RoleQuickstartId, RoleQuickstart> = {
  asesor: {
    id: 'asesor',
    title: 'Inicio rápido · Asesor comercial',
    steps: [
      'Buscar o crear cliente',
      'Registrar oportunidad',
      'Crear cotización',
      'Registrar envío',
      'Programar seguimiento',
      'Convertir a pedido cuando el cliente acepte',
    ],
  },
  produccion: {
    id: 'produccion',
    title: 'Inicio rápido · Producción',
    steps: [
      'Ver trabajo o contexto asignado',
      'Registrar actualización',
      'Registrar fecha esperada si la conoce',
      'Reportar incidencia si hace falta',
    ],
  },
  almacen: {
    id: 'almacen',
    title: 'Inicio rápido · Almacén',
    steps: [
      'Revisar trabajo asignado',
      'Registrar ingreso terminado',
      'Revisar salidas',
      'Registrar incidencia si hace falta',
    ],
  },
  entregas: {
    id: 'entregas',
    title: 'Inicio rápido · Entregas',
    steps: [
      'Revisar notas de entrega',
      'Registrar salida donde esté autorizado',
      'Registrar entrega',
      'Registrar recibido por',
    ],
  },
};

export function quickstartForRole(roleKey: string | null | undefined): RoleQuickstart | null {
  const key = roleKey?.trim() ?? '';
  if (!key) return null;
  if (key in ROLE_QUICKSTARTS) return ROLE_QUICKSTARTS[key as RoleQuickstartId];
  if (key === 'production' || key === 'prod') return ROLE_QUICKSTARTS.produccion;
  if (key === 'warehouse') return ROLE_QUICKSTARTS.almacen;
  if (key === 'delivery') return ROLE_QUICKSTARTS.entregas;
  if (key === 'advisor' || key === 'commercial') return ROLE_QUICKSTARTS.asesor;
  return null;
}
