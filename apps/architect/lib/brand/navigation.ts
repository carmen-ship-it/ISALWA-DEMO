import { createId } from "@/lib/utils";
import type {
  BrandEvidenceRef,
  BusinessBlueprint,
  CompanyWorkspace,
  NavigationPreference,
  NavigationPattern,
  SolutionArchitecture,
} from "@/types";
import { evidenceSubset } from "./evidence";

export function deriveNavigationPreferences(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  solution: SolutionArchitecture | null,
  evidence: BrandEvidenceRef[],
): NavigationPreference[] {
  const prefs: NavigationPreference[] = [];
  const modules = solution?.modules.map((m) => m.name) ?? [];
  const deptCount = blueprint.departments.length;
  const roleCount = solution?.roles.length ?? 0;
  const ev = evidenceSubset(evidence, ["solution", "blueprint"], 4);

  if (modules.length >= 4) {
    prefs.push({
      id: createId("nav"),
      pattern: "module_first",
      label: "Module-first sidebar",
      rationale: `${modules.length} solution modules detected — primary navigation should follow module boundaries.`,
      confidence: Math.min(0.78, 0.45 + modules.length * 0.05),
      evidence: ev,
      modules: modules.slice(0, 8),
    });
  }

  if (roleCount >= 3) {
    prefs.push({
      id: createId("nav"),
      pattern: "role_based",
      label: "Role-based entry",
      rationale: `${roleCount} roles detected — landing experience should differ by role.`,
      confidence: Math.min(0.72, 0.4 + roleCount * 0.06),
      evidence: ev,
      modules: modules.slice(0, 6),
    });
  }

  if (deptCount >= 3 && modules.length < 4) {
    prefs.push({
      id: createId("nav"),
      pattern: "hub",
      label: "Department hub",
      rationale: "Multiple departments with fewer modules — hub navigation by department.",
      confidence: 0.58,
      evidence: evidenceSubset(evidence, ["blueprint"], 3),
      modules,
    });
  }

  if (prefs.length === 0 && solution?.navigation.length) {
    prefs.push({
      id: createId("nav"),
      pattern: "sidebar",
      label: "Solution navigation mirror",
      rationale: "Mirror solution architecture navigation labels until experience research confirms preferences.",
      confidence: 0.62,
      evidence: ev,
      modules: solution.navigation.map((n) => n.label).slice(0, 8),
    });
  }

  if (prefs.length === 0) {
    prefs.push({
      id: createId("nav"),
      pattern: inferFallbackPattern(workspace.industry),
      label: "Default enterprise sidebar",
      rationale:
        "No module or role structure yet — conservative sidebar until blueprint and solution advance.",
      confidence: 0.25,
      evidence: evidenceSubset(evidence, ["industry", "memory"], 2),
      modules: [],
    });
  }

  return prefs;
}

function inferFallbackPattern(industry: CompanyWorkspace["industry"]): NavigationPattern {
  if (industry === "retail" || industry === "distribution") return "top_nav";
  return "sidebar";
}
