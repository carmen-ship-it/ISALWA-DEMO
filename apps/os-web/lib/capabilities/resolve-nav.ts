import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import {
  capabilityNavBadge,
  capabilityNavState,
  CAPABILITY_PRESENTATION,
} from '@/lib/capabilities/presentation';
import type { NavItem, NavItemState } from '@/lib/navigation/nav-config';

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
