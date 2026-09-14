/** Employee-facing Spanish labels for workforce read surfaces. */

export function memberDisplayName(
  displayName: string,
  givenName: string,
  familyName: string,
): string {
  const trimmed = displayName.trim();
  if (trimmed) return trimmed;
  const composed = [givenName, familyName].filter(Boolean).join(' ').trim();
  return composed || 'Sin nombre';
}

export function formatAccessStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'suspended':
      return 'Suspendido';
    case 'revoked':
      return 'Acceso revocado';
    case 'invited':
      return 'Invitación pendiente';
    case 'terminated':
      return 'Finalizado';
    default:
      return 'Acceso registrado';
  }
}

export function formatEmploymentStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'En actividad';
    case 'pending_start':
      return 'Por iniciar';
    case 'terminated':
      return 'Relación finalizada';
    case 'leave':
      return 'Ausencia';
    default:
      return 'Estado de relación';
  }
}

export function accessStatusTone(
  status: string,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (status === 'active') return 'success';
  if (status === 'suspended' || status === 'invited') return 'warning';
  if (status === 'revoked' || status === 'terminated') return 'danger';
  return 'neutral';
}

export function formatRoleKey(roleKey: string): string {
  switch (roleKey) {
    case 'org.admin':
      return 'Administrador';
    case 'people.admin':
      return 'Administración de personas';
    case 'sales_rep':
      return 'Ventas';
    case 'sales_manager':
      return 'Jefe de ventas';
    case 'commercial.team.read':
      return 'Lectura comercial del equipo';
    case 'commercial.org.read':
      return 'Lectura comercial de la empresa';
    case 'finance.admin':
      return 'Finanzas';
    case 'operations':
      return 'Operaciones';
    case 'master_data.admin':
      return 'Datos maestros';
    case 'fiscal.admin':
      return 'Fiscal';
    case 'integration.admin':
      return 'Integraciones';
    case 'commercial.order.convert':
      return 'Conversión de pedidos';
    case 'commercial.account.reassign':
      return 'Reasignación de cuentas';
    default:
      return 'Rol del sistema';
  }
}

export function formatRoleKeys(roleKeys: string[]): string {
  if (roleKeys.length === 0) return 'Sin rol asignado';
  return roleKeys.map(formatRoleKey).join(', ');
}

export function formatCapabilityState(state: string): string {
  switch (state) {
    case 'ACTIVE':
      return 'Disponible';
    case 'LOCKED':
      return 'Bloqueado';
    case 'NOT_CONFIGURED':
      return 'No configurado';
    case 'FUTURE':
      return 'Próximamente';
    case 'DEGRADED':
      return 'Degradado';
    case 'DEPRECATED':
      return 'Descontinuado';
    case 'APPROVED':
      return 'Aprobado';
    case 'CONNECTING':
      return 'En conexión';
    default:
      return 'Sin detalle';
  }
}

const CAPABILITY_LABELS: Record<string, string> = {
  finance: 'Finanzas',
  messaging: 'Mensajes',
  warehouse: 'Almacén',
  commercial: 'Ventas comerciales',
  workforce: 'Equipo',
  partygraph: 'Clientes',
  work: 'Trabajo',
  territory: 'Territorio',
  production: 'Producción',
  integrations: 'Integraciones',
};

const CAPABILITY_DESCRIPTIONS: Record<string, string> = {
  territory: 'Cobertura territorial. Todavía no está habilitada.',
  production: 'Operación de producción. Todavía no está habilitada.',
  integrations: 'Conexiones con otros sistemas. Todavía no están configuradas.',
};

export function formatCapabilityLabel(capabilityKey: string): string {
  return CAPABILITY_LABELS[capabilityKey] ?? 'Función del sistema';
}

export function formatCapabilityDescription(capabilityKey: string): string {
  return CAPABILITY_DESCRIPTIONS[capabilityKey] ?? 'Disponibilidad registrada para su empresa.';
}

export function capabilityStateTone(
  state: string,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  if (state === 'ACTIVE') return 'success';
  if (state === 'FUTURE') return 'info';
  if (state === 'LOCKED' || state === 'NOT_CONFIGURED') return 'warning';
  if (state === 'DEGRADED' || state === 'DEPRECATED') return 'danger';
  return 'neutral';
}

export function formatTimestamp(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
  }).format(date);
}

export const FILTERABLE_ACCESS_STATUSES = [
  'active',
  'suspended',
  'revoked',
  'invited',
] as const;

export const FILTERABLE_EMPLOYMENT_STATUSES = ['active', 'pending_start', 'terminated'] as const;

export function accessStatusExplanation(accessStatus: string, employmentStatus: string): string | null {
  if (accessStatus === 'suspended' && employmentStatus !== 'terminated') {
    return 'Acceso suspendido temporalmente. La relación laboral puede seguir activa.';
  }
  if (accessStatus === 'invited') {
    return 'La invitación está pendiente y la cuenta no está activada. La persona debe completar el acceso en el correo que envía el proveedor de acceso. Esta aplicación no crea ni restablece contraseñas. El acceso sigue pendiente hasta que el proveedor vincule la identidad.';
  }
  if (accessStatus === 'revoked' || employmentStatus === 'terminated') {
    return 'Relación laboral finalizada o acceso revocado de forma permanente.';
  }
  return null;
}
