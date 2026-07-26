/**
 * Interactive Business Builder — module connections (Mission 16).
 * Explicit executive edges on a plan (not solution-engine rewrites).
 */

import type {
  BuilderPlan,
  ModuleConnection,
  ModuleConnectionKind,
} from "./modules";

export interface ConnectModulesInput {
  fromModuleId: string;
  toModuleId: string;
  kind?: ModuleConnectionKind;
  label?: string;
  /** Caller-supplied id for fully deterministic plans; otherwise derived. */
  id?: string;
}

function deriveConnectionId(
  plan: BuilderPlan,
  fromModuleId: string,
  toModuleId: string,
  kind: ModuleConnectionKind,
): string {
  const base = `bconn_${fromModuleId}_${kind}_${toModuleId}`;
  if (!plan.connections.some((c) => c.id === base)) return base;
  let n = 2;
  while (plan.connections.some((c) => c.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * Connect two plan modules. Self-links and unknown ids are no-ops.
 * Duplicate (from, to, kind) is a no-op.
 */
export function connectModules(
  plan: BuilderPlan,
  input: ConnectModulesInput,
): BuilderPlan {
  const { fromModuleId, toModuleId } = input;
  if (fromModuleId === toModuleId) return plan;

  const ids = new Set(plan.modules.map((m) => m.id));
  if (!ids.has(fromModuleId) || !ids.has(toModuleId)) return plan;

  const kind: ModuleConnectionKind = input.kind ?? "depends_on";
  const exists = plan.connections.some(
    (c) =>
      c.fromModuleId === fromModuleId &&
      c.toModuleId === toModuleId &&
      c.kind === kind,
  );
  if (exists) return plan;

  const connection: ModuleConnection = {
    id: input.id ?? deriveConnectionId(plan, fromModuleId, toModuleId, kind),
    fromModuleId,
    toModuleId,
    kind,
    ...(input.label ? { label: input.label } : {}),
  };

  return {
    ...plan,
    connections: [...plan.connections, connection],
  };
}
