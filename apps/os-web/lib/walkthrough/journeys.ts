/**
 * Scenario guidance. One journey at a time, not a page overlay catalog.
 * Copy stays generic: no customer names, order numbers, or search suggestions.
 * Progress is not stored here — see persistence.ts (browser-local UI state).
 */

/** Pages with a page.tsx on this branch. Continuar must not leave this set. */
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

export const MISSING_ROUTE =
  'Continuar no abre una pantalla que no está en esta rama.';

export const PATTERN_PENDING =
  'Abra un cliente y elija un pedido que ya existe. Continuar no inventa un número.';

export type StopKind = 'route' | 'pattern' | 'missing';

export type GuideLens = 'commercial' | 'floor' | 'management' | 'finance' | 'unknown';

export type GuideStop = {
  id: string;
  kind: StopKind;
  title: string;
  body: string;
  /** Role-aware answer to ¿Qué hago ahora? Defaults used when the lens is unknown. */
  now: string;
  nowByLens?: Partial<Record<Exclude<GuideLens, 'unknown'>, string>>;
  /** Set only for a page that exists on this branch and needs no invented id. */
  href: BranchRoute | null;
  pending: string | null;
};

export type Journey = {
  id: string;
  order: number;
  title: string;
  summary: string;
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

const FLOOR = [
  'org.admin',
  'operations',
  'sales_manager',
  'production.operational.record',
  'production.entry.member',
  'warehouse.finished_goods.receive',
  'warehouse.finished_goods.allocate',
  'operations.coordinator.record',
] as const;

const PROBLEM = [...COMMERCIAL, ...FLOOR] as const;

const FINANCE_KEYS = new Set([
  'finance.admin',
  'finance.operational.record',
  'fiscal.admin',
]);

const FLOOR_KEYS = new Set<string>(FLOOR);
const COMMERCIAL_KEYS = new Set<string>(COMMERCIAL);
const MANAGEMENT_KEYS = new Set([
  'org.admin',
  'sales_manager',
  'commercial.org.read',
  'people.admin',
]);

/** Hidden from a finance-only viewer even if the page is in their nav. */
export const FINANCE_HIDDEN_JOURNEY_IDS = [
  'produccion',
  'almacen',
  'entregar',
  'coordinar',
  'problema',
] as const;

const FINANCE_HIDDEN = new Set<string>(FINANCE_HIDDEN_JOURNEY_IDS);

const ROLE_GATED = new Set<string>([
  'produccion',
  'almacen',
  'entregar',
  'coordinar',
  'problema',
]);

function routeStop(
  id: string,
  title: string,
  href: BranchRoute,
  now: string,
  nowByLens?: GuideStop['nowByLens'],
): GuideStop {
  return { id, kind: 'route', title, body: now, now, href, pending: null, nowByLens };
}

function patternStop(
  id: string,
  title: string,
  now: string,
  nowByLens?: GuideStop['nowByLens'],
): GuideStop {
  return {
    id,
    kind: 'pattern',
    title,
    body: now,
    now,
    href: null,
    pending: now,
    nowByLens,
  };
}

const VENDER_CLIENTES: GuideStop['nowByLens'] = {
  commercial: 'Abra clientes. No invente un cliente ni un precio.',
  management: 'Revise clientes. No invente un cliente ni un precio.',
  floor: 'Si atiende una venta, abra clientes. No invente un precio.',
  finance: 'Si el trabajo es comercial, abra clientes. No invente un precio.',
};

const VENDER_COTIZACIONES: GuideStop['nowByLens'] = {
  commercial: 'Abra cotizaciones. No invente un precio.',
  management: 'Revise cotizaciones. No invente un precio.',
  floor: 'Si atiende una venta, abra cotizaciones. No invente un precio.',
  finance: 'Si el trabajo es comercial, abra cotizaciones. No invente un precio.',
};

const PEDIDO_NOW: GuideStop['nowByLens'] = {
  commercial: PATTERN_PENDING,
  management: 'Pida que se abra un pedido que ya existe en el cliente. No invente un número.',
  floor: 'Abra un cliente y elija un pedido que ya existe. No invente un número.',
  finance: 'Si necesita un pedido, ábralo desde el cliente que ya lo tiene. No invente un número.',
};

const PROBLEMA_COORD: GuideStop['nowByLens'] = {
  commercial: 'Abra coordinación. No invente un caso.',
  management: 'Abra coordinación. No invente un caso ni una decisión.',
  floor: 'Abra coordinación. No invente un caso.',
  finance: 'No invente un caso. Esta guía no abre coordinación para finanzas.',
};

const PROBLEMA_PEDIDO: GuideStop['nowByLens'] = {
  commercial: 'O elija un pedido que ya existe. Continuar no inventa un caso ni un número.',
  management: 'O pida que se abra un pedido que ya existe. No invente un caso.',
  floor: 'O elija un pedido que ya existe. Continuar no inventa un caso ni un número.',
  finance: 'No invente un caso ni un número.',
};

export const JOURNEYS: readonly Journey[] = [
  {
    id: 'vender',
    order: 1,
    title: 'Vender',
    summary: 'De clientes a cotizaciones. No inventa un cliente ni un precio.',
    roleKeys: COMMERCIAL,
    requiresHref: '/clientes',
    stops: [
      routeStop('clientes', 'Clientes', '/clientes', 'Abra clientes. No invente un cliente ni un precio.', VENDER_CLIENTES),
      routeStop(
        'cotizaciones',
        'Cotizaciones',
        '/cotizaciones',
        'Abra cotizaciones. No invente un precio.',
        VENDER_COTIZACIONES,
      ),
    ],
  },
  {
    id: 'pedido',
    order: 2,
    title: 'Atender un Pedido',
    summary: 'Un pedido se abre en el cliente que ya lo tiene. No inventa un número.',
    roleKeys: COMMERCIAL,
    requiresHref: '/clientes',
    stops: [patternStop('pedido', 'Pedido', PATTERN_PENDING, PEDIDO_NOW)],
  },
  {
    id: 'produccion',
    order: 3,
    title: 'Producción',
    summary: 'Abra producción. No invente un pedido ni un producto.',
    roleKeys: FLOOR,
    requiresHref: '/produccion',
    stops: [
      routeStop(
        'produccion',
        'Producción',
        '/produccion',
        'Abra producción. No invente un pedido ni un producto.',
        {
          floor: 'Abra producción. No invente un pedido ni un producto.',
          management: 'Abra producción. No invente un pedido ni un producto.',
          commercial: 'Abra producción. No invente un pedido ni un producto.',
        },
      ),
    ],
  },
  {
    id: 'almacen',
    order: 4,
    title: 'Cumplir Pedido',
    summary: 'Abra almacén. No invente existencias ni asigne un pedido.',
    roleKeys: FLOOR,
    requiresHref: '/almacen',
    stops: [
      routeStop(
        'almacen',
        'Almacén',
        '/almacen',
        'Abra almacén y cumpla un pedido que ya existe. No invente existencias.',
        {
          floor: 'Abra almacén y cumpla un pedido que ya existe. No invente existencias.',
          management: 'Abra almacén. No invente existencias.',
        },
      ),
    ],
  },
  {
    id: 'entregar',
    order: 5,
    title: 'Entregar',
    summary: 'Abra entregas. No confirme un número.',
    roleKeys: FLOOR,
    requiresHref: '/entregas',
    stops: [
      routeStop(
        'entregar',
        'Entrega',
        '/entregas',
        'Abra entregas. No confirme un número.',
        {
          floor: 'Abra entregas. No confirme un número.',
          management: 'Abra entregas. No confirme un número.',
        },
      ),
    ],
  },
  {
    id: 'problema',
    order: 6,
    title: 'Resolver un problema',
    summary: 'Se atiende en coordinación, o en un pedido que usted ya tiene. No inventa un caso.',
    roleKeys: PROBLEM,
    requiresHref: '/coordinacion',
    stops: [
      routeStop(
        'coordinacion',
        'Coordinación',
        '/coordinacion',
        'Abra coordinación. No invente un caso.',
        PROBLEMA_COORD,
      ),
      patternStop(
        'pedido-existente',
        'Pedido existente',
        'O elija un pedido que ya existe. Continuar no inventa un caso ni un número.',
        PROBLEMA_PEDIDO,
      ),
    ],
  },
  {
    id: 'coordinar',
    order: 7,
    title: 'Coordinar',
    summary: 'Abra coordinación. No invente una decisión.',
    roleKeys: FLOOR,
    requiresHref: '/coordinacion',
    stops: [
      routeStop(
        'coordinar',
        'Coordinación',
        '/coordinacion',
        'Abra coordinación. No invente una decisión.',
        {
          floor: 'Abra coordinación. No invente una decisión.',
          management: 'Abra coordinación. No invente una decisión.',
        },
      ),
    ],
  },
  {
    id: 'gerencia',
    order: 8,
    title: 'Gerencia',
    summary: 'Inicio muestra lo que ya pide atención. No inventa cifras.',
    roleKeys: [
      'org.admin',
      'people.admin',
      'sales_manager',
      'sales_rep',
      'commercial.org.read',
      'commercial.team.read',
      'operations',
      'finance.admin',
      'finance.operational.record',
      'fiscal.admin',
    ],
    requiresHref: '/inicio',
    stops: [
      routeStop('inicio', 'Inicio', '/inicio', 'Abra inicio. Mire lo que ya pide atención. No invente cifras.', {
        management: 'Abra inicio. Mire lo que ya pide atención. No invente cifras.',
        commercial: 'Abra inicio. Mire lo que ya pide atención. No invente cifras.',
        floor: 'Abra inicio. Mire lo que ya pide atención. No invente cifras.',
        finance: 'Abra inicio. No invente cifras ni confirme un pago.',
      }),
    ],
  },
];

export type GuideViewer = {
  /** Routes the shell already lets this viewer open. Omit when unknown. */
  openHrefs?: readonly string[];
  /** Hide a journey this viewer cannot open. Omit when unknown. */
  roleKeys?: readonly string[];
};

export function isFinanceOnly(roleKeys: readonly string[] | undefined): boolean {
  if (!roleKeys || roleKeys.length === 0) return false;
  return roleKeys.every((key) => FINANCE_KEYS.has(key));
}

export function viewerLens(roleKeys: readonly string[] | undefined): GuideLens {
  if (!roleKeys || roleKeys.length === 0) return 'unknown';
  if (isFinanceOnly(roleKeys)) return 'finance';
  if (roleKeys.some((key) => MANAGEMENT_KEYS.has(key))) return 'management';
  if (roleKeys.some((key) => FLOOR_KEYS.has(key))) return 'floor';
  if (roleKeys.some((key) => COMMERCIAL_KEYS.has(key))) return 'commercial';
  return 'unknown';
}

export function nowAnswer(stop: GuideStop, viewer: GuideViewer = {}): string {
  const lens = viewerLens(viewer.roleKeys);
  if (lens === 'unknown') return stop.now;
  return stop.nowByLens?.[lens] ?? stop.now;
}

export function roleCue(journey: Journey, viewer: GuideViewer = {}): string | null {
  const lens = viewerLens(viewer.roleKeys);
  if (lens === 'unknown') return null;
  if (lens === 'finance') return 'Para finanzas';
  if (journey.id === 'gerencia') {
    if (lens === 'commercial') return 'Para ventas';
    if (lens === 'floor') return 'Para operaciones';
    return 'Para gerencia';
  }
  if (FINANCE_HIDDEN.has(journey.id)) return 'Para operaciones';
  if (lens === 'management') return 'Para gerencia';
  if (lens === 'floor') return 'Para operaciones';
  if (lens === 'commercial') return 'Para ventas';
  return null;
}

export function journeyVisible(journey: Journey, viewer: GuideViewer = {}): boolean {
  if (
    journey.requiresHref &&
    viewer.openHrefs &&
    !viewer.openHrefs.includes(journey.requiresHref)
  ) {
    return false;
  }
  if (isFinanceOnly(viewer.roleKeys) && FINANCE_HIDDEN.has(journey.id)) return false;
  if (ROLE_GATED.has(journey.id) && viewer.roleKeys && viewer.roleKeys.length > 0) {
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

/** Continuar may open this href only when the page exists on this branch. */
export function continueHref(href: string | null | undefined): BranchRoute | null {
  if (!href || !isBranchRoute(href)) return null;
  return href;
}
