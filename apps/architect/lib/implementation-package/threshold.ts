/**
 * Mission 18 — readiness gate for the Implementation Package.
 * Reuses discovery CONCLUSION_THRESHOLD — no parallel scoring system.
 */

import { CONCLUSION_THRESHOLD } from "@/lib/reasoning/confidence/score";
import type { CompanyWorkspace, ImplementationPackageGate } from "@/types";

/** Explicit alias — same bar as interview conclusion. */
export const IMPLEMENTATION_PACKAGE_THRESHOLD = CONCLUSION_THRESHOLD;

/**
 * Evaluate whether Architect may open the implementation package gate.
 * Deterministic. Does not invent understanding or regenerate engines.
 */
export function evaluateImplementationGate(
  workspace: CompanyWorkspace,
): ImplementationPackageGate {
  const threshold = IMPLEMENTATION_PACKAGE_THRESHOLD;
  const businessUnderstanding = workspace.businessUnderstanding;
  const thresholdMet = businessUnderstanding >= threshold;

  const missingPrerequisites: string[] = [];
  if (!workspace.currentBlueprintId && workspace.blueprints.length === 0) {
    missingPrerequisites.push("Blueprint de negocio");
  }
  if (!workspace.solutionArchitecture) {
    missingPrerequisites.push("Sistema recomendado");
  }
  if (!workspace.businessProcesses) {
    missingPrerequisites.push("Mapas de proceso");
  }
  if (!workspace.deliverables) {
    missingPrerequisites.push("Paquete de entregables");
  }

  const notes: string[] = [];
  if (!thresholdMet) {
    notes.push(
      `La comprensión del negocio es ${businessUnderstanding}% — se necesita ${threshold}% (umbral de conclusión del descubrimiento) antes de abrir el paquete de implementación.`,
    );
  } else if (missingPrerequisites.length > 0) {
    notes.push(
      "Umbral alcanzado, pero los motores canónicos están incompletos — falta terminar la derivación de blueprint / sistema recomendado / procesos / entregables.",
    );
  } else {
    notes.push(
      "Listo — el paquete de arquitectura referencia el Blueprint, el Sistema recomendado, los Procesos, los Entregables y los artefactos de Consultoría existentes.",
    );
  }

  const discovery = workspace.conversationMemory?.score;
  if (discovery?.readyToConclude === false && thresholdMet) {
    notes.push(
      "Se alcanzó el umbral numérico; el descubrimiento aún lista seguimientos abiertos — el paquete es solo arquitectónico.",
    );
  }

  const ready = thresholdMet && missingPrerequisites.length === 0;

  return {
    status: ready ? "ready" : "not_ready",
    threshold,
    businessUnderstanding,
    thresholdMet,
    ready,
    missingPrerequisites,
    notes,
  };
}

export function isImplementationThresholdMet(
  workspace: CompanyWorkspace,
): boolean {
  return workspace.businessUnderstanding >= IMPLEMENTATION_PACKAGE_THRESHOLD;
}
