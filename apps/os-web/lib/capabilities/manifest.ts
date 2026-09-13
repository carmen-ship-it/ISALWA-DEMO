/**
 * @deprecated Static authority removed — use lib/capabilities/presentation.ts for labels
 * and GET /v1/capabilities for lifecycle state.
 */
export {
  CAPABILITY_PRESENTATION as CAPABILITY_MANIFEST,
  findPresentationByRoute as getCapabilityForRoute,
  capabilityNavBadge as lockedNavBadge,
} from './presentation';

export type { CapabilityPresentation as CapabilityManifestEntry } from './presentation';
