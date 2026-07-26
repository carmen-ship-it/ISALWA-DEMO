import type { SolutionFutureOutput } from "@/types";

/**
 * Future outputs from Solution Architecture — contracts only.
 * Nothing generated in Mission 6.
 */
export const SOLUTION_FUTURE_OUTPUTS: readonly SolutionFutureOutput[] = [
  {
    id: "cursor_prompts",
    title: "Instrucciones de construcción",
    description: "Instrucciones de implementación basadas en capacidades, entidades y conectividad.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "prds",
    title: "Requisitos de producto",
    description: "Requisitos de producto derivados de las capacidades y flujos de trabajo.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "database_schemas",
    title: "Esquemas de información",
    description: "Esquemas físicos generados a partir del modelo conceptual.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "openapi",
    title: "Especificación de conectividad",
    description: "Especificaciones de conectividad legibles por máquina a partir de las superficies conceptuales.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "architecture_diagrams",
    title: "Diagramas de arquitectura",
    description: "Diagramas visuales de capacidades y relaciones.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "sprint_plans",
    title: "Planes de entrega",
    description: "Cortes de entrega a partir del plan de implementación.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "developer_handoff",
    title: "Entrega a ingeniería",
    description: "Contexto empaquetado para los equipos de ingeniería.",
    status: "designed",
    sourcedFrom: "solution_architecture",
  },
  {
    id: "infrastructure_plans",
    title: "Planes de infraestructura",
    description: "Recomendaciones de hospedaje y entornos.",
    status: "planned",
    sourcedFrom: "solution_architecture",
  },
] as const;
