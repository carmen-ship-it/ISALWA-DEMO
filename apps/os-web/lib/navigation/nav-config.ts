import {
  COMMERCIAL_ORG_READ_SCOPE,
  COMMERCIAL_TEAM_READ_SCOPE,
  COMMERCIAL_CUSTOMER_CREATE_SCOPE,
  COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
  DELIVERY_RECORD_SCOPE,
  FINANCE_OPERATIONAL_RECORD_SCOPE,
  MANAGEMENT_ORG_READ_SCOPE,
  MASTER_DATA_ADMIN_SCOPE,
  OPERATIONS_COORDINATOR_RECORD_SCOPE,
  PAYMENTS_CONFIRM_SCOPE,
  PAYMENTS_REPORT_SCOPE,
  PRODUCTION_ENTRY_MEMBER_SCOPE,
  PRODUCTION_OPERATIONAL_RECORD_SCOPE,
  PURCHASING_OPERATIONAL_RECORD_SCOPE,
  WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
  WAREHOUSE_OUTBOUND_RECORD_SCOPE,
  hasAssignedOperationsScope,
} from '@isalwa/os-contracts';

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
export type NavGroup =
  | 'principal'
  | 'comercial'
  | 'consulta'
  | 'trabajo'
  | 'operaciones'
  | 'control'
  | 'mas';

export const NAV_GROUP_LABEL: Record<NavGroup, string> = {
  principal: 'Principal',
  comercial: 'Comercial',
  consulta: 'Catálogo y mapa',
  trabajo: 'Mi trabajo',
  operaciones: 'Operaciones',
  control: 'Control',
  mas: 'Más',
};

/**
 * Primary groups first (Hoy, Conversaciones, Clientes · Comercial · Catálogo, Mapa);
 * operational and administration areas follow as secondary groups.
 */
export const NAV_GROUP_ORDER: readonly NavGroup[] = [
  'principal',
  'comercial',
  'consulta',
  'trabajo',
  'operaciones',
  'control',
  'mas',
];

/** Secondary groups the shell opens collapsed unless they hold the current route. */
export const NAV_SECONDARY_COLLAPSED_GROUPS: readonly NavGroup[] = ['operaciones', 'control', 'mas'];

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
  /**
   * Secondary areas only: shown in the shell when the actor holds at least one of these
   * scopes (explicit grants, no cargo/title). Absent = always shown. Navigation only —
   * every destination still fails closed on its own page and API.
   */
  requiresAnyScope?: readonly string[];
};

/** Company-level oversight reads may open operational desks read-only. */
const OVERSIGHT_SCOPES = [MANAGEMENT_ORG_READ_SCOPE, COMMERCIAL_ORG_READ_SCOPE] as const;

