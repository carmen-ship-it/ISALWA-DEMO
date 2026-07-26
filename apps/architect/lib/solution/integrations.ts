import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  CompanyWorkspace,
  SolutionAiAgent,
  SolutionEvidenceRef,
  SolutionIntegration,
  SolutionModule,
} from "@/types";

export function detectIntegrations(
  blueprint: BusinessBlueprint,
  workspace: CompanyWorkspace,
  evidence: SolutionEvidenceRef[],
): SolutionIntegration[] {
  const fromBlueprint = blueprint.integrations.map((integ) => ({
    id: createId("sint"),
    name: integ.name,
    purpose: integ.purpose,
    status: integ.status,
    confidence: 0.8,
    evidence: evidence.slice(0, 2),
  }));

  const fromSystems = blueprint.systems.map((system) => ({
    id: createId("sint"),
    name: system.name,
    purpose: system.purpose,
    status: /excel|whatsapp|paper/i.test(system.name)
      ? ("retire" as const)
      : ("current" as const),
    confidence: 0.78,
    evidence: evidence.slice(0, 2),
  }));

  const fromKnowledge = (workspace.knowledge?.entities ?? [])
    .filter((e) => e.kind === "System")
    .map((e) => ({
      id: createId("sint"),
      name: e.name,
      purpose: e.summary ?? "Sistema actual observado en el conocimiento capturado.",
      status: "current" as const,
      confidence: e.confidence,
      evidence: [
        { source: "knowledge" as const, id: e.id, label: e.name },
        ...evidence.slice(0, 1),
      ],
    }));

  const merged = [...fromBlueprint, ...fromSystems, ...fromKnowledge];
  const seen = new Set<string>();
  return merged.filter((item) => {
    const key = item.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function detectAiAgents(
  modules: SolutionModule[],
  evidence: SolutionEvidenceRef[],
): SolutionAiAgent[] {
  if (!modules.some((m) => m.name === "AI Assistant" || m.name === "Knowledge")) {
    return [];
  }

  return [
    {
      id: createId("sai"),
      name: "Asistente operativo",
      purpose:
        "Resume excepciones y redacta seguimientos a partir de registros duraderos — nunca inventa datos.",
      dependsOnModules: modules
        .map((m) => m.name)
        .filter((n) => ["Knowledge", "CRM", "Sales", "Approvals"].includes(n)),
      confidence: 0.55,
      evidence: evidence.slice(0, 2),
    },
  ];
}
