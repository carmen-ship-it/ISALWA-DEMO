import { createId } from "@/lib/utils";
import type {
  SolutionEvidenceRef,
  SolutionModule,
  SolutionModuleName,
  SolutionNavItem,
  SolutionPermission,
} from "@/types";

const TOP_LEVEL: Array<{
  label: string;
  module: SolutionModuleName | null;
  requires?: SolutionModuleName[];
}> = [
  { label: "Dashboard", module: null },
  { label: "Customers", module: "CRM", requires: ["CRM", "Sales"] },
  { label: "Sales", module: "Sales", requires: ["Sales"] },
  { label: "Purchasing", module: "Purchasing", requires: ["Purchasing"] },
  { label: "Production", module: "Production", requires: ["Production"] },
  { label: "Finance", module: "Finance", requires: ["Finance", "Collections"] },
  {
    label: "Operations",
    module: null,
    requires: ["Inventory", "Scheduling", "Field Service", "Maintenance"],
  },
  { label: "Reports", module: "Analytics", requires: ["Analytics"] },
  { label: "Settings", module: null },
];

/**
 * Recommended navigation — only modules supported by evidence.
 */
export function detectNavigation(
  modules: SolutionModule[],
  _permissions: SolutionPermission[],
  evidence: SolutionEvidenceRef[],
): SolutionNavItem[] {
  const present = new Set(modules.map((m) => m.name));
  return TOP_LEVEL.filter((item) => {
    if (!item.requires) return true;
    return item.requires.some((name) => present.has(name));
  }).map((item) => ({
    id: createId("snav"),
    label: item.label,
    module: item.module,
    children: [],
    confidence: item.module
      ? modules.find((m) => m.name === item.module)?.confidence ?? 0.7
      : 0.75,
    evidence: evidence.slice(0, 2),
  }));
}
