/**
 * Recorrido del piloto. One journey at a time, not a page overlay catalog.
 * Copy stays generic: no customer names, order numbers, or search suggestions.
 * Progress is not stored here — see persistence.ts (browser-local UI state).
 */

/** Concrete pages on this branch. Do not add an id to invent a screen. */
export const GUIDE_ROUTES_IN_BRANCH = [
  '/clientes',
  '/cotizaciones',
  '/inicio',
  '/produccion',
  '/almacen',
  '/entregas',
  '/coordinacion',
] as const;

export type BranchRoute = (typeof GUIDE_ROUTES_IN_BRANCH)[number];

export const WAVE_PENDING =
  'Esta página forma parte de esta ola. Continuar no abre una pantalla inventada.';

export const PATTERN_PENDING =
  'El pedido se abre en el cliente que ya lo tiene. Continuar no inventa un número ni una pantalla de ejemplo.';

export type StopKind = 'route' | 'pattern' | 'wave';

export type GuideStop = {
  id: string;
  kind: StopKind;
  title: string;
  body: string;
  /** Set only when this branch has a page that does not need an invented id. */
  href: BranchRoute | null;
  pending: string | null;
};

export type Journey = {
  id: string;
  order: number;
  title: string;
  summary: string;
  /**
   * When the caller passes role keys, a journey with no concrete page is hidden
   * unless the viewer has one of these keys (or org.admin).
   */
  roleKeys: readonly string[];
  /** Hide when the viewer cannot open this existing page. */
  requiresHref: BranchRoute | null;
  stops: readonly GuideStop[];
};

const COMMERCIAL = [
  'org.admin',
  'people.admin',
  'sales_rep',
  'sales_manager',
  'commercial.team.read',
  'commercial.org.read',
  'commercial.order.convert',
  'operations',
] as const;

const FLOOR = ['org.admin', 'operations', 'sales_manager'] as const;

const PROBLEM = [...COMMERCIAL, ...FLOOR] as const;

function routeStop(
  id: string,
  title: string,
  body: string,
  href: BranchRoute,
): GuideStop {
  return { id, kind: 'route', title, body, href, pending: null };
}

function blockedStop(
  id: string,
  kind: 'pattern' | 'wave',
  title: string,
  body: string,
  pending: string,
): GuideStop {
  return { id, kind, title, body, href: null, pending };
}

