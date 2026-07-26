/**
 * Mission 18 — Implementation Package orchestration.
 * Assembles a typed package when the discovery conclusion threshold is met.
 * Composes existing deliverables / solution / blueprint / process artifacts.
 * Never generates code, SQL, OpenAPI, or Cursor prompts.
 */

import { buildDeliverablesPackage } from "@/lib/deliverables";
import { nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  DeliverablesPackage,
  ImplementationPackage,
} from "@/types";
import { buildImplementationSections } from "./sections";
import {
  evaluateImplementationGate,
  isImplementationThresholdMet,
} from "./threshold";

function stablePackageId(
  workspaceId: string,
  blueprintVersion: number | null,
): string {
  const version = blueprintVersion ?? 0;
  return `impl_${workspaceId}_bp${version}`;
}

function resolveDeliverables(
  workspace: CompanyWorkspace,
): DeliverablesPackage | null {
  if (workspace.deliverables) return workspace.deliverables;
  if (!isImplementationThresholdMet(workspace)) return null;
  if (!workspace.solutionArchitecture && workspace.blueprints.length === 0) {
    return null;
  }
  return buildDeliverablesPackage(workspace);
}

function compositeConfidence(
  workspace: CompanyWorkspace,
  deliverables: DeliverablesPackage | null,
): number {
  if (deliverables) return deliverables.overallConfidence;
  const parts = [
    workspace.solutionArchitecture?.overallConfidence,
    workspace.businessProcesses?.overallConfidence,
    workspace.conversationMemory?.consulting?.confidence.overall,
  ].filter((n): n is number => typeof n === "number");
  if (parts.length === 0) return 0.4;
  return (
    Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100
  );
}

/**
 * Pure assembler. Returns null when the conclusion threshold is not met.
 * When threshold is met but engines are incomplete, still returns a package
 * with `gate.ready === false` and section availability flags — never invents.
 */
export function assembleImplementationPackage(
  workspace: CompanyWorkspace,
): ImplementationPackage | null {
  if (!isImplementationThresholdMet(workspace)) {
    return null;
  }

  const gate = evaluateImplementationGate(workspace);
  const deliverables = resolveDeliverables(workspace);
  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;
  const stamp = nowIso();
  const sections = buildImplementationSections(workspace, deliverables);
  const availableCount = sections.filter((s) => s.available).length;

  const enginesComplete =
    Boolean(blueprint) &&
    Boolean(workspace.solutionArchitecture) &&
    Boolean(workspace.businessProcesses) &&
    Boolean(deliverables);
  const ready = gate.thresholdMet && enginesComplete;

  return {
    id: stablePackageId(workspace.id, blueprint?.version ?? null),
    workspaceId: workspace.id,
    companyName: workspace.companyName,
    generatedAt: stamp,
    gate: {
      ...gate,
      ready,
      missingPrerequisites: [
        ...(!blueprint ? ["Business Blueprint"] : []),
        ...(!workspace.solutionArchitecture ? ["Solution Architecture"] : []),
        ...(!workspace.businessProcesses ? ["Process Maps"] : []),
        ...(!deliverables ? ["Deliverables Package"] : []),
      ],
      status: ready ? "ready" : "not_ready",
      notes: [
        ...gate.notes.filter((n) => !n.startsWith("Ready —")),
        ready
          ? "Ready — architecture package references existing Blueprint, Solution, Processes, Deliverables, and Consulting artifacts."
          : `Threshold met · ${availableCount}/${sections.length} sections have engine artifacts.`,
      ],
    },
    blueprintId: blueprint?.id ?? null,
    blueprintVersion: blueprint?.version ?? null,
    solutionId: workspace.solutionArchitecture?.id ?? null,
    processModelId: workspace.businessProcesses?.id ?? null,
    deliverablesId: deliverables?.id ?? null,
    summary: `Implementation package for ${workspace.companyName} — ${availableCount}/${sections.length} architecture sections referencing existing engines (no code generation).`,
    sections,
    overallConfidence: compositeConfidence(workspace, deliverables),
  };
}

/**
 * Always returns a gate snapshot; package only when threshold met.
 */
export function buildImplementationPackageResult(workspace: CompanyWorkspace): {
  gate: ReturnType<typeof evaluateImplementationGate>;
  pack: ImplementationPackage | null;
} {
  const gate = evaluateImplementationGate(workspace);
  const pack = assembleImplementationPackage(workspace);
  return { gate, pack };
}
