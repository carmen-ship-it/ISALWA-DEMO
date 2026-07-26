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
    missingPrerequisites.push("Business Blueprint");
  }
  if (!workspace.solutionArchitecture) {
    missingPrerequisites.push("Solution Architecture");
  }
  if (!workspace.businessProcesses) {
    missingPrerequisites.push("Process Maps");
  }
  if (!workspace.deliverables) {
    missingPrerequisites.push("Deliverables Package");
  }

  const notes: string[] = [];
  if (!thresholdMet) {
    notes.push(
      `Business understanding is ${businessUnderstanding}% — need ${threshold}% (discovery conclusion threshold) before the implementation package opens.`,
    );
  } else if (missingPrerequisites.length > 0) {
    notes.push(
      "Threshold met, but canonical engines are incomplete — finish blueprint / solution / processes / deliverables derivation.",
    );
  } else {
    notes.push(
      "Ready — architecture package references existing Blueprint, Solution, Processes, Deliverables, and Consulting artifacts.",
    );
  }

  const discovery = workspace.conversationMemory?.score;
  if (discovery?.readyToConclude === false && thresholdMet) {
    notes.push(
      "Numeric threshold met; discovery still lists open follow-ups — package is architectural only.",
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
