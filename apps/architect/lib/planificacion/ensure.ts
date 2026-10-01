import type {
  CompanyWorkspace,
  IsalwaPlanificacionState,
  IsalwaPlanificacionStateV2,
} from "@/types";
import { isPlanificacionStateV1, isPlanificacionStateV2 } from "@/types";
import {
  bumpPlanificacionDerivationVersion,
  createEmptyPlanificacionStateV2,
  migratePlanificacionToV2,
} from "./migrate-v2";

/**
 * Ensure every workspace has v2 Planificación persisted state.
 *
 * - New workspaces: empty v2 structure (no business facts).
 * - Legacy v1: migrate checklist/decisions/changelog into v2 client state.
 * - Existing v2: bump derivation algorithm version when needed.
 *
 * Derived proposals are NOT stored here — use `buildPlanificacionViewModel`.
 */
export function ensurePlanificacion(
  workspace: CompanyWorkspace,
): CompanyWorkspace {
  const existing = workspace.planificacion;
  let nextState: IsalwaPlanificacionStateV2;

  if (!existing) {
    nextState = createEmptyPlanificacionStateV2();
  } else if (isPlanificacionStateV1(existing)) {
    nextState = migratePlanificacionToV2(existing);
  } else if (isPlanificacionStateV2(existing)) {
    nextState = bumpPlanificacionDerivationVersion(existing);
  } else {
    nextState = createEmptyPlanificacionStateV2();
  }

  if (existing === nextState) {
    return workspace;
  }

  return {
    ...workspace,
    planificacion: nextState,
  };
}

export function emptyPlanificacionState(): IsalwaPlanificacionStateV2 {
  return createEmptyPlanificacionStateV2();
}

/** Whether ensurePlanificacion upgraded persisted planificación shape. */
export function planificacionPersistShapeChanged(
  before: IsalwaPlanificacionState | null | undefined,
  after: IsalwaPlanificacionState | null | undefined,
): boolean {
  if (!after || !isPlanificacionStateV2(after)) return false;
  const afterV2 = after;
  if (!before) return true;
  if (isPlanificacionStateV1(before)) return true;
  if (isPlanificacionStateV2(before)) {
    return before.derivationVersion !== afterV2.derivationVersion;
  }
  return true;
}
