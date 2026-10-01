/**
 * Legacy v1 Planificación seed — structure only.
 *
 * Business scope is derived at read time (`lib/planificacion/derive`).
 * New workspaces receive v2 via `createEmptyPlanificacionStateV2()`.
 */

import { nowIso } from "@/lib/utils";
import type { IsalwaPlanificacionStateV1 } from "@/types";

/** Empty v1 shell — used only when constructing migration test fixtures. */
export function createEmptyPlanificacionStateV1(): IsalwaPlanificacionStateV1 {
  const stamp = nowIso();
  return {
    version: 1,
    initializedAt: stamp,
    lastUpdatedAt: stamp,
    dataRequirements: [],
    decisions: [],
    changeLog: [],
    preservedProcedures: [],
  };
}
