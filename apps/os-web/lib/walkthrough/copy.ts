/** Chrome for Modo guiado. No names, numbers, or search suggestions. */

export const GUIDE_CHROME = {
  kicker: 'Modo guiado',
  title: 'Recorrido del piloto',
  continue: 'Continuar',
  close: 'Cerrar',
  /** Retired floating full-tour launcher — Story Mode owns the full recorrido. */
  show: 'Ver recorrido completo',
  reset: 'Restablecer recorrido',
  replay: 'Repetir',
  ayuda: 'Repetir desde Ayuda',
  localNote: 'El avance queda en este navegador. No es un registro de la empresa.',
  routePill: 'En esta rama',
  wavePill: 'En esta ola',
  patternPill: 'Sin ejemplo',
  closeLabel: 'Cerrar recorrido',
} as const;

// ---------- First-use intro copy ----------

export const INTRO_COPY = {
  /** Welcome modal (step 0) */
  welcome: {
    title: 'Bienvenido a ISALWA',
    body: 'ISALWA reúne clientes, trabajo, decisiones y operación en un solo lugar para que puedas entender qué está pasando, qué necesita atención y qué debería pasar después.',
    secondary: 'Te voy a mostrar lo esencial usando información real de la empresa. El recorrido dura pocos minutos y puedes salir cuando quieras.',
    primary: 'Conocer ISALWA',
    skip: 'Explorar por mi cuenta',
    footer: 'Puedes repetir este recorrido desde Ayuda.',
  },
  /** Step 1: Inicio */
  inicio: {
    title: 'Este es tu punto de partida',
    body: 'Inicio prioriza lo que merece atención según tu acceso y tu trabajo. No todas las personas ven exactamente lo mismo.',
    secondary: 'La idea no es revisar todo. Es saber rápidamente dónde deberías mirar primero.',
    cta: 'Ver clientes',
  },
  /** Step 2: Clientes list */
  clientes: {
    title: 'Aquí están tus clientes',
    body: 'Desde aquí puedes buscar clientes y entrar a toda la información que ISALWA tiene sobre cada relación.',
    cta: 'Ver cliente',
  },
  /** Step 3: Cliente 360 */
  cliente360: {
    title: 'Todo lo importante del cliente, en un solo lugar',
    body: 'Cliente 360 reúne contacto, ubicación, responsable, actividad y las distintas cosas que puedan ir ocurriendo con esta relación.',
    secondary: 'A medida que ISALWA se use, aquí también aparecerán oportunidades, cotizaciones, pedidos, trabajo y decisiones relacionadas con el cliente.',
    emptySections: {
      opportunities: 'Todavía no hay oportunidades activas para este cliente.',
      quotes: 'Todavía no hay cotizaciones activas.',
      orders: 'Todavía no hay pedidos activos para este cliente.',
      work: 'Todavía no hay trabajo registrado.',
    },
    cta: 'Siguiente',
  },
  /** Step 4: Next action */
  nextAction: {
    title: '¿Y ahora qué?',
    body: 'ISALWA intenta ayudarte a encontrar el siguiente paso, no solo mostrarte información.',
    noAction: 'No hay una acción pendiente identificada en este momento.',
    cta: 'Ver mapa',
  },
  /** Step 5: Mapa */
  mapa: {
    title: 'Entiende dónde están tus clientes y qué información todavía falta',
    bodyTemplate: (withCoords: number, total: number) =>
      `Hoy ISALWA tiene coordenadas confirmadas para ${withCoords} de ${total} clientes.`,
    bodyFallback: 'Hoy ISALWA muestra la cobertura de ubicación a partir de coordenadas confirmadas.',
    secondary:
      'Los demás clientes siguen disponibles en la lista si existe información de ubicación registrada, pero ISALWA no inventa un punto en el mapa cuando no tiene coordenadas confirmadas.',
    providerBlocked: {
      title: 'Vista geográfica en preparación',
      body: 'La información de ubicación ya está organizada. La visualización completa sobre mapa podrá activarse cuando se conecte el proveedor geográfico.',
    },
    cta: 'Ir a Ayuda',
  },
  /** Step 6: Ayuda (final) */
  ayuda: {
    title: 'No necesitas aprender todo hoy',
    body: 'Cuando entres por primera vez a una sección nueva, ISALWA puede explicarte solamente lo necesario para trabajar ahí.',
    affordances: [
      'Repetir introducción',
      'Recorrido de esta página',
      'Modo aprendizaje',
      'Glosario',
      'Cómo funcionan los accesos',
    ],
    final: 'Listo. Ya conoces lo esencial.',
    finalSecondary: 'El resto lo puedes ir descubriendo mientras trabajas.',
    cta: 'Entrar a ISALWA',
  },
} as const;

