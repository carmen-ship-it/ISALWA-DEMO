export type NavItemState = 'active' | 'locked' | 'future';

/**
 * Authority classification for primary / future nav.
 * VISIBLE+ACTIVE — shown and navigable; destination may still fail-closed inside.
 * READ-ONLY — shown with an honest non-mutating destination (none in primary today).
 * HIDDEN — omitted from shell until the matching authority exists.
 * FUTURE — product surface not enabled; if shown, must carry locked/future labeling.
 */
export type NavAccessClass = 'VISIBLE+ACTIVE' | 'READ-ONLY' | 'HIDDEN' | 'FUTURE';

/** Visual grouping only — does not authorize or hide destinations. */
export type NavGroup = 'inicio' | 'comercial' | 'trabajo' | 'operaciones' | 'control' | 'mas';

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  inicio: 'Inicio',
  comercial: 'Comercial',
  trabajo: 'Trabajo',
  operaciones: 'Operaciones',
  control: 'Control',
  mas: 'Más',
};

export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  'inicio',
  'comercial',
  'trabajo',
  'operaciones',
  'control',
  'mas',
];

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  /** Shell label when i18n key is absent or product copy differs from nav.inicio keys. */
  shellLabel?: string;
  icon:
    | 'home'
    | 'users'
    | 'target'
    | 'fileText'
    | 'briefcase'
    | 'check'
    | 'settings'
    | 'wallet'
    | 'message'
    | 'map'
    | 'alertCircle';
  /** When set, item is shown but not navigable — honest locked/future state. */
  state?: NavItemState;
  /** Requires server-side admin probe (people.admin). */
  requiresAdminProbe?: boolean;
  /**
   * Declared access class. Filtering may hide HIDDEN items; FUTURE stays out of
   * primary until product enables them with clear locked labeling.
   */
  accessClass: NavAccessClass;
  /** Display section in the shell. Never used as an authority gate. */
  group: NavGroup;
  /** Product capability key for lifecycle badges — does not hide ops desks. */
  capabilityKey?: string;
};

/** Executive UX IA — employee vocabulary; order within array defines order inside each group. */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: 'inicio',
    href: '/inicio',
    labelKey: 'nav.inicio',
    icon: 'home',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'inicio',
  },
  {
    id: 'clientes',
    href: '/clientes',
    labelKey: 'nav.clientes',
    icon: 'users',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'oportunidades',
    href: '/oportunidades',
    labelKey: 'nav.oportunidades',
    icon: 'target',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'cotizaciones',
    href: '/cotizaciones',
    labelKey: 'nav.cotizaciones',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'pedidos',
    href: '/cotizaciones?status=accepted',
    labelKey: 'nav.pedidos',
    shellLabel: 'Pedidos',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'mapa',
    href: '/mapa',
    labelKey: 'nav.mapa',
    icon: 'map',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'trabajo',
    href: '/trabajo',
    labelKey: 'nav.trabajo',
    shellLabel: 'Mi trabajo',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'trabajo',
  },
  {
    id: 'aprobaciones',
    href: '/aprobaciones',
    labelKey: 'nav.aprobaciones',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'trabajo',
  },
  {
    id: 'incidencias',
    href: '/incidencias',
    labelKey: 'nav.incidencias',
    icon: 'alertCircle',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'trabajo',
  },
  {
    id: 'compromisos',
    href: '/compromisos',
    labelKey: 'nav.compromisos',
    shellLabel: 'Compromisos',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'trabajo',
  },
  {
    id: 'produccion',
    href: '/produccion',
    labelKey: 'nav.produccion',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'almacen',
    href: '/almacen',
    labelKey: 'nav.almacen',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'compras',
    href: '/compras',
    labelKey: 'nav.compras',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'entregas',
    href: '/entregas',
    labelKey: 'nav.entregas',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
  },
  {
    id: 'finanzas',
    href: '/finanzas',
    labelKey: 'nav.finanzas',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'control',
  },
  {
    id: 'salud-datos',
    href: '/salud-datos',
    labelKey: 'nav.saludDatos',
    icon: 'alertCircle',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'control',
  },
  {
    id: 'auditoria',
    href: '/auditoria',
    labelKey: 'nav.auditoria',
    icon: 'settings',
    requiresAdminProbe: true,
    accessClass: 'HIDDEN',
    group: 'control',
  },
  {
    id: 'productos',
    href: '/productos',
    labelKey: 'nav.productos',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'mas',
  },
  {
    id: 'coordinacion',
    href: '/coordinacion',
    labelKey: 'nav.coordinacion',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'mas',
  },
  {
    id: 'memoria-decisiones',
    href: '/memoria-decisiones',
    labelKey: 'nav.memoriaDecisiones',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'mas',
  },
  {
    id: 'administracion',
    href: '/administracion',
    labelKey: 'nav.administracion',
    icon: 'settings',
    requiresAdminProbe: true,
    accessClass: 'HIDDEN',
    group: 'mas',
  },
  {
    id: 'ayuda',
    href: '/ayuda',
    labelKey: 'nav.ayuda',
    shellLabel: 'Ayuda',
    icon: 'message',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'mas',
  },
];