/**
 * Employee vocabulary. Array order is the display order inside each group.
 * Primary: Hoy · Conversaciones · Clientes · Comercial · Catálogo · Mapa.
 * Everything after `consulta` is secondary; operational desks and administration
 * are shown only to actors holding a matching scope (`requiresAnyScope`).
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    id: 'inicio',
    href: '/inicio',
    labelKey: 'nav.inicio',
    shellLabel: 'Inicio',
    icon: 'home',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'principal',
  },
  {
    id: 'conversaciones',
    href: '/conversaciones',
    labelKey: 'nav.conversaciones',
    shellLabel: 'Conversaciones',
    icon: 'message',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'principal',
  },
  {
    id: 'clientes',
    href: '/clientes',
    labelKey: 'nav.clientes',
    shellLabel: 'Contactos',
    icon: 'users',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'principal',
  },
  {
    id: 'oportunidades',
    href: '/oportunidades',
    labelKey: 'nav.oportunidades',
    shellLabel: 'Leads y oportunidades',
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
    href: '/pedidos',
    labelKey: 'nav.pedidos',
    shellLabel: 'Pedidos',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'compromisos',
    href: '/compromisos',
    labelKey: 'nav.compromisos',
    shellLabel: 'Seguimientos',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'comercial',
  },
  {
    id: 'productos',
    href: '/productos',
    labelKey: 'nav.productos',
    shellLabel: 'Catálogo',
    icon: 'fileText',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'consulta',
  },
  {
    id: 'mapa',
    href: '/mapa',
    labelKey: 'nav.mapa',
    shellLabel: 'Mapas',
    icon: 'map',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'consulta',
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
    id: 'excepciones',
    href: '/inicio?vista=excepciones#excepciones',
    labelKey: 'nav.excepciones',
    shellLabel: 'Excepciones',
    icon: 'alertCircle',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'trabajo',
    requiresAnyScope: [COMMERCIAL_TEAM_READ_SCOPE, ...OVERSIGHT_SCOPES],
  },
  {
    id: 'compras',
    href: '/compras',
    labelKey: 'nav.compras',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
    requiresAnyScope: [PURCHASING_OPERATIONAL_RECORD_SCOPE, ...OVERSIGHT_SCOPES],
  },
  {
    id: 'produccion',
    href: '/produccion',
    labelKey: 'nav.produccion',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
    requiresAnyScope: [
      PRODUCTION_OPERATIONAL_RECORD_SCOPE,
      PRODUCTION_ENTRY_MEMBER_SCOPE,
      ...OVERSIGHT_SCOPES,
    ],
  },
  {
    id: 'almacen',
    href: '/almacen',
    labelKey: 'nav.almacen',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
    requiresAnyScope: [
      WAREHOUSE_FINISHED_GOODS_RECEIVE_SCOPE,
      WAREHOUSE_OUTBOUND_RECORD_SCOPE,
      ...OVERSIGHT_SCOPES,
    ],
  },
  {
    id: 'entregas',
    href: '/entregas',
    labelKey: 'nav.entregas',
    icon: 'briefcase',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'operaciones',
    requiresAnyScope: [DELIVERY_RECORD_SCOPE, WAREHOUSE_OUTBOUND_RECORD_SCOPE, ...OVERSIGHT_SCOPES],
  },
  {
    id: 'finanzas',
    href: '/finanzas',
    labelKey: 'nav.finanzas',
    icon: 'wallet',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'control',
    requiresAnyScope: [
      FINANCE_OPERATIONAL_RECORD_SCOPE,
      PAYMENTS_REPORT_SCOPE,
      PAYMENTS_CONFIRM_SCOPE,
      ...OVERSIGHT_SCOPES,
    ],
  },
  {
    id: 'salud-datos',
    href: '/salud-datos',
    labelKey: 'nav.saludDatos',
    icon: 'alertCircle',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'control',
    requiresAnyScope: [
      COMMERCIAL_CUSTOMER_CREATE_SCOPE,
      COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE,
      COMMERCIAL_TEAM_READ_SCOPE,
      MASTER_DATA_ADMIN_SCOPE,
      ...OVERSIGHT_SCOPES,
    ],
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
    id: 'coordinacion',
    href: '/coordinacion',
    labelKey: 'nav.coordinacion',
    icon: 'check',
    accessClass: 'VISIBLE+ACTIVE',
    group: 'mas',
    requiresAnyScope: [OPERATIONS_COORDINATOR_RECORD_SCOPE, ...OVERSIGHT_SCOPES],
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

export type NavAccess = {
  showAdmin: boolean;
  /**
   * Effective scopes from GET /session/authorization. When provided, secondary areas that
   * declare `requiresAnyScope` are shown only to actors holding one of them. Omit to skip
   * scope filtering (callers that only know the admin probe).
   */
  grantedScopes?: readonly string[];
};

export function navItemScopePermitted(item: NavItem, grantedScopes: readonly string[] | undefined): boolean {
  if (!item.requiresAnyScope || grantedScopes === undefined) return true;
  return item.requiresAnyScope.some((scope) => hasAssignedOperationsScope(grantedScopes, scope));
}

export function filterNavByAccess(items: NavItem[], access: NavAccess): NavItem[] {
  return items.filter((item) => {
    if (HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return false;
    if (item.requiresAdminProbe && !access.showAdmin) return false;
    return navItemScopePermitted(item, access.grantedScopes);
  });
}

export function primaryNavIds(access: NavAccess): string[] {
  return filterNavByAccess(PRIMARY_NAV, access).map((item) => item.id);
}

export function isNavItemDisabled(item: NavItem): boolean {
  return item.state === 'locked' || item.state === 'future';
}

export function classifyNavItem(item: NavItem, access: NavAccess): NavAccessClass {
  if (item.accessClass === 'FUTURE' || HIDDEN_PRIMARY_NAV_ID_SET.has(item.id)) return 'FUTURE';
  if (item.requiresAdminProbe && !access.showAdmin) return 'HIDDEN';
  if (item.requiresAdminProbe && access.showAdmin) return 'VISIBLE+ACTIVE';
  if (!navItemScopePermitted(item, access.grantedScopes)) return 'HIDDEN';
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
    const list = buckets.get(item.group) ?? buckets.get('principal')!;
    list.push(item);
  }
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    label: NAV_GROUP_LABEL[group],
    items: buckets.get(group) ?? [],
  })).filter((section) => section.items.length > 0);
}
