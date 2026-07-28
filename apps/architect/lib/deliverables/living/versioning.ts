/**
 * Mission 26 — Living Company Deliverables versioning.
 *
 * Same append-only shape as `lib/blueprint/derive.ts`'s
 * `nextBlueprintVersion` / `appendBlueprintVersion` / `latestBlueprint`,
 * generalized across the eight living-deliverable kinds sharing one flat log
 * on `CompanyWorkspace.livingDeliverables`. Nothing here overwrites a prior
 * version — it is only ever marked `superseded`.
 */

import type {
  LivingDeliverableKind,
  LivingDeliverableOverview,
  LivingDeliverableVersion,
  LivingDeliverablesState,
} from "@/types";
import { computeKnowledgeFingerprint, fingerprintsMatch } from "./fingerprint";
import type { CompanyWorkspace } from "@/types";

export function emptyLivingDeliverablesState(): LivingDeliverablesState {
  return { versions: [] };
}

export function nextLivingDeliverableVersion(
  state: LivingDeliverablesState | null | undefined,
  kind: LivingDeliverableKind,
): number {
  const existing = (state?.versions ?? []).filter((v) => v.kind === kind);
  if (existing.length === 0) return 1;
  return Math.max(...existing.map((v) => v.version)) + 1;
}

export function latestLivingDeliverable(
  state: LivingDeliverablesState | null | undefined,
  kind: LivingDeliverableKind,
): LivingDeliverableVersion | null {
  const matches = (state?.versions ?? []).filter(
    (v) => v.kind === kind && !v.superseded,
  );
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => b.version - a.version)[0] ?? null;
}

export function historyForKind(
  state: LivingDeliverablesState | null | undefined,
  kind: LivingDeliverableKind,
): LivingDeliverableVersion[] {
  return (state?.versions ?? [])
    .filter((v) => v.kind === kind)
    .sort((a, b) => b.version - a.version);
}

export function appendLivingDeliverableVersion(
  state: LivingDeliverablesState | null | undefined,
  next: LivingDeliverableVersion,
): LivingDeliverablesState {
  const prior = state?.versions ?? [];
  const archived = prior.map((v) =>
    v.kind === next.kind && v.version < next.version
      ? { ...v, superseded: true }
      : v,
  );
  return { versions: [...archived, next] };
}

export function isUpdateAvailable(
  workspace: CompanyWorkspace,
  latest: LivingDeliverableVersion | null,
): boolean {
  if (!latest) return false;
  const current = computeKnowledgeFingerprint(workspace);
  return !fingerprintsMatch(current, latest.fingerprint);
}

export const LIVING_DELIVERABLE_KINDS: LivingDeliverableKind[] = [
  "business_blueprint",
  "company_playbook",
  "employee_handbook",
  "sop_library",
  "job_description_library",
  "training_academy",
  "ai_playbook",
  "improvement_roadmap",
];

export function buildLivingDeliverablesOverview(
  workspace: CompanyWorkspace,
): LivingDeliverableOverview[] {
  const state = workspace.livingDeliverables;
  return LIVING_DELIVERABLE_KINDS.map((kind) => {
    const latest = latestLivingDeliverable(state, kind);
    return {
      kind,
      latest,
      updateAvailable: isUpdateAvailable(workspace, latest),
      history: historyForKind(state, kind),
    };
  });
}
