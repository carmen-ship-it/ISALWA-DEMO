/**
 * Mission 18 — section map from existing engines.
 * Summaries and IDs only; never regenerates deliverable / solution content.
 */

import { moduleLabel, phaseLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  DeliverablesPackage,
  ImplementationSectionId,
  ImplementationSectionRef,
} from "@/types";

const SECTION_META: Record<
  ImplementationSectionId,
  { title: string; sourceEngine: ImplementationSectionRef["sourceEngine"] }
> = {
  business_blueprint: {
    title: "Blueprint de negocio",
    sourceEngine: "blueprint",
  },
  solution_architecture: {
    title: "Sistema recomendado",
    sourceEngine: "solution",
  },
  modules: { title: "Capacidades", sourceEngine: "solution" },
  database_model: { title: "Modelo de información", sourceEngine: "solution" },
  permissions: { title: "Permisos", sourceEngine: "solution" },
  process_maps: { title: "Mapas de proceso", sourceEngine: "processes" },
  navigation: { title: "Navegación", sourceEngine: "solution" },
  api_contracts: { title: "Contratos de conectividad", sourceEngine: "solution" },
  sprint_roadmap: { title: "Plan de entregas", sourceEngine: "deliverables" },
  implementation_phases: {
    title: "Fases de implementación",
    sourceEngine: "deliverables",
  },
  technical_risks: { title: "Riesgos técnicos", sourceEngine: "consulting" },
  cursor_context: { title: "Resumen de construcción", sourceEngine: "deliverables" },
  developer_handoff: {
    title: "Entrega a ingeniería",
    sourceEngine: "deliverables",
  },
};

/** Implementation package section `sourceEngine` token → Spanish. */
export function sectionSourceEngineLabel(
  engine: ImplementationSectionRef["sourceEngine"],
): string {
  const labels: Record<ImplementationSectionRef["sourceEngine"], string> = {
    blueprint: "Blueprint",
    solution: "Sistema recomendado",
    processes: "Procesos",
    consulting: "Consultoría",
    deliverables: "Entregables",
    knowledge: "Conocimiento",
  };
  return labels[engine] ?? engine;
}

/**
 * Build the ordered section list pointing at existing artifacts.
 */
export function buildImplementationSections(
  workspace: CompanyWorkspace,
  deliverables: DeliverablesPackage | null,
): ImplementationSectionRef[] {
  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;
  const solution = workspace.solutionArchitecture;
  const processes = workspace.businessProcesses;
  const consulting = workspace.conversationMemory?.consulting;

  const ids: ImplementationSectionId[] = [
    "business_blueprint",
    "solution_architecture",
    "modules",
    "database_model",
    "permissions",
    "process_maps",
    "navigation",
    "api_contracts",
    "sprint_roadmap",
    "implementation_phases",
    "technical_risks",
    "cursor_context",
    "developer_handoff",
  ];

  return ids.map((id) => sectionFor(id, {
    workspace,
    deliverables,
    blueprint,
    solution,
    processes,
    consulting,
    meta: SECTION_META[id],
  }));
}

