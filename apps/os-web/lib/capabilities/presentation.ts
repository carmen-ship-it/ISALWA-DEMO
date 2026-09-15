import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import type { NavItemState } from '@/lib/navigation/nav-config';

/** Presentation metadata only — lifecycle state comes from GET /v1/capabilities. */
export type CapabilityPresentation = {
  label: string;
  route?: string;
  employeeMessage: string;
  navIcon?: 'wallet' | 'message';
};

export const CAPABILITY_PRESENTATION: Record<string, CapabilityPresentation> = {
  /**
   * Official finance / ledger module. Stays LOCKED.
   * No route binding: Contabilidad uses /finanzas via finance.operational.record.
   */
  finance: {
    label: 'Finanzas oficiales',
    employeeMessage:
      'La contabilidad oficial aún no está habilitada. El registro operativo de pagos reportados usa otra capacidad.',
  },
  messaging: {
    label: 'Mensajes',
    route: '/mensajes',
    employeeMessage: 'Mensajería integrada — no configurada todavía.',
    navIcon: 'message',
  },
  warehouse: {
    label: 'Almacén',
    employeeMessage: 'Gestión de almacén — próximamente.',
  },
  commercial: {
    label: 'Ventas comerciales',
    route: '/clientes',
    employeeMessage: 'Use Clientes para ver actividad comercial.',
  },
  workforce: {
    label: 'Equipo',
    route: '/administracion/equipo',
    employeeMessage: 'Administración de personas disponible para administradores.',
  },
  partygraph: {
    label: 'Clientes',
    route: '/clientes',
    employeeMessage: 'Gestión de clientes y relaciones.',
  },
  work: {
    label: 'Trabajo',
    route: '/trabajo',
    employeeMessage: 'Tareas y seguimiento operativo.',
  },
};

export function getPresentationForRoute(pathname: string): {
  capability: CapabilityStateReadModel | null;
  presentation: CapabilityPresentation | null;
} {
  return { capability: null, presentation: findPresentationByRoute(pathname) };
}

export function findPresentationByRoute(pathname: string): CapabilityPresentation | null {
  for (const presentation of Object.values(CAPABILITY_PRESENTATION)) {
    if (presentation.route && pathname.startsWith(presentation.route)) {
      return presentation;
    }
  }
  return null;
}

export function findCapabilityByRoute(
  pathname: string,
  capabilities: CapabilityStateReadModel[],
): { capability: CapabilityStateReadModel; presentation: CapabilityPresentation } | null {
  for (const [key, presentation] of Object.entries(CAPABILITY_PRESENTATION)) {
    if (presentation.route && pathname.startsWith(presentation.route)) {
      const capability = capabilities.find((c) => c.capabilityKey === key);
      if (capability) return { capability, presentation };
    }
  }
  return null;
}

export function capabilityNavState(state: string): NavItemState | undefined {
  if (state === 'ACTIVE') return undefined;
  if (state === 'FUTURE') return 'future';
  return 'locked';
}

export function capabilityNavBadge(state: string): string | null {
  switch (state) {
    case 'ACTIVE':
      return null;
    case 'FUTURE':
      return 'PRÓXIMAMENTE';
    case 'LOCKED':
      return 'BLOQUEADO';
    case 'NOT_CONFIGURED':
      return 'NO CONFIGURADO';
    default:
      return 'NO DISPONIBLE';
  }
}

export function isCapabilityRouteEnabled(state: string): boolean {
  return state === 'ACTIVE';
}