// ---------- Learning Mode copy ----------

export const LEARNING_MODE_COPY = {
  label: 'Modo aprendizaje',
  description: 'Actívalo cuando quieras ver explicaciones adicionales mientras trabajas.',
  secondary: 'Puedes apagarlo cuando ya te sientas cómodo.',
} as const;

// ---------- Page micro-tour content ----------

export type MicroTourStep = {
  target?: string;
  title?: string;
  body: string;
};

export type MicroTour = {
  pageId: string;
  /** Role keys required to see this tour. Empty = any role. */
  roleKeys: readonly string[];
  /** Trigger only when page has meaningful content. */
  triggerWhenEmpty: boolean;
  steps: readonly MicroTourStep[];
};

/** Page micro-tours: 2-4 steps each, triggered on first visit with access. */
export const PAGE_MICRO_TOURS: readonly MicroTour[] = [
  {
    pageId: 'produccion',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'produccion-save', body: 'Aquí se registran movimientos operativos de producción.' },
      { body: 'Esta acción guarda un registro operativo; no reemplaza un sistema industrial especializado.' },
      { body: 'Aquí puedes revisar quién registró qué y cuándo.' },
    ],
  },
  {
    pageId: 'almacen',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'almacen-actions', body: 'Aquí puedes registrar recepción, asignación y salida según tu acceso.' },
      { body: 'ISALWA conserva el responsable y el momento del registro.' },
      { body: 'Estos registros no deben presentarse como inventario contable oficial si esa fuente todavía no forma parte de ISALWA.' },
    ],
  },
  {
    pageId: 'compras',
    roleKeys: ['org.admin', 'operations'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'compras-filter', body: 'Esta es la cola de compras.' },
      { body: 'Puedes filtrar por estado y ver qué requiere atención.' },
      { body: 'Esta vista organiza trabajo de compras; no representa inventario oficial.' },
    ],
  },
  {
    pageId: 'coordinacion',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'coordination-history', body: 'Aquí se preservan decisiones importantes.' },
      { body: 'Una decisión puede guardar quién decidió, cuándo y el motivo cuando fue proporcionado.' },
      { body: 'ISALWA nunca inventa la razón de una decisión.' },
    ],
  },
  {
    pageId: 'finanzas',
    roleKeys: ['org.admin', 'finance.admin'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'finance-provenance', body: 'Aquí se registra información financiera operativa o reportada.' },
      { body: 'ISALWA no reemplaza la contabilidad ni el sistema fiscal oficial.' },
      { body: 'Que un cliente indique “ya pagué” no significa que el pago esté confirmado.' },
    ],
  },
  {
    pageId: 'aprobaciones',
    roleKeys: ['org.admin', 'sales_manager', 'operations'],
    triggerWhenEmpty: true,
    steps: [
      { target: 'approval-actions', body: 'Aquí aparecen decisiones que requieren aprobación.' },
      { body: 'Aprobar registra una decisión.' },
      { body: 'Aprobar no crea automáticamente un pedido.' },
    ],
  },
  {
    pageId: 'aprobaciones-readonly',
    roleKeys: [],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Aquí aparecen decisiones que requieren aprobación.' },
      { body: 'Puedes revisar el estado; las acciones de aprobar o rechazar solo aparecen si tu acceso lo permite.' },
    ],
  },
  {
    pageId: 'entregas',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Esta vista muestra entregas con el contexto de cliente y pedido cuando está disponible.' },
      { body: 'Revisa estado, responsable y, si existe, ubicación o timing registrados.' },
      { body: 'No implica un proveedor logístico activo mientras esa integración no exista.' },
    ],
  },
  {
    pageId: 'productos',
    roleKeys: [],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Aquí está la información de productos disponible en ISALWA.' },
      { body: 'Usa búsqueda y estado cuando estén presentes en esta vista.' },
      { body: 'No implica stock contable oficial si esa fuente todavía no forma parte de ISALWA.' },
    ],
  },
  {
    pageId: 'trabajo',
    roleKeys: [],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Aquí puedes buscar, filtrar y ordenar trabajo según los controles disponibles.' },
      { body: 'Revisa responsable, estado, vencimiento o antigüedad cuando aparezcan.' },
      { body: 'El siguiente paso solo se muestra cuando ISALWA puede determinarlo.' },
    ],
  },
  {
    pageId: 'oportunidades',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read'],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Una oportunidad representa una posibilidad comercial que el equipo está trabajando.' },
    ],
  },
  {
    pageId: 'cotizaciones',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read'],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Una cotización puede mostrar número, cliente, responsable, estado, monto y PDF según lo disponible.' },
      { body: 'Aprobar registra la decisión. No crea un pedido automáticamente.' },
      { body: 'Convertir a pedido crea el pedido cuando la cotización y tu acceso lo permiten.' },
    ],
  },
  {
    pageId: 'pedidos',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read', 'operations'],
    triggerWhenEmpty: true,
    steps: [
      { body: 'Los pedidos muestran el estado operativo actual registrado en ISALWA.' },
      { body: 'No se afirma integración logística o financiera si esa conexión no existe.' },
    ],
  },
] as const;

