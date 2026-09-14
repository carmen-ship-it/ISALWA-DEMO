import { COORDINATION_DECISION_CAPABILITY } from '@isalwa/os-contracts';

/**
 * Navigation request for the coordination page.
 * CROSS_LANE: wire this into app nav. Do not edit nav-config in this lane.
 * Do not infer coordination.decision.record from cargo, title, or Auxiliar.
 */
export const COORDINACION_NAV_REQUEST = {
  id: 'coordinacion',
  href: '/coordinacion',
  label: 'Coordinación',
  labelKey: 'nav.coordinacion',
  capability: COORDINATION_DECISION_CAPABILITY,
  infersCapabilityFromCargo: false,
  infersCapabilityFromTitle: false,
  requiresMeeting: false,
} as const;
