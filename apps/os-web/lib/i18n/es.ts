export const es = {
  app: {
    name: 'ISALWA',
    tagline: 'Sistema operativo de su empresa',
  },
  nav: {
    inicio: 'Inicio',
    clientes: 'Clientes',
    oportunidades: 'Oportunidades',
    cotizaciones: 'Cotizaciones',
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
    emptyInicio: 'Sin actividad comercial todavía',
    emptyInicioHint:
      'Empiece por clientes, oportunidades o cotizaciones para ver el día comercial aquí.',
    emptyOportunidades: 'Sin oportunidades abiertas',
    emptyCotizaciones: 'Sin cotizaciones',
    emptyClientes: 'Todavía no hay clientes registrados.',
    emptyTrabajo: 'No hay trabajo pendiente.',
    emptyAprobaciones: 'No hay aprobaciones pendientes.',
    emptyAdmin: 'Las herramientas de administración estarán disponibles en próximas versiones.',
    actionFailed: 'No se pudo completar la acción. Intente de nuevo.',
    goToLogin: 'Ir a iniciar sesión',
    goToClientes: 'Ir a Clientes',
    goToClientesAttention: 'Ir a clientes',
    viewWork: 'Ver trabajo',
    viewOpportunities: 'Ver oportunidades',
    viewQuotes: 'Ver cotizaciones',
    retry: 'Reintentar',
  },
  pages: {
    inicio: {
      title: 'Inicio',
      kicker: 'Hoy',
      description: '¿Qué necesita tu atención ahora?',
      attention: 'Necesita tu atención',
      attentionEmpty: 'No tienes pendientes que requieran atención ahora.',
      attentionUnavailable: 'No se pudo cargar lo que necesita tu atención.',
      attentionMore: 'Hay más pendientes.',
      attentionOverdue: 'Vencidos',
      attentionReassigned: 'Reasignados a mí',
      attentionApprovals: 'Aprobaciones pendientes para mí',
      attentionOpen: 'Otros pendientes abiertos',
      attentionOther: 'Pendiente',
      teamKicker: 'Equipo',
      teamTitle: 'Atención del equipo',
      teamDescription:
        'Lectura de oportunidades, cotizaciones, trabajo y seguimientos de las personas a su cargo directo.',
      orgKicker: 'Empresa',
      orgTitle: 'Vista comercial',
      orgDescription:
        'Lectura de oportunidades, cotizaciones y trabajo abiertos de la empresa. Sin cambios ni aprobaciones.',
      leadershipReadOnly: 'Solo lectura.',
      leadershipUnavailable: 'No se pudo cargar esta vista.',
      leadershipEmpty: 'No hay registros en esta lista.',
      leadershipMore: 'Hay más.',
      teamOpportunities: 'Oportunidades abiertas del equipo',
      teamQuotesDraft: 'Cotizaciones borrador del equipo',
      teamQuotesSubmitted: 'Cotizaciones enviadas del equipo',
      teamWork: 'Trabajo abierto del equipo',
      teamOverdue: 'Trabajo vencido del equipo',
      teamFollowUp: 'Seguimientos del equipo',
      orgOpportunities: 'Oportunidades abiertas',
      orgQuotesDraft: 'Cotizaciones borrador',
      orgQuotesSubmitted: 'Cotizaciones enviadas',
      orgWork: 'Trabajo abierto',
      orgOverdue: 'Trabajo vencido',
      orgFollowUp: 'Seguimientos',
      opportunities: 'Oportunidades activas',
      quotesDraft: 'Cotizaciones borrador',
      quotesSubmitted: 'Cotizaciones enviadas',
      work: 'Trabajo abierto',
      approvals: 'Aprobaciones',
    },
    clientes: {
      title: 'Clientes',
      kicker: 'Relaciones',
      placeholder: 'Aquí verá y gestionará clientes, contactos y relaciones comerciales.',
    },
    oportunidades: {
      title: 'Oportunidades',
      kicker: 'Comercial',
      description: 'Oportunidades abiertas con cliente, etapa y responsable.',
    },
    cotizaciones: {
      title: 'Cotizaciones',
      kicker: 'Comercial',
      description: 'Borradores y cotizaciones enviadas.',
      filterDraft: 'Borrador',
      filterSubmitted: 'Enviadas',
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
