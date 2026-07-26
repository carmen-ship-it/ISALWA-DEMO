import type {
  BusinessBlueprint,
  SolutionModule,
} from "@/types";

/**
 * Soft configuration map for future ISALWA OS genesis — strings only.
 */
export function detectConfiguration(
  blueprint: BusinessBlueprint,
  modules: SolutionModule[],
): Record<string, string> {
  return {
    companyName: blueprint.title
      .replace(/\s*—\s*Blueprint operativo de negocio.*$/i, "")
      .trim(),
    blueprintVersion: String(blueprint.version),
    primaryModules: modules
      .slice(0, 6)
      .map((m) => m.name)
      .join(", "),
    departmentCount: String(blueprint.departments.length),
    workflowCount: String(blueprint.workflows.length),
    architectureHorizon: "transition",
    sourceOfTruthPolicy: "Preferir módulos duraderos sobre chat y hojas de cálculo",
  };
}
