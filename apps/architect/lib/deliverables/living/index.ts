/**
 * Mission 26 — Living Company Deliverables.
 *
 * Public API. Every generator here composes an existing engine (Blueprint,
 * Company Model, Process Engine, Consulting Intelligence, Explained
 * Recommendations) — see the per-kind files in this folder. This module
 * only wraps their output into a versioned, persisted
 * `LivingDeliverableVersion` and appends it to
 * `CompanyWorkspace.livingDeliverables` (append-only, same law as
 * `lib/blueprint`'s versioning).
 */

import { createId, nowIso } from "@/lib/utils";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type {
  CompanyWorkspace,
  LivingDeliverableKind,
  LivingDeliverableVersion,
  TimelineEvent,
} from "@/types";
import { generateAiPlaybook } from "./ai-playbook";
import { generateBusinessBlueprintLiving } from "./business-blueprint";
import { generateCompanyPlaybook } from "./company-playbook";
import { livingDeliverableCopy } from "./copy";
import { generateEmployeeHandbook } from "./employee-handbook";
import { deliverableConfidence, computeKnowledgeFingerprint } from "./fingerprint";
import { generateImprovementRoadmap } from "./improvement-roadmap";
import { generateJobDescriptionLibrary } from "./job-description-library";
import { generateSopLibrary } from "./sop-library";
import { generateTrainingAcademy } from "./training-academy";
import {
  appendLivingDeliverableVersion,
  emptyLivingDeliverablesState,
  nextLivingDeliverableVersion,
} from "./versioning";

export {
  buildLivingDeliverablesOverview,
  historyForKind,
  isUpdateAvailable,
  latestLivingDeliverable,
  LIVING_DELIVERABLE_KINDS,
} from "./versioning";
export { computeKnowledgeFingerprint } from "./fingerprint";
export { livingDeliverableCopy, type LivingDeliverableCopy } from "./copy";

interface GeneratedResultShape {
  title: string;
  content: LivingDeliverableVersion["content"];
  evidence: LivingDeliverableVersion["evidence"];
  missingInformation: string[];
  contentSignalCount: number;
}

function runGenerator(
  workspace: CompanyWorkspace,
  kind: LivingDeliverableKind,
): GeneratedResultShape | null {
  switch (kind) {
    case "business_blueprint": {
      const result = generateBusinessBlueprintLiving(workspace);
      if (!result) return null;
      return { ...result, content: { kind, data: result.content } };
    }
    case "company_playbook": {
      const result = generateCompanyPlaybook(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "employee_handbook": {
      const result = generateEmployeeHandbook(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "sop_library": {
      const result = generateSopLibrary(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "job_description_library": {
      const result = generateJobDescriptionLibrary(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "training_academy": {
      const result = generateTrainingAcademy(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "ai_playbook": {
      const result = generateAiPlaybook(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    case "improvement_roadmap": {
      const result = generateImprovementRoadmap(workspace);
      return { ...result, content: { kind, data: result.content } };
    }
    default:
      return null;
  }
}

/**
 * Pure builder — composes a new version for one deliverable kind. Returns
 * `null` only for `business_blueprint` before any Blueprint has ever been
 * generated (nothing to present yet).
 */
export function generateLivingDeliverableVersion(
  workspace: CompanyWorkspace,
  kind: LivingDeliverableKind,
): LivingDeliverableVersion | null {
  const generated = runGenerator(workspace, kind);
  if (!generated) return null;

  const fingerprint = computeKnowledgeFingerprint(workspace);
  const version = nextLivingDeliverableVersion(workspace.livingDeliverables, kind);

  return {
    id: createId("living_deliverable"),
    kind,
    version,
    generatedAt: nowIso(),
    title: generated.title,
    confidence: deliverableConfidence(workspace, generated.contentSignalCount),
    evidenceCount: generated.evidence.length,
    evidence: generated.evidence,
    missingInformation: generated.missingInformation,
    fingerprint,
    content: generated.content,
    superseded: false,
  };
}

/**
 * Regenerate + persist — the user-triggered action behind every "Generate
 * {company}'s X" / "Update" button. Never runs automatically: the brain
 * learning something new only flips `updateAvailable`, per the mission's
 * "user chooses regenerate" rule.
 */
export async function regenerateLivingDeliverable(
  workspaceId: string,
  kind: LivingDeliverableKind,
): Promise<{ workspace: CompanyWorkspace; version: LivingDeliverableVersion } | null> {
  const store = getClientCompanyMemoryStore();
  const workspace = await store.workspaces.get(workspaceId);
  if (!workspace) return null;

  const version = generateLivingDeliverableVersion(workspace, kind);
  if (!version) return null;

  const stamp = version.generatedAt;
  const copy = livingDeliverableCopy(kind, workspace.companyName);
  const nextState = appendLivingDeliverableVersion(
    workspace.livingDeliverables ?? emptyLivingDeliverablesState(),
    version,
  );

  const timelineEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId,
    date: stamp,
    title: `${copy.shortTitle} v${version.version} · ${workspace.companyName}`,
    description: `Architect generó ${copy.title.toLowerCase()} a partir del conocimiento actual de la empresa.`,
    category: "deliverable",
  };

  const next: CompanyWorkspace = {
    ...workspace,
    livingDeliverables: nextState,
    updatedAt: stamp,
    lastActivityAt: stamp,
    lastActivityLabel: `${copy.title} generado`,
    timeline: [timelineEvent, ...workspace.timeline],
  };

  const saved = await store.workspaces.save(next);
  return { workspace: saved, version };
}
