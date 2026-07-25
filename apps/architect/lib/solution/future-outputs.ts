import type { SolutionFutureOutput } from "@/types";

/**
 * Future outputs from Solution Architecture — contracts only.
 * Nothing generated in Mission 6.
 */
export const SOLUTION_FUTURE_OUTPUTS: readonly SolutionFutureOutput[] = [
  {
    id: "cursor_prompts",
    title: "Cursor prompts",
    description: "Implementation prompts grounded in modules, entities, and APIs.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "prds",
    title: "PRDs",
    description: "Product requirements derived from modules and workflows.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "database_schemas",
    title: "Database schemas",
    description: "Physical schemas generated from the conceptual model.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "openapi",
    title: "OpenAPI",
    description: "Machine-readable API specs from conceptual surfaces.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "architecture_diagrams",
    title: "Architecture diagrams",
    description: "Visual module and relationship diagrams.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "sprint_plans",
    title: "Sprint plans",
    description: "Delivery slices from the implementation roadmap.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "developer_handoff",
    title: "Developer handoff",
    description: "Packaged context for engineering teams.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "infrastructure_plans",
    title: "Infrastructure plans",
    description: "Hosting and environment recommendations.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
] as const;