function sectionFor(
  id: ImplementationSectionId,
  ctx: {
    workspace: CompanyWorkspace;
    deliverables: DeliverablesPackage | null;
    blueprint: CompanyWorkspace["blueprints"][number] | null;
    solution: CompanyWorkspace["solutionArchitecture"];
    processes: CompanyWorkspace["businessProcesses"];
    consulting:
      | NonNullable<CompanyWorkspace["conversationMemory"]>["consulting"]
      | undefined;
    meta: { title: string; sourceEngine: ImplementationSectionRef["sourceEngine"] };
  },
): ImplementationSectionRef {
  const { workspace, deliverables, blueprint, solution, processes, consulting, meta } =
    ctx;

  switch (id) {
    case "business_blueprint": {
      const bpDel = deliverables?.businessBlueprint;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(blueprint || bpDel),
        summary: blueprint
          ? `Blueprint v${blueprint.version} — ${blueprint.summary}`
          : bpDel
            ? bpDel.summary
            : "El blueprint aún no se ha derivado.",
        artifacts: [
          ...(blueprint
            ? [
                {
                  engine: "blueprint" as const,
                  id: blueprint.id,
                  label: `BusinessBlueprint v${blueprint.version}`,
                  path: "blueprints.current",
                },
              ]
            : []),
          ...(bpDel && deliverables
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · business_blueprint",
                  path: "deliverables.businessBlueprint",
                },
              ]
            : []),
        ],
      };
    }
    case "solution_architecture": {
      const solDel = deliverables?.solutionArchitecture;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution || solDel),
        summary: solution
          ? solution.summary
          : solDel
            ? solDel.summary
            : "El sistema recomendado aún no se ha derivado.",
        artifacts: [
          ...(solution
            ? [
                {
                  engine: "solution" as const,
                  id: solution.id,
                  label: "SolutionArchitecture",
                  path: "solutionArchitecture",
                },
              ]
            : []),
          ...(solDel && deliverables
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · solution_architecture",
                  path: "deliverables.solutionArchitecture",
                },
              ]
            : []),
        ],
      };
    }
    case "modules":
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution?.modules.length),
        summary: solution?.modules.length
          ? `${solution.modules.length} capacidades — ${solution.modules
              .map((m) => moduleLabel(m.name))
              .slice(0, 6)
              .join(", ")}${solution.modules.length > 6 ? "…" : ""}`
          : "No hay capacidades del sistema disponibles.",
        artifacts: (solution?.modules ?? []).map((m) => ({
          engine: "solution" as const,
          id: m.id,
          label: m.name,
          path: "solutionArchitecture.modules",
        })),
      };
    case "database_model":
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution?.database.length),
        summary: solution?.database.length
          ? `${solution.database.length} tablas conceptuales del sistema recomendado.`
          : deliverables?.technicalArchitecture.databaseConcepts.length
            ? `${deliverables.technicalArchitecture.databaseConcepts.length} conceptos de información en el entregable de arquitectura técnica.`
            : "No hay modelo de información disponible.",
        artifacts: [
          ...(solution?.database ?? []).map((t) => ({
            engine: "solution" as const,
            id: t.id,
            label: String(t.entity),
            path: "solutionArchitecture.database",
          })),
          ...(deliverables
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · technical_architecture.databaseConcepts",
                  path: "deliverables.technicalArchitecture",
                },
              ]
            : []),
        ],
      };
    case "permissions":
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution?.permissions.length),
        summary: solution?.permissions.length
          ? `${solution.permissions.length} capacidades · ${solution.roles.length} roles.`
          : "No hay modelo de permisos disponible.",
        artifacts: (solution?.permissions ?? []).map((p) => ({
          engine: "solution" as const,
          id: p.id,
          label: p.capability,
          path: "solutionArchitecture.permissions",
        })),
      };
    case "process_maps": {
      const book = deliverables?.processBook;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(processes?.workflows.length || book),
        summary: processes
          ? `${processes.workflows.length} flujos de trabajo — ${processes.summary}`
          : book
            ? book.summary
            : "Los mapas de proceso aún no se han derivado.",
        artifacts: [
          ...(processes
            ? [
                {
                  engine: "processes" as const,
                  id: processes.id,
                  label: "BusinessProcessModel",
                  path: "businessProcesses",
                },
                ...processes.workflows.map((w) => ({
                  engine: "processes" as const,
                  id: w.id,
                  label: w.name,
                  path: "businessProcesses.workflows",
                })),
              ]
            : []),
          ...(book && deliverables
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · process_book",
                  path: "deliverables.processBook",
                },
              ]
            : []),
        ],
      };
    }
    case "navigation":
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution?.navigation.length),
        summary: solution?.navigation.length
          ? `${solution.navigation.length} elementos de navegación — ${solution.navigation
              .map((n) => n.label)
              .slice(0, 5)
              .join(", ")}`
          : "No hay modelo de navegación disponible.",
        artifacts: (solution?.navigation ?? []).map((n) => ({
          engine: "solution" as const,
          id: n.id,
          label: n.label,
          path: "solutionArchitecture.navigation",
        })),
      };
    case "api_contracts":
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(solution?.apis.length),
        summary: solution?.apis.length
          ? `${solution.apis.length} recursos de conectividad conceptuales.`
          : deliverables?.technicalArchitecture.apiConcepts.length
            ? `${deliverables.technicalArchitecture.apiConcepts.length} conceptos de conectividad en la arquitectura técnica.`
            : "No hay contratos de conectividad disponibles.",
        artifacts: [
          ...(solution?.apis ?? []).map((a) => ({
            engine: "solution" as const,
            id: a.id,
            label: a.resource,
            path: "solutionArchitecture.apis",
          })),
          ...(deliverables
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · technical_architecture.apiConcepts",
                  path: "deliverables.technicalArchitecture",
                },
              ]
            : []),
        ],
      };
    case "sprint_roadmap": {
      const roadmap = deliverables?.developmentRoadmap;
      const backlog = deliverables?.sprintBacklog;
      const epicCount =
        backlog?.epics.reduce(
          (n, e) => n + e.features.reduce((fn, f) => fn + f.stories.length, 0),
          0,
        ) ?? 0;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(roadmap || backlog || solution?.roadmap.length),
        summary: roadmap
          ? `${roadmap.phases.length} fases del plan` +
            (backlog
              ? ` · ${backlog.epics.length} épicas · ${epicCount} historias`
              : "")
          : solution?.roadmap.length
            ? `${solution.roadmap.length} fases del plan de implementación.`
            : "El plan de entregas no está disponible.",
        artifacts: [
          ...(deliverables && roadmap
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · development_roadmap",
                  path: "deliverables.developmentRoadmap",
                },
              ]
            : []),
          ...(deliverables && backlog
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · sprint_backlog",
                  path: "deliverables.sprintBacklog",
                },
              ]
            : []),
          ...(solution?.roadmap ?? []).map((p) => ({
            engine: "solution" as const,
            id: p.id,
            label: `Fase ${p.phase}: ${phaseLabel(p.name)}`,
            path: "solutionArchitecture.roadmap",
          })),
        ],
      };
    }
    case "implementation_phases": {
      const plan = deliverables?.implementationPlan;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(plan || solution?.roadmap.length),
        summary: plan
          ? `${plan.phases.length} fases de implementación con frentes de trabajo y criterios de cierre.`
          : solution?.roadmap.length
            ? `${solution.roadmap.length} fases de implementación del sistema recomendado.`
            : "Las fases de implementación no están disponibles.",
        artifacts: [
          ...(deliverables && plan
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · implementation_plan",
                  path: "deliverables.implementationPlan",
                },
              ]
            : []),
          ...(solution?.roadmap ?? []).map((p) => ({
            engine: "solution" as const,
            id: p.id,
            label: phaseLabel(p.name),
            path: "solutionArchitecture.roadmap",
          })),
        ],
      };
    }
    case "technical_risks": {
      const consultingRisks = consulting?.risks ?? [];
      const planRisks = deliverables?.implementationPlan.risks ?? [];
      const bpRisks = blueprint?.risks ?? [];
      const available =
        consultingRisks.length > 0 ||
        planRisks.length > 0 ||
        bpRisks.length > 0;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available,
        summary: available
          ? `${consultingRisks.length} riesgos de consultoría` +
            (planRisks.length ? ` · ${planRisks.length} riesgos del plan` : "") +
            (bpRisks.length ? ` · ${bpRisks.length} riesgos del blueprint` : "")
          : "Aún no se han registrado riesgos técnicos u operativos.",
        artifacts: [
          ...consultingRisks.map((r) => ({
            engine: "consulting" as const,
            id: r.id,
            label: r.title,
            path: "conversationMemory.consulting.risks",
          })),
          ...(deliverables && planRisks.length
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · implementation_plan.risks",
                  path: "deliverables.implementationPlan",
                },
              ]
            : []),
          ...(blueprint
            ? bpRisks.map((label, index) => ({
                engine: "blueprint" as const,
                id: `${blueprint.id}_risk_${index}`,
                label,
                path: "blueprints.risks",
              }))
            : []),
        ],
      };
    }
    case "cursor_context": {
      const ctx = deliverables?.cursorContext;
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available: Boolean(ctx),
        summary: ctx
          ? ctx.purpose
          : "El resumen de construcción aún no se ha generado.",
        artifacts:
          ctx && deliverables
            ? [
                {
                  engine: "deliverables",
                  id: deliverables.id,
                  label: "Deliverable · cursor_context",
                  path: "deliverables.cursorContext",
                },
              ]
            : [],
      };
    }
    case "developer_handoff": {
      const prd = deliverables?.prd;
      const tech = deliverables?.technicalArchitecture;
      const ctx = deliverables?.cursorContext;
      const available = Boolean(prd || tech || ctx);
      return {
        id,
        title: meta.title,
        sourceEngine: meta.sourceEngine,
        available,
        summary: available
          ? "Índice de entrega — requisitos, arquitectura técnica y resumen de construcción a partir de los Entregables (solo arquitectura; sin código ni instrucciones)."
          : "La entrega a ingeniería espera el paquete de entregables.",
        artifacts: [
          ...(deliverables && prd
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · prd",
                  path: "deliverables.prd",
                },
              ]
            : []),
          ...(deliverables && tech
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · technical_architecture",
                  path: "deliverables.technicalArchitecture",
                },
              ]
            : []),
          ...(deliverables && ctx
            ? [
                {
                  engine: "deliverables" as const,
                  id: deliverables.id,
                  label: "Deliverable · cursor_context",
                  path: "deliverables.cursorContext",
                },
              ]
            : []),
          ...(workspace.knowledge?.assets.slice(0, 3).map((a) => ({
            engine: "knowledge" as const,
            id: a.id,
            label: a.title,
            path: "knowledge.assets",
          })) ?? []),
        ],
      };
    }
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
