import { createId } from "@/lib/utils";
import type {
  ImplementationPhase,
  SolutionModule,
  SolutionModuleName,
} from "@/types";

type PhaseDefinition = Omit<ImplementationPhase, "id" | "modules"> & {
  moduleCandidates: SolutionModuleName[];
};

/**
 * Canonical phase copy, keyed by phase number (stable across data migrations).
 * Exported so `lib/consulting/normalize.ts` can refresh persisted
 * `ImplementationPhase` objects that were generated before a copy update —
 * a workspace's `solutionArchitecture` is only regenerated when the
 * blueprint changes, so its roadmap text can otherwise go stale.
 */
export const ROADMAP_PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    phase: 1,
    name: "Foundation",
    goals: [
      "Establecer identidad, roles y principios de sistema de registro",
      "Levantar los cimientos centrales de cliente/entidad",
    ],
    moduleCandidates: ["CRM", "Documents", "Approvals", "Notifications", "Knowledge"],
    dependencies: ["Acuerdo sobre el blueprint", "Patrocinio del dueño"],
    businessValue: "Crea una verdad duradera y control de acceso antes de automatizar procesos.",
    estimatedComplexity: "moderate",
    confidence: 0.85,
  },
  {
    phase: 2,
    name: "Core Sales",
    goals: [
      "Digitalizar el ciclo comercial, desde la consulta hasta el pedido",
      "Reemplazar el chat como CRM improvisado",
    ],
    moduleCandidates: ["Sales", "CRM", "Analytics"],
    dependencies: ["Cimientos de la fase 1"],
    businessValue: "Protege el historial de clientes y acelera el ciclo de cotización a pedido.",
    estimatedComplexity: "high",
    confidence: 0.84,
  },
  {
    phase: 3,
    name: "Operations",
    goals: [
      "Digitalizar los traspasos de compras, inventario y producción",
      "Introducir rastros de aprobación para el gasto en materiales",
    ],
    moduleCandidates: [
      "Purchasing",
      "Inventory",
      "Production",
      "Maintenance",
      "Scheduling",
      "Field Service",
      "Assets",
    ],
    dependencies: ["Verdad comercial de la fase 2"],
    businessValue: "Elimina las hojas de cálculo y la coordinación verbal de las operaciones centrales.",
    estimatedComplexity: "very_high",
    confidence: 0.8,
  },
  {
    phase: 4,
    name: "Automation",
    goals: [
      "Automatizar la detección y el reporte de excepciones",
      "Reducir la doble captura manual de datos",
    ],
    moduleCandidates: ["Analytics", "Notifications", "Finance", "Collections"],
    dependencies: ["Calidad de datos operativos de la fase 3"],
    businessValue: "Los gerentes intervienen a tiempo; finanzas ve la verdad al día.",
    estimatedComplexity: "high",
    confidence: 0.75,
  },
  {
    phase: 5,
    name: "AI",
    goals: [
      "Asistir solo sobre datos duraderos",
      "Resumir excepciones y redactar seguimientos",
    ],
    moduleCandidates: ["AI Assistant", "Knowledge"],
    dependencies: ["Datos limpios", "Propiedad clara", "Fases 1–4"],
    businessValue: "Aprovecha la IA sin que se convierta en la fuente de verdad.",
    estimatedComplexity: "moderate",
    confidence: 0.6,
  },
];

/**
 * Implementation roadmap phases — deterministic.
 */
export function detectRoadmap(modules: SolutionModule[]): ImplementationPhase[] {
  const names = new Set(modules.map((m) => m.name));
  const pick = (...candidates: SolutionModuleName[]) =>
    candidates.filter((c) => names.has(c));

  const phases: ImplementationPhase[] = ROADMAP_PHASE_DEFINITIONS.map((def) => ({
    id: createId("sphase"),
    phase: def.phase,
    name: def.name,
    goals: def.goals,
    modules: pick(...def.moduleCandidates),
    dependencies: def.dependencies,
    businessValue: def.businessValue,
    estimatedComplexity: def.estimatedComplexity,
    confidence: def.confidence,
  }));

  return phases.filter((p) => p.modules.length > 0);
}
