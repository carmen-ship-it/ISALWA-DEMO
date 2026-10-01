import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import {
  capabilityNavBadge,
  capabilityNavState,
  CAPABILITY_PRESENTATION,
} from '@/lib/capabilities/presentation';
import {
  filterNavByAccess,
  FUTURE_NAV,
  groupNavItems,
  isNavItemDisabled,
  PRIMARY_NAV,
  type NavItem,
  type NavItemState,
} from '@/lib/navigation/nav-config';

export type ResolvedFutureNavItem = {
  id: string;
  href: string;
  labelKey: string;
  icon: 'wallet' | 'message';
  state?: NavItemState;
  badge: string | null;
};

export function resolveFutureNavItems(
  capabilities: CapabilityStateReadModel[],
): ResolvedFutureNavItem[] {
  const capabilityMap = new Map(capabilities.map((c) => [c.capabilityKey, c]));
  const items: ResolvedFutureNavItem[] = [];

  for (const [key, presentation] of Object.entries(CAPABILITY_PRESENTATION)) {
    if (!presentation.route || !presentation.navIcon) continue;
    const capability = capabilityMap.get(key);
    if (!capability) continue;
    items.push({
      id: key,
      href: presentation.route,
      labelKey: key === 'messaging' ? 'nav.mensajes' : presentation.label,
      icon: presentation.navIcon,
      state: capabilityNavState(capability.state),
      badge: capabilityNavBadge(capability.state),
    });
  }

  return items;
}

export function resolveNavItemFromCapabilities(
  pathname: string,
  capabilities: CapabilityStateReadModel[],
): { enabled: boolean; message: string | null } {
  for (const [key, presentation] of Object.entries(CAPABILITY_PRESENTATION)) {
    if (!presentation.route || !pathname.startsWith(presentation.route)) continue;
    const capability = capabilities.find((c) => c.capabilityKey === key);
    if (!capability) {
      return { enabled: false, message: presentation.employeeMessage };
    }
    return {
      enabled: capability.state === 'ACTIVE',
      message: capability.state === 'ACTIVE' ? null : presentation.employeeMessage,
    };
  }
  return { enabled: true, message: null };
}

function capabilityMapOf(capabilities: CapabilityStateReadModel[]): Map<string, CapabilityStateReadModel> {
  return new Map(capabilities.map((c) => [c.capabilityKey, c]));
}

/** Apply capability lifecycle to nav items that declare capabilityKey. Does not hide ops desks. */
export function applyCapabilityNavState(
  item: NavItem,
  capabilities: CapabilityStateReadModel[],
): NavItem {
  const key = item.capabilityKey;
  if (!key) return item;
  const capability = capabilityMapOf(capabilities).get(key);
  if (!capability) return { ...item, state: 'locked' };
  const state = capabilityNavState(capability.state);
  return state ? { ...item, state } : item;
}

export type ShellNavAccess = {
  showAdmin: boolean;
};

/**
 * Primary shell nav: access filter + capability badges/locks + optional future surfaces in Más.
 */
export function resolveShellNavItems(
  access: ShellNavAccess,
  capabilities: CapabilityStateReadModel[],
): NavItem[] {
  const visible = filterNavByAccess(PRIMARY_NAV, access).map((item) =>
    applyCapabilityNavState(item, capabilities),
  );

  const futureById = new Map(FUTURE_NAV.map((item) => [item.id, item]));
  for (const resolved of resolveFutureNavItems(capabilities)) {
    const base = futureById.get(resolved.id);
    if (!base || base.accessClass === 'HIDDEN') continue;
    visible.push({
      ...base,
      state: resolved.state ?? base.state,
    });
  }

  return visible.filter((item) => !isNavItemDisabled(item) || item.state === 'locked');
}

export function resolveShellNavSections(
  access: ShellNavAccess,
  capabilities: CapabilityStateReadModel[],
) {
  const items = resolveShellNavItems(access, capabilities).filter(
    (item) => item.state !== 'future' && Boolean(item.href),
  );
  return groupNavItems(items);
}
