/**
 * Interactive Business Builder — module plan contracts (Mission 16).
 * In-memory plan ops only. No persistence UI. No drag-and-drop.
 */

/** MoSCoW-style priority for investment / timeline heuristics. */
export type BuilderModulePriority = "must" | "should" | "could" | "later";

/**
 * A module slot on an executive plan.
 * May reference a Solution Architecture module id without owning that engine.
 */
export interface ModulePlanItem {
  id: string;
  /** Catalog key — typically a SolutionModuleName, or a free-form label key. */
  moduleKey: string;
  label: string;
  priority: BuilderModulePriority;
  /** 0-based stable order used for roadmap phasing. */
  order: number;
  /** Optional pointer into `SolutionArchitecture.modules[].id`. */
  solutionModuleId?: string;
  notes?: string;
}

export type ModuleConnectionKind =
  | "depends_on"
  | "integrates_with"
  | "feeds"
  | "shares_data";

export interface ModuleConnection {
  id: string;
  fromModuleId: string;
  toModuleId: string;
  kind: ModuleConnectionKind;
  label?: string;
}

/** In-memory future operating-system plan — planning artifact, not software. */
export interface BuilderPlan {
  id: string;
  title: string;
  version: 1;
  modules: ModulePlanItem[];
  connections: ModuleConnection[];
}

export interface AddModuleInput {
  moduleKey: string;
  label?: string;
  priority?: BuilderModulePriority;
  solutionModuleId?: string;
  notes?: string;
  /** Caller-supplied id for fully deterministic plans; otherwise derived. */
  id?: string;
}

export function createEmptyPlan(options?: {
  id?: string;
  title?: string;
}): BuilderPlan {
  return {
    id: options?.id ?? "builder-plan",
    title: options?.title ?? "Future Operating System",
    version: 1,
    modules: [],
    connections: [],
  };
}

function sortedModules(modules: ModulePlanItem[]): ModulePlanItem[] {
  return modules
    .slice()
    .sort((a, b) => a.order - b.order || a.moduleKey.localeCompare(b.moduleKey))
    .map((m, index) => ({ ...m, order: index }));
}

function deriveModuleId(plan: BuilderPlan, moduleKey: string): string {
  const slug = moduleKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = `bmod_${slug || "module"}`;
  if (!plan.modules.some((m) => m.id === base)) return base;
  let n = 2;
  while (plan.modules.some((m) => m.id === `${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * Add a module to the plan (append). Duplicate moduleKey is a no-op.
 */
export function addModule(plan: BuilderPlan, input: AddModuleInput): BuilderPlan {
  const key = input.moduleKey.trim();
  if (!key) return plan;
  if (plan.modules.some((m) => m.moduleKey === key)) return plan;

  const next: ModulePlanItem = {
    id: input.id ?? deriveModuleId(plan, key),
    moduleKey: key,
    label: input.label?.trim() || key,
    priority: input.priority ?? "should",
    order: plan.modules.length,
    ...(input.solutionModuleId ? { solutionModuleId: input.solutionModuleId } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
  };

  return {
    ...plan,
    modules: sortedModules([...plan.modules, next]),
  };
}

/** Remove a module and any connections that reference it. */
export function removeModule(plan: BuilderPlan, moduleId: string): BuilderPlan {
  if (!plan.modules.some((m) => m.id === moduleId)) return plan;
  return {
    ...plan,
    modules: sortedModules(plan.modules.filter((m) => m.id !== moduleId)),
    connections: plan.connections.filter(
      (c) => c.fromModuleId !== moduleId && c.toModuleId !== moduleId,
    ),
  };
}

/**
 * Move a module to `toIndex` (clamped). Reassigns contiguous `order` values.
 */
export function reorderModule(
  plan: BuilderPlan,
  moduleId: string,
  toIndex: number,
): BuilderPlan {
  const current = plan.modules
    .slice()
    .sort((a, b) => a.order - b.order || a.moduleKey.localeCompare(b.moduleKey));
  const fromIndex = current.findIndex((m) => m.id === moduleId);
  if (fromIndex < 0) return plan;

  const clamped = Math.max(0, Math.min(current.length - 1, Math.floor(toIndex)));
  if (clamped === fromIndex) {
    return { ...plan, modules: sortedModules(current) };
  }

  const [item] = current.splice(fromIndex, 1);
  current.splice(clamped, 0, item);
  return { ...plan, modules: sortedModules(current) };
}

export const PRIORITY_WEIGHT: Record<BuilderModulePriority, number> = {
  must: 4,
  should: 3,
  could: 2,
  later: 1,
};
