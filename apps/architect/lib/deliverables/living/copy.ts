/**
 * Mission 26 — client-facing Spanish copy for the Living Deliverables
 * Center, generated in-engine (per `docs/ai/02_ARCHITECT_CONSTITUTION.md`
 * rule 6) because every sentence here interpolates the real
 * `workspace.companyName` — it cannot live in a static `lib/i18n` dictionary
 * without drifting per company.
 *
 * UX rule (Carmen, Mission 26 refinement): the primary action always reads
 * as "build this company's own document" — never "Download PDF" as if
 * handing over a static template. Downloads only appear once a version
 * exists, offered as a secondary step after generation.
 */

import type { LivingDeliverableKind } from "@/types";

export interface LivingDeliverableCopy {
  kicker: string;
  title: string;
  shortTitle: string;
  description: string;
  /** Primary CTA before any version exists — "Generate {company}'s X". */
  generateLabel: string;
  generateBusyLabel: string;
  /** Primary CTA once a version exists but the brain has learned something new. */
  updateLabel: string;
  /** Secondary CTA once a version exists and nothing changed — regenerate anyway. */
  regenerateLabel: string;
  emptyStateNote: string;
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
    `El manual de convivencia y operación para el equipo de ${c} — honesto donde todavía falta conocimiento.`,
  sop_library: (c) =>
    `Un procedimiento operativo por cada proceso que Architect ya descubrió en ${c}.`,
  job_description_library: (c) =>
    `Descripciones de puesto reales, a partir de los roles y personas mapeados en ${c}.`,
  training_academy: (c) =>
    `Rutas de capacitación para el equipo de ${c}, con guion de video y evaluación como hoja de ruta futura.`,
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
    generateLabel: `Generar ${t.noun} de ${companyName}`,
    generateBusyLabel: `Generando ${t.short.toLowerCase()} de ${companyName}…`,
    updateLabel: `Actualizar ${t.noun} de ${companyName}`,
    regenerateLabel: `Regenerar ${t.short.toLowerCase()}`,
    emptyStateNote: `Architect todavía no ha construido ${t.noun.toLowerCase()} de ${companyName} — se compone al instante desde lo que ya sabe.`,
  };
}
