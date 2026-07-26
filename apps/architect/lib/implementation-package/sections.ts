/**
 * Mission 18 — section map from existing engines.
 * Summaries and IDs only; never regenerates deliverable / solution content.
 */

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
    title: "Business Blueprint",
    sourceEngine: "blueprint",
  },
  solution_architecture: {
    title: "Solution Architecture",
    sourceEngine: "solution",
  },
  modules: { title: "Modules", sourceEngine: "solution" },
  database_model: { title: "Database Model", sourceEngine: "solution" },
  permissions: { title: "Permissions", sourceEngine: "solution" },
  process_maps: { title: "Process Maps", sourceEngine: "processes" },
  navigation: { title: "Navigation", sourceEngine: "solution" },
  api_contracts: { title: "API Contracts", sourceEngine: "solution" },
  sprint_roadmap: { title: "Sprint Roadmap", sourceEngine: "deliverables" },
  implementation_phases: {
    title: "Implementation Phases",
    sourceEngine: "deliverables",
  },
  technical_risks: { title: "Technical Risks", sourceEngine: "consulting" },
  cursor_context: { title: "Cursor Context", sourceEngine: "deliverables" },
  developer_handoff: {
    title: "Developer Handoff",
    sourceEngine: "deliverables",
  },
};

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
            : "Blueprint not derived yet.",
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
            : "Solution architecture not derived yet.",
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
          ? `${solution.modules.length} modules — ${solution.modules
              .map((m) => m.name)
              .slice(0, 6)
              .join(", ")}${solution.modules.length > 6 ? "…" : ""}`
          : "No solution modules available.",
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
          ? `${solution.database.length} conceptual tables from Solution Architecture.`
          : deliverables?.technicalArchitecture.databaseConcepts.length
            ? `${deliverables.technicalArchitecture.databaseConcepts.length} database concepts in technical architecture deliverable.`
            : "No database model available.",
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
          ? `${solution.permissions.length} capabilities · ${solution.roles.length} roles.`
          : "No permissions model available.",
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
          ? `${processes.workflows.length} workflows — ${processes.summary}`
          : book
            ? book.summary
            : "Process maps not derived yet.",
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
          ? `${solution.navigation.length} nav items — ${solution.navigation
              .map((n) => n.label)
              .slice(0, 5)
              .join(", ")}`
          : "No navigation model available.",
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
          ? `${solution.apis.length} conceptual API resources.`
          : deliverables?.technicalArchitecture.apiConcepts.length
            ? `${deliverables.technicalArchitecture.apiConcepts.length} API concepts in technical architecture.`
            : "No API contracts available.",
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
          ? `${roadmap.phases.length} roadmap phases` +
            (backlog
              ? ` · ${backlog.epics.length} epics · ${epicCount} stories`
              : "")
          : solution?.roadmap.length
            ? `${solution.roadmap.length} solution roadmap phases.`
            : "Sprint roadmap not available.",
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
            label: `Phase ${p.phase}: ${p.name}`,
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
          ? `${plan.phases.length} implementation phases with workstreams and exit criteria.`
          : solution?.roadmap.length
            ? `${solution.roadmap.length} solution implementation phases.`
            : "Implementation phases not available.",
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
            label: p.name,
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
          ? `${consultingRisks.length} consulting risks` +
            (planRisks.length ? ` · ${planRisks.length} plan risks` : "") +
            (bpRisks.length ? ` · ${bpRisks.length} blueprint risks` : "")
          : "No technical / operational risks captured yet.",
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
          : "Cursor context deliverable not generated yet.",
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
          ? "Handoff index — PRD, technical architecture, and Cursor context from Deliverables (architecture only; no code or prompts)."
          : "Developer handoff awaits deliverables package.",
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