/**
 * Capability-locked surfaces — kept for direct-route gating only.
 * Product messaging stays here. /finanzas is the operational desk gated by
 * finance.operational.record, not by product capability finance=ACTIVE.
 */
export const FUTURE_NAV: NavItem[] = [
  {
    id: 'mensajes',
    href: '/mensajes',
    labelKey: 'nav.mensajes',
    icon: 'message',
    state: 'locked',
    accessClass: 'FUTURE',
    group: 'mas',
    capabilityKey: 'messaging',
  },
];

/** Ids that must never appear in the primary shell nav for now. */
export const HIDDEN_PRIMARY_NAV_IDS = ['mensajes'] as const;

const HIDDEN_PRIMARY_NAV_ID_SET = new Set<string>(HIDDEN_PRIMARY_NAV_IDS);

export function filterNavByAccess(
  items: NavItem[],
  access: { showAdmin: boolean },
): NavItem[] {
  return items.filter((item) => {
    if (HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return false;
    if (item.requiresAdminProbe && !access.showAdmin) return false;
    return true;
  });
}

export function primaryNavIds(access: { showAdmin: boolean }): string[] {
  return filterNavByAccess(PRIMARY_NAV, access).map((item) => item.id);
}

export function isNavItemDisabled(item: NavItem): boolean {
  return item.state === 'locked' || item.state === 'future';
}

export function classifyNavItem(item: NavItem, access: { showAdmin: boolean }): NavAccessClass {
  if (item.accessClass === 'FUTURE' || HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return 'FUTURE';
  if (item.requiresAdminProbe && !access.showAdmin) return 'HIDDEN';
  if (item.requiresAdminProbe && access.showAdmin) return 'VISIBLE+ACTIVE';
  return item.accessClass;
}

export function navItemLabel(item: NavItem, translate: (key: string) => string): string {
  if (item.shellLabel) return item.shellLabel;
  const translated = translate(item.labelKey);
  return translated === item.labelKey && item.labelKey.startsWith('nav.')
    ? item.labelKey.slice('nav.'.length)
    : translated;
}

/** Group visible items for shell hierarchy. Order within each group matches PRIMARY_NAV. */
export function groupNavItems(items: readonly NavItem[]): Array<{
  group: NavGroup;
  label: string;
  items: NavItem[];
}> {
  const buckets = new Map<NavGroup, NavItem[]>();
  for (const group of NAV_GROUP_ORDER) buckets.set(group, []);
  for (const item of items) {
    const list = buckets.get(item.group) ?? buckets.get('inicio')!;
    list.push(item);
  }
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    label: NAV_GROUP_LABEL[group],
    items: buckets.get(group) ?? [],
  })).filter((section) => section.items.length > 0);
}
