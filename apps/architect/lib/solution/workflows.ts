import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  SolutionEvidenceRef,
  SolutionModule,
  SolutionModuleName,
  SolutionWorkflowRef,
} from "@/types";

export function detectWorkflows(
  blueprint: BusinessBlueprint,
  modules: SolutionModule[],
  evidence: SolutionEvidenceRef[],
): SolutionWorkflowRef[] {
  const moduleNames = modules.map((m) => m.name);
  return blueprint.workflows.map((workflow) => {
    const linkedModule =
      moduleNames.find((name) =>
        workflow.name.toLowerCase().includes(name.toLowerCase()),
      ) ??
      guessModule(workflow.name, moduleNames);

    return {
      id: createId("swf"),
      name: workflow.name,
      trigger: workflow.trigger,
      module: linkedModule,
      stepCount: workflow.steps.length,
      confidence: 0.8,
      evidence: evidence.slice(0, 2),
    };
  });
}

function guessModule(
  name: string,
  available: SolutionModuleName[],
): SolutionModuleName | null {
  const n = name.toLowerCase();
  const pairs: Array<[RegExp, SolutionModuleName]> = [
    [/sales|quote|order/i, "Sales"],
    [/purchas/i, "Purchasing"],
    [/product/i, "Production"],
    [/approv/i, "Approvals"],
    [/collect|financ|invoice/i, "Finance"],
  ];
  for (const [re, mod] of pairs) {
    if (re.test(n) && available.includes(mod)) return mod;
  }
  return available[0] ?? null;
}
