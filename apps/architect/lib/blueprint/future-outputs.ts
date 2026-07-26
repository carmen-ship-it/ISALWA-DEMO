import type { BlueprintFutureOutput } from "@/types";

/**
 * Future outputs generated FROM the Business Blueprint.
 * Nothing generated in Mission 4 — architecture only.
 */
export const BLUEPRINT_FUTURE_OUTPUTS: readonly BlueprintFutureOutput[] = [
  {
    id: "process_maps",
    title: "Mapas de proceso",
    description: "Visualizar los flujos del blueprint como diagramas de proceso vivos.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "proposal_pdfs",
    title: "Propuestas en PDF",
    description: "Propuestas ejecutivas basadas en capacidades y oportunidades.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "technical_prds",
    title: "Requisitos técnicos",
    description: "Requisitos de producto derivados de las capacidades y entidades.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "epic_backlogs",
    title: "Backlogs de épicas",
    description: "Épicas de entrega mapeadas a partir de las brechas de capacidades.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "cursor_prompts",
    title: "Instrucciones de construcción",
    description: "Instrucciones de implementación basadas en la estructura del blueprint.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "architecture_documents",
    title: "Documentos de arquitectura",
    description: "Narrativas de arquitectura de sistema a partir de los estados futuros.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "implementation_roadmaps",
    title: "Planes de implementación",
    description: "Planes por fases a partir de los horizontes de la matriz de oportunidades.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "isalwa_configuration",
    title: "Configuración de ISALWA",
    description: "Génesis del proyecto a partir de capacidades, entidades y reglas.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "software_estimates",
    title: "Estimaciones de software",
    description: "Rangos de esfuerzo a partir de la complejidad, capacidades e integraciones.",
    status: "planned",
    sourcedFrom: "business_blueprint",
  },
  {
    id: "rfp_responses",
    title: "Respuestas a licitaciones",
    description: "Respuestas estructuradas a licitaciones basadas en el blueprint operativo.",
    status: "designed",
    sourcedFrom: "business_blueprint",
  },
] as const;
