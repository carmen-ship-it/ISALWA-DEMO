import type { DeliverableExportContract } from "@/types";

/**
 * Future export targets — contracts only.
 * No PDF / DOCX / PPT / Notion / Jira implementation in Mission 9.
 */
export const DELIVERABLE_EXPORT_CONTRACTS: readonly DeliverableExportContract[] =
  [
    {
      id: "pdf",
      title: "PDF",
      description: "Paquete ejecutivo en PDF para la entrega al cliente.",
      status: "planned",
    },
    {
      id: "word",
      title: "Word",
      description: "DOCX editable para las narrativas de propuesta y alcance.",
      status: "planned",
    },
    {
      id: "markdown",
      title: "Markdown",
      description: "Markdown compatible con repositorio para Cursor y GitHub.",
      status: "designed",
    },
    {
      id: "powerpoint",
      title: "PowerPoint",
      description: "Diapositivas ejecutivas de calidad para presentación.",
      status: "planned",
    },
    {
      id: "notion",
      title: "Notion",
      description: "Publicar los entregables en un espacio de Notion.",
      status: "planned",
    },
    {
      id: "confluence",
      title: "Confluence",
      description: "Publicación en wiki empresarial.",
      status: "planned",
    },
    {
      id: "cursor",
      title: "Cursor",
      description: "Inyectar el resumen de construcción como contexto del agente maestro.",
      status: "designed",
    },
    {
      id: "github",
      title: "GitHub",
      description: "Abrir plantillas de issues / PR a partir del backlog.",
      status: "planned",
    },
    {
      id: "linear",
      title: "Linear",
      description: "Sincronizar épicas e historias con Linear.",
      status: "planned",
    },
    {
      id: "jira",
      title: "Jira",
      description: "Sincronizar épicas e historias con Jira.",
      status: "planned",
    },
  ] as const;