/** Route prefix → page micro-tour id. */
export const PAGE_TOUR_ROUTES: ReadonlyArray<{ prefix: string; pageId: string }> = [
  { prefix: '/produccion', pageId: 'produccion' },
  { prefix: '/almacen', pageId: 'almacen' },
  { prefix: '/compras', pageId: 'compras' },
  { prefix: '/coordinacion', pageId: 'coordinacion' },
  { prefix: '/finanzas', pageId: 'finanzas' },
  { prefix: '/aprobaciones', pageId: 'aprobaciones' },
  { prefix: '/entregas', pageId: 'entregas' },
  { prefix: '/productos', pageId: 'productos' },
  { prefix: '/trabajo', pageId: 'trabajo' },
  { prefix: '/oportunidades', pageId: 'oportunidades' },
  { prefix: '/cotizaciones', pageId: 'cotizaciones' },
  { prefix: '/pedidos', pageId: 'pedidos' },
];

export function pageIdFromPathname(pathname: string): string | null {
  for (const entry of PAGE_TOUR_ROUTES) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return entry.pageId;
    }
  }
  return null;
}

export function getMicroTourForPage(pageId: string): MicroTour | null {
  return PAGE_MICRO_TOURS.find((tour) => tour.pageId === pageId) ?? null;
}

export function canViewMicroTour(
  tour: MicroTour,
  viewerRoleKeys: readonly string[],
  openHrefs: readonly string[] = [],
): boolean {
  if (tour.roleKeys.length === 0) return true;
  if (viewerRoleKeys.includes('org.admin')) return true;
  if (viewerRoleKeys.length > 0) {
    return tour.roleKeys.some((key) => viewerRoleKeys.includes(key));
  }
  // When role keys are not injected, treat reachable nav as access proof.
  const route = PAGE_TOUR_ROUTES.find((entry) => entry.pageId === tour.pageId);
  if (!route) return false;
  return openHrefs.some(
    (href) => href === route.prefix || href.startsWith(`${route.prefix}/`) || href.startsWith(route.prefix),
  );
}

export function progressLabel(index: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), safeTotal - 1);
  return `${safeIndex + 1} / ${safeTotal}`;
}

export function replayLabel(title: string): string {
  return `${GUIDE_CHROME.replay} ${title}`;
}
