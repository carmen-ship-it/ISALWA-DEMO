/** Chrome for Modo guiado. No names, numbers, or search suggestions. */

export const GUIDE_CHROME = {
  kicker: 'Modo guiado',
  title: 'Recorrido del piloto',
  continue: 'Continuar',
  close: 'Cerrar',
  show: 'Mostrar recorrido',
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
      opportunities: 'Todavía no hay oportunidades.',
      quotes: 'Todavía no hay cotizaciones.',
      orders: 'Todavía no hay pedidos.',
      work: 'Todavía no hay trabajo registrado.',
    },
    cta: 'Siguiente',
  },
  /** Step 4: Next action */
  nextAction: {
    body: 'ISALWA intenta ayudarte a encontrar el siguiente paso, no solo mostrarte información.',
    noAction: 'No hay una acción pendiente identificada en este momento.',
    cta: 'Ver mapa',
  },
  /** Step 5: Mapa */
  mapa: {
    title: 'Entiende dónde están tus clientes y qué información todavía falta',
    /** Dynamic: "{withCoords} de {total} clientes activos tienen coordenadas." */
    bodyTemplate: (withCoords: number, total: number) =>
      `${withCoords} de ${total} clientes activos tienen coordenadas.`,
    bodyFallback: 'El mapa muestra clientes con coordenadas confirmadas.',
    secondary: 'Los demás clientes siguen disponibles en la lista si existe información de ubicación registrada, pero ISALWA no inventa un punto en el mapa cuando no tiene coordenadas confirmadas.',
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
    triggerWhenEmpty: false,
    steps: [
      { title: 'Producción', body: 'Esta pantalla agrupa el trabajo pendiente de producción sin afirmar flujo final.' },
      { body: 'Lo que aparece aquí depende de lo que ya esté registrado. Si no hay trabajo, no se inventa.' },
    ],
  },
  {
    pageId: 'almacen',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Almacén', body: 'El almacén muestra existencias conocidas y asignaciones pendientes.' },
      { body: 'Asignar no es recibir. Salida de almacén es diferente a entrega.' },
    ],
  },
  {
    pageId: 'compras',
    roleKeys: ['org.admin', 'operations'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Compras', body: 'Compras registra necesidades identificadas y pedidos a proveedores.' },
      { body: 'Esta sección depende de permisos y datos existentes.' },
    ],
  },
  {
    pageId: 'coordinacion',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Coordinación', body: 'Coordinación reúne decisiones pendientes y seguimientos.' },
      { body: 'Una decisión registrada no es lo mismo que una aprobación formal.' },
    ],
  },
  {
    pageId: 'finanzas',
    roleKeys: ['org.admin', 'finance.admin'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Finanzas', body: 'Esta sección muestra información financiera según tu acceso.' },
      { body: 'Los montos dependen de datos reales registrados, no de proyecciones inventadas.' },
    ],
  },
  {
    pageId: 'aprobaciones',
    roleKeys: ['org.admin', 'sales_manager', 'operations'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Aprobaciones', body: 'Las aprobaciones pendientes aparecen aquí si tienes autoridad para decidir.' },
      { body: 'Aprobar tiene consecuencias. No es solo cambiar un estado.' },
    ],
  },
  {
    pageId: 'entregas',
    roleKeys: ['org.admin', 'operations', 'sales_manager'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Entregas', body: 'Esta pantalla muestra entregas programadas y pendientes.' },
      { body: 'Una salida de almacén no es lo mismo que una entrega confirmada al cliente.' },
    ],
  },
  {
    pageId: 'productos',
    roleKeys: [],
    triggerWhenEmpty: true,
    steps: [
      { title: 'Productos', body: 'El catálogo de productos disponibles para cotizar y vender.' },
      { body: 'Solo aparecen productos ya registrados. ISALWA no inventa un catálogo.' },
    ],
  },
  {
    pageId: 'trabajo',
    roleKeys: [],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Trabajo', body: 'Tu trabajo pendiente y seguimientos aparecen aquí.' },
      { body: 'Lo que ves depende de lo que te han asignado o lo que has creado.' },
    ],
  },
  {
    pageId: 'oportunidades',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Oportunidades', body: 'Las oportunidades comerciales activas de la empresa.' },
      { body: 'Una oportunidad no es una cotización ni un pedido. Es el inicio del proceso.' },
    ],
  },
  {
    pageId: 'cotizaciones',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Cotizaciones', body: 'Las cotizaciones en proceso o enviadas al cliente.' },
      { body: 'Un borrador no es lo mismo que una cotización enviada. Un envío no es un pedido.' },
    ],
  },
  {
    pageId: 'pedidos',
    roleKeys: ['org.admin', 'sales_rep', 'sales_manager', 'commercial.team.read', 'commercial.org.read', 'operations'],
    triggerWhenEmpty: false,
    steps: [
      { title: 'Pedidos', body: 'Pedidos confirmados de clientes.' },
      { body: 'Un pedido existe cuando una cotización fue convertida. No antes.' },
    ],
  },
] as const;

export function getMicroTourForPage(pageId: string): MicroTour | null {
  return PAGE_MICRO_TOURS.find((tour) => tour.pageId === pageId) ?? null;
}

export function canViewMicroTour(tour: MicroTour, viewerRoleKeys: readonly string[]): boolean {
  if (tour.roleKeys.length === 0) return true;
  if (viewerRoleKeys.includes('org.admin')) return true;
  return tour.roleKeys.some((key) => viewerRoleKeys.includes(key));
}

export function progressLabel(index: number, total: number): string {
  const safeTotal = Math.max(total, 1);
  const safeIndex = Math.min(Math.max(index, 0), safeTotal - 1);
  return `${safeIndex + 1} / ${safeTotal}`;
}

export function replayLabel(title: string): string {
  return `${GUIDE_CHROME.replay} ${title}`;
}
