import { complexityLabel, moduleLabel, phaseLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  ProposalDeliverable,
} from "@/types";

export function buildProposal(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
  executiveRecommendation: string,
  roadmapPhases: string[],
): ProposalDeliverable {
  const solution = workspace.solutionArchitecture;
  const company = workspace.companyName;

  return {
    kind: "proposal",
    title: `Propuesta de sistema operativo · ${company}`,
    engagementSummary: `ISALWA Architect completó el descubrimiento para ${company}. Esta propuesta empaqueta el Plan de negocio, la Arquitectura de solución y el Diseño de procesos en un encargo ejecutable.`,
    recommendedApproach: executiveRecommendation,
    scope: [
      ...(solution?.modules.slice(0, 8).map((m) => `Implementar ${moduleLabel(m.name)}`) ?? []),
      "Establecer rastros de aprobación y auditoría",
      "Reemplazar los flujos frágiles de hojas de cálculo / chat donde la evidencia lo respalde",
    ],
    timelineOutline: roadmapPhases.slice(0, 5),
    investmentNarrative:
      solution?.roadmap
        .map((p) => `${phaseLabel(p.name)} (${complexityLabel(p.estimatedComplexity)}): ${p.businessValue}`)
        .join(" ") ??
      "La inversión prioriza los cimientos, los flujos comerciales centrales y luego la automatización.",
    nextSteps: [
      "Revisar el paquete de entregables con la dirección",
      "Confirmar el alcance de la Fase 1 y las métricas de éxito",
      "Autorizar el arranque de la implementación",
    ],
    evidence: evidence.slice(0, 5),
  };
}