export const JOURNEYS: readonly Journey[] = [
  {
    id: 'vender',
    order: 1,
    title: 'Vender',
    summary: 'De clientes a cotizaciones. No inventa un cliente ni un precio.',
    roleKeys: COMMERCIAL,
    requiresHref: '/clientes',
    stops: [
      routeStop('clientes', 'Clientes', 'Abre la lista de clientes.', '/clientes'),
      routeStop(
        'cotizaciones',
        'Cotizaciones',
        'Abre cotizaciones. Este recorrido no muestra precios.',
        '/cotizaciones',
      ),
    ],
  },
  {
    id: 'pedido',
    order: 2,
    title: 'Atender un pedido',
    summary: 'Un pedido se abre en el cliente que ya lo tiene.',
    roleKeys: COMMERCIAL,
    requiresHref: '/clientes',
    stops: [
      blockedStop(
        'pedido',
        'pattern',
        'Pedido',
        PATTERN_PENDING,
        PATTERN_PENDING,
      ),
    ],
  },
  {
    id: 'produccion',
    order: 3,
    title: 'Producción',
    summary: 'Abre producción. Una quema no es un pedido. Continuar no afirma escritura publicada.',
    roleKeys: FLOOR,
    requiresHref: '/produccion',
    stops: [
      routeStop(
        'produccion',
        'Producción',
        'Abre producción. No inventa un pedido ni un producto. No afirma persistencia publicada.',
        '/produccion',
      ),
    ],
  },
  {
    id: 'almacen',
    order: 4,
    title: 'Cumplir pedido',
    summary:
      'Abre almacén. Asignar no es recibir. Salida de almacén es distinta. Continuar no afirma escritura publicada.',
    roleKeys: FLOOR,
    requiresHref: '/almacen',
    stops: [
      routeStop(
        'almacen',
        'Almacén',
        'Abre almacén. No inventa existencias ni asigna un pedido. Sin permiso, no ofrece Asignar. Compras sigue bloqueada por Gate C.',
        '/almacen',
      ),
    ],
  },
  {
    id: 'entregar',
    order: 5,
    title: 'Entregar',
    summary:
      'Abre entregas. Salida de almacén no es Entrega. Continuar no inventa salida ni un número de nota.',
    roleKeys: FLOOR,
    requiresHref: '/entregas',
    stops: [
      routeStop(
        'entregar',
        'Entrega',
        'Abre entregas. No inventa un número de nota. Una salida de almacén no es una entrega al cliente.',
        '/entregas',
      ),
    ],
  },
  {
    id: 'problema',
    order: 6,
    title: 'Resolver un problema',
    summary:
      'Se resuelve en el pedido que ya existe, o en coordinación. Coordinación forma parte de esta ola.',
    roleKeys: PROBLEM,
    requiresHref: null,
    stops: [
      blockedStop(
        'problema',
        'wave',
        'Problema',
        'Continuar no inventa un caso ni una pantalla.',
        'Continuar no inventa un caso ni una pantalla. Coordinación forma parte de esta ola.',
      ),
    ],
  },
  {
    id: 'coordinar',
    order: 7,
    title: 'Coordinar',
    summary:
      'Abre coordinación. Registrar una decisión no abre la lectura del tablero histórico.',
    roleKeys: FLOOR,
    requiresHref: '/coordinacion',
    stops: [
      routeStop(
        'coordinar',
        'Coordinación',
        'Abre coordinación. No inventa una decisión ni una reunión. No afirma lectura de decisiones previas.',
        '/coordinacion',
      ),
    ],
  },
  {
    id: 'gerencia',
    order: 8,
    title: 'Gerencia',
    summary: 'Inicio muestra lo que ya requiere atención. No inventa cifras.',
    roleKeys: [
      'org.admin',
      'people.admin',
      'sales_manager',
      'sales_rep',
      'commercial.org.read',
      'commercial.team.read',
      'operations',
    ],
    requiresHref: '/inicio',
    stops: [
      routeStop('inicio', 'Inicio', 'Abre inicio. No inventa cifras.', '/inicio'),
    ],
  },
];

export type GuideViewer = {
  /** Routes the shell already lets this viewer open. Omit when unknown. */
  openHrefs?: readonly string[];
  /** Hide a wave journey this viewer cannot open. Omit when unknown. */
  roleKeys?: readonly string[];
};

export function journeyVisible(journey: Journey, viewer: GuideViewer = {}): boolean {
  if (
    journey.requiresHref &&
    viewer.openHrefs &&
    !viewer.openHrefs.includes(journey.requiresHref)
  ) {
    return false;
  }
  const roleRestricted =
    !journey.requiresHref ||
    journey.id === 'produccion' ||
    journey.id === 'almacen' ||
    journey.id === 'entregar' ||
    journey.id === 'coordinar';
  if (roleRestricted && viewer.roleKeys && viewer.roleKeys.length > 0) {
    const allowed = new Set<string>([...journey.roleKeys, 'org.admin']);
    if (!viewer.roleKeys.some((key) => allowed.has(key))) return false;
  }
  return true;
}

export function journeysForViewer(viewer: GuideViewer = {}): Journey[] {
  return JOURNEYS.filter((journey) => journeyVisible(journey, viewer));
}

export function journeyById(id: string | null | undefined): Journey | null {
  if (!id) return null;
  return JOURNEYS.find((journey) => journey.id === id) ?? null;
}

export function isBranchRoute(href: string): href is BranchRoute {
  return (GUIDE_ROUTES_IN_BRANCH as readonly string[]).includes(href);
}
