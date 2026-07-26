/**
 * Interactive Business Builder — dependency preview (Mission 16).
 * Merges plan connections with known Solution Architecture module deps.
 * Does not call or rewrite `lib/solution/` — mirrors catalog only.
 */

import type { BuilderPlan } from "./modules";

/**
 * Known SolutionModuleName → dependency module keys.
 * Mirrors `lib/solution/modules.ts` RULES.dependencies (read-only contract).
 */
export const KNOWN_SOLUTION_MODULE_DEPS: Readonly<
  Record<string, readonly string[]>
> = {
  CRM: [],
  Sales: ["CRM"],
  Purchasing: ["Approvals"],
  Inventory: [],
  Production: ["Inventory"],
  Maintenance: ["Assets"],
  Finance: ["Sales"],
  Collections: ["Finance"],
  HR: [],
  Projects: [],
  "Customer Service": ["CRM"],
  Compliance: ["Documents", "Approvals"],
  Analytics: [],
  Documents: [],
  Assets: [],
  Fleet: ["Assets"],
  Scheduling: [],
  "Field Service": ["CRM", "Scheduling"],
  Approvals: [],
  Notifications: [],
  Knowledge: ["Documents"],
  "AI Assistant": ["Knowledge", "CRM"],
};

export type DependencyEdgeSource = "plan_connection" | "known_solution_dep";

export interface DependencyEdge {
  fromModuleKey: string;
  toModuleKey: string;
  fromModuleId?: string;
  toModuleId?: string;
  source: DependencyEdgeSource;
  kind: string;
  required: boolean;
}

export interface MissingPrerequisite {
  moduleKey: string;
  moduleId: string;
  missing: string[];
}

export interface DependencyPreview {
  nodes: string[];
  edges: DependencyEdge[];
  missingPrerequisites: MissingPrerequisite[];
}

function edgeKey(e: DependencyEdge): string {
  return `${e.fromModuleKey}|${e.toModuleKey}|${e.source}|${e.kind}`;
}

/**
 * Preview the dependency graph for a plan: explicit connections + known solution deps.
 */
export function previewDependencies(plan: BuilderPlan): DependencyPreview {
  const byId = new Map(plan.modules.map((m) => [m.id, m]));
  const keys = new Set(plan.modules.map((m) => m.moduleKey));
  const nodes = plan.modules
    .slice()
    .sort((a, b) => a.order - b.order || a.moduleKey.localeCompare(b.moduleKey))
    .map((m) => m.moduleKey);

  const edges: DependencyEdge[] = [];

  for (const c of plan.connections) {
    const from = byId.get(c.fromModuleId);
    const to = byId.get(c.toModuleId);
    if (!from || !to) continue;
    edges.push({
      fromModuleKey: from.moduleKey,
      toModuleKey: to.moduleKey,
      fromModuleId: from.id,
      toModuleId: to.id,
      source: "plan_connection",
      kind: c.kind,
      required: c.kind === "depends_on",
    });
  }

  for (const mod of plan.modules) {
    const deps = KNOWN_SOLUTION_MODULE_DEPS[mod.moduleKey] ?? [];
    for (const depKey of deps) {
      edges.push({
        fromModuleKey: mod.moduleKey,
        toModuleKey: depKey,
        fromModuleId: mod.id,
        toModuleId: plan.modules.find((m) => m.moduleKey === depKey)?.id,
        source: "known_solution_dep",
        kind: "depends_on",
        required: true,
      });
    }
  }

  const seen = new Set<string>();
  const uniqueEdges = edges.filter((e) => {
    const k = edgeKey(e);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const missingPrerequisites: MissingPrerequisite[] = [];
  for (const mod of plan.modules) {
    const deps = KNOWN_SOLUTION_MODULE_DEPS[mod.moduleKey] ?? [];
    const missing = deps.filter((d) => !keys.has(d));
    if (missing.length > 0) {
      missingPrerequisites.push({
        moduleKey: mod.moduleKey,
        moduleId: mod.id,
        missing: [...missing].sort((a, b) => a.localeCompare(b)),
      });
    }
  }

  missingPrerequisites.sort((a, b) => a.moduleKey.localeCompare(b.moduleKey));

  return { nodes, edges: uniqueEdges, missingPrerequisites };
}
