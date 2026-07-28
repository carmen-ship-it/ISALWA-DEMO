/**
 * Mission 26 + Mission 27 — client-facing Spanish copy for Operating System
 * outputs. Generated in-engine (constitution rule 6) because every CTA
 * interpolates `workspace.companyName`.
 *
 * Mission 27 verb shift: Build / Build New Version / Export — never
 * "Download" as if handing over a static template. Deliverables are outputs;
 * the Company Operating System is the product.
 */

import type { LivingDeliverableKind } from "@/types";

export interface LivingDeliverableCopy {
  kicker: string;
  title: string;
  shortTitle: string;
  description: string;
  /** Primary CTA before any version exists — "Build {company}'s X". */
  generateLabel: string;
  generateBusyLabel: string;
  /** Primary CTA once a version exists but the brain has learned something new. */
  updateLabel: string;
  /** Secondary CTA once a version exists and nothing changed — rebuild anyway. */
  regenerateLabel: string;
  emptyStateNote: string;
  exportPdfLabel: string;
  exportWordLabel: string;
}

const TITLES: Record<LivingDeliverableKind, { kicker: string; title: string; short: string; noun: string }> = {
  business_blueprint: {
    kicker: "Blueprint de negocio",
    title: "Blueprint de Negocio",
    short: "Blueprint",
    noun: "el Blueprint de Negocio",
  },
  company_playbook: {
    kicker: "Playbook de la empresa",
    title: "Playbook de la Empresa",
    short: "Playbook",
    noun: "el Playbook",
  },
  employee_handbook: {
    kicker: "Manual del empleado",
    title: "Manual del Empleado",
    short: "Manual del empleado",
    noun: "el Manual del Empleado",
  },
  sop_library: {
    kicker: "Procedimientos operativos",
    title: "Biblioteca de Procedimientos (SOPs)",
    short: "Procedimientos",
    noun: "la Biblioteca de Procedimientos",
  },
  job_description_library: {
    kicker: "Descripciones de puesto",
    title: "Biblioteca de Descripciones de Puesto",
    short: "Descripciones de puesto",
    noun: "las Descripciones de Puesto",
  },
  training_academy: {
    kicker: "Academia de capacitación",
    title: "Academia de Capacitación",
    short: "Academia",
    noun: "la Academia de Capacitación",
  },
  ai_playbook: {
    kicker: "Playbook de IA",
    title: "Playbook de Inteligencia Artificial",
    short: "Playbook de IA",
    noun: "el Playbook de IA",
  },
  improvement_roadmap: {
    kicker: "Hoja de ruta de mejora",
    title: "Hoja de Ruta de Mejora",
    short: "Hoja de ruta",
    noun: "la Hoja de Ruta de Mejora",
  },
};

const DESCRIPTIONS: Record<LivingDeliverableKind, (company: string) => string> = {
  business_blueprint: (c) =>
    `Cómo opera ${c} hoy y cómo debería operar mañana — compuesto desde el Blueprint versionado.`,
  company_playbook: (c) =>
    `Misión, organización, principios de decisión y normas de comunicación de ${c}, desde lo que Architect ya sabe.`,
  employee_handbook: (c) =>
    `Salida del Sistema de Personas de ${c}: expectativas consistentes para el equipo — honesto donde todavía falta conocimiento.`,
  sop_library: (c) =>
    `Salida del Sistema de Operaciones: un procedimiento por cada proceso que Architect ya descubrió en ${c}.`,
  job_description_library: (c) =>
    `Roles y responsabilidades reales de ${c}, a partir de lo mapeado en el Company Brain.`,
  training_academy: (c) =>
    `Cómo el Sistema de Personas de ${c} multiplica lo que ya saben los mejores — guion de video y evaluación como hoja de ruta futura.`,
  ai_playbook: (c) =>
    `Dónde la IA puede ayudar primero en ${c}, priorizado desde las recomendaciones ya generadas.`,
  improvement_roadmap: (c) =>
    `Las oportunidades de ${c} organizadas en victorias rápidas, 30/90 días y largo plazo.`,
};

export function livingDeliverableCopy(
  kind: LivingDeliverableKind,
  companyName: string,
): LivingDeliverableCopy {
  const t = TITLES[kind];
  return {
    kicker: t.kicker,
    title: t.title,
    shortTitle: t.short,
    description: DESCRIPTIONS[kind](companyName),
    generateLabel: `Construir ${t.noun} de ${companyName}`,
    generateBusyLabel: `Construyendo ${t.short.toLowerCase()} de ${companyName}…`,
    updateLabel: `Construir nueva versión de ${t.noun} de ${companyName}`,
    regenerateLabel: `Construir de nuevo ${t.short.toLowerCase()}`,
    emptyStateNote: `Architect todavía no ha construido ${t.noun.toLowerCase()} de ${companyName} — se compone al instante desde lo que ya sabe.`,
    exportPdfLabel: "Exportar PDF",
    exportWordLabel: "Exportar Word",
  };
}
