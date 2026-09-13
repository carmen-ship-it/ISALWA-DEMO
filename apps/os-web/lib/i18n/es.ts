export const es = {
  app: {
    name: 'ISALWA',
    tagline: 'Sistema operativo de su empresa',
  },
  nav: {
    inicio: 'Inicio',
    clientes: 'Clientes',
    trabajo: 'Trabajo',
    aprobaciones: 'Aprobaciones',
    administracion: 'Administración',
    finanzas: 'Finanzas',
    mensajes: 'Mensajes',
    openMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    mainNav: 'Navegación principal',
  },
  login: {
    kicker: 'Acceso seguro',
    title: 'Iniciar sesión',
    description: 'Use su correo corporativo para acceder al sistema.',
    email: 'Correo',
    password: 'Contraseña',
    submit: 'Entrar',
    devSubmit: 'Entrar (desarrollo)',
    devHint: 'Modo desarrollo: crea una sesión local contra os-api sin Supabase.',
    loading: 'Verificando…',
    errorGeneric: 'No se pudo iniciar sesión. Intente de nuevo.',
    errorCredentials: 'Correo o contraseña incorrectos.',
    errorNoMembership: 'Su cuenta no está vinculada a la empresa. Contacte a administración.',
  },
  account: {
    menu: 'Cuenta',
    signOut: 'Cerrar sesión',
    signedInAs: 'Conectado como',
  },
  states: {
    loading: 'Cargando información…',
    sessionExpired: 'Sesión vencida',
    sessionExpiredDesc: 'Por seguridad, vuelva a iniciar sesión para continuar.',
    accessDenied: 'Sin acceso',
    accessDeniedDesc: 'No tiene permiso para ver esta sección.',
    accountInactive: 'Cuenta desactivada',
    accountInactiveDesc: 'Su acceso fue suspendido. Contacte a administración.',
    serviceUnavailable: 'Servicio no disponible',
    serviceUnavailableDesc: 'No pudimos conectar con el sistema. Intente en unos minutos.',
    capabilityLocked: 'Próximamente',
    capabilityLockedDesc: 'Esta función aún no está habilitada para su empresa.',
    empty: 'No hay información todavía',
    emptyInicio: 'No hay pendientes urgentes.',
    emptyInicioHint: 'Cuando haya tareas o aprobaciones, aparecerán aquí.',
    emptyClientes: 'Todavía no hay clientes registrados.',
    emptyTrabajo: 'No hay trabajo pendiente.',
    emptyAprobaciones: 'No hay aprobaciones pendientes.',
    emptyAdmin: 'Las herramientas de administración estarán disponibles en próximas versiones.',
    actionFailed: 'No se pudo completar la acción. Intente de nuevo.',
    goToLogin: 'Ir a iniciar sesión',
    retry: 'Reintentar',
  },
  pages: {
    inicio: {
      title: 'Inicio',
      kicker: 'Su día',
      attention: 'Requiere atención',
      work: 'Trabajo abierto',
      approvals: 'Aprobaciones',
    },
    clientes: {
      title: 'Clientes',
      kicker: 'Relaciones',
      placeholder: 'Aquí verá y gestionará clientes, contactos y relaciones comerciales.',
    },
    trabajo: {
      title: 'Trabajo',
      kicker: 'Operaciones',
      placeholder: 'Aquí verá tareas, seguimientos y trabajo asignado.',
    },
    aprobaciones: {
      title: 'Aprobaciones',
      kicker: 'Decisiones',
      placeholder: 'Aquí revisará y aprobará solicitudes pendientes.',
    },
    administracion: {
      title: 'Administración',
      kicker: 'Configuración',
      placeholder: 'Equipo, relaciones y configuración operativa de su empresa.',
    },
  },
} as const;

export type Messages = typeof es;

export function t(path: string): string {
  const parts = path.split('.');
  let node: unknown = es;
  for (const part of parts) {
    if (typeof node !== 'object' || node === null || !(part in node)) {
      return path;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : path;
}
