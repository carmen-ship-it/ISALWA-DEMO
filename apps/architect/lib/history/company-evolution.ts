/**
 * Evolve company history on visit/load — append-only.
 * Never overwrites prior snapshots, milestones, or timeline entries.
 */

import { nowIso } from "@/lib/utils";
import {
  captureWorkspaceSnapshot,
  snapshotsEqualByHash,
} from "@/lib/history/snapshots";
import { compareSnapshots, findSnapshot } from "@/lib/history/comparison";
import { deriveMilestones } from "@/lib/history/milestones";
import {
  buildTimelineFromMilestones,
  snapshotTimelineEntry,
  sortEvolutionTimeline,
  visitTimelineEntry,
} from "@/lib/history/timeline";
import type {
  CompanyEvolutionHistory,
  CompanySnapshot,
  SnapshotComparison,
} from "@/types/history";
import type {
  CompanyWorkspace,
} from "@/types";

export function emptyEvolutionHistory(): CompanyEvolutionHistory {
  return {
    version: 1,
    snapshots: [],
    milestones: [],
    timeline: [],
    lastVisitAt: null,
    previousVisitSnapshotId: null,
    lastVisitSnapshotId: null,
  };
}

export function ensureEvolutionHistory(
  history: CompanyEvolutionHistory | null | undefined,
): CompanyEvolutionHistory {
  if (!history || history.version !== 1) {
    return emptyEvolutionHistory();
  }
  return {
    version: 1,
    snapshots: Array.isArray(history.snapshots) ? history.snapshots : [],
    milestones: Array.isArray(history.milestones) ? history.milestones : [],
    timeline: Array.isArray(history.timeline) ? history.timeline : [],
    lastVisitAt: history.lastVisitAt ?? null,
    previousVisitSnapshotId: history.previousVisitSnapshotId ?? null,
    lastVisitSnapshotId: history.lastVisitSnapshotId ?? null,
  };
}

export interface EvolveResult {
  workspace: CompanyWorkspace;
  history: CompanyEvolutionHistory;
  appendedSnapshot: boolean;
  latestSnapshot: CompanySnapshot | null;
  comparisonSinceLastVisit: SnapshotComparison | null;
}

/**
 * Record a visit: append a snapshot when material state changed.
 * Prior snapshots are preserved forever.
 */
export function evolveCompanyHistory(
  workspace: CompanyWorkspace,
  options?: { visitedAt?: string },
): EvolveResult {
  const visitedAt = options?.visitedAt ?? nowIso();
  const prior = ensureEvolutionHistory(workspace.evolutionHistory);
  const previousLatest = prior.snapshots[prior.snapshots.length - 1] ?? null;
  const previousVisitSnapshotId = prior.lastVisitSnapshotId;

  const candidate = captureWorkspaceSnapshot(workspace, visitedAt);
  const materialChange =
    !previousLatest || !snapshotsEqualByHash(previousLatest, candidate);

  let snapshots = prior.snapshots;
  let milestones = prior.milestones;
  let timeline = prior.timeline;
  let latestSnapshot = previousLatest;
  let appendedSnapshot = false;

  if (materialChange) {
    snapshots = [...prior.snapshots, candidate];
    latestSnapshot = candidate;
    appendedSnapshot = true;

    const newMilestones = deriveMilestones(previousLatest, candidate);
    milestones = [...prior.milestones, ...newMilestones];

    const newTimeline = [
      snapshotTimelineEntry(candidate, !previousLatest),
      ...buildTimelineFromMilestones(newMilestones),
    ];
    timeline = sortEvolutionTimeline([...newTimeline, ...prior.timeline]);
  } else if (latestSnapshot) {
    const lastVisit = prior.lastVisitAt;
    const shouldNoteVisit =
      !lastVisit ||
      Date.parse(visitedAt) - Date.parse(lastVisit) > 1000 * 60 * 30;
    if (shouldNoteVisit) {
      timeline = sortEvolutionTimeline([
        visitTimelineEntry(visitedAt, latestSnapshot.id),
        ...prior.timeline,
      ]);
    }
  }

  const history: CompanyEvolutionHistory = {
    version: 1,
    snapshots,
    milestones,
    timeline,
    lastVisitAt: visitedAt,
    previousVisitSnapshotId,
    lastVisitSnapshotId: latestSnapshot?.id ?? null,
  };

  const comparisonSinceLastVisit =
    latestSnapshot != null
      ? compareSnapshots(
          findSnapshot(snapshots, previousVisitSnapshotId),
          latestSnapshot,
        )
      : null;

  return {
    workspace: {
      ...workspace,
      evolutionHistory: history,
    },
    history,
    appendedSnapshot,
    latestSnapshot,
    comparisonSinceLastVisit,
  };
}

/**
 * Ensure history exists; capture baseline snapshot if empty.
 * Safe for migrate/seed — append-only.
 */
export function ensureCompanyEvolution(
  workspace: CompanyWorkspace,
): CompanyWorkspace {
  const prior = ensureEvolutionHistory(workspace.evolutionHistory);
  if (prior.snapshots.length > 0) {
    return {
      ...workspace,
      evolutionHistory: prior,
    };
  }

  const { workspace: next } = evolveCompanyHistory(workspace);
  return next;
}

export function compareHistorySnapshots(
  history: CompanyEvolutionHistory,
  fromId?: string | null,
  toId?: string | null,
): SnapshotComparison | null {
  const ensured = ensureEvolutionHistory(history);
  const to =
    findSnapshot(ensured.snapshots, toId) ??
    ensured.snapshots[ensured.snapshots.length - 1] ??
    null;
  if (!to) return null;

  const from =
    findSnapshot(ensured.snapshots, fromId) ??
    (ensured.snapshots.length >= 2
      ? ensured.snapshots[ensured.snapshots.length - 2]
      : null);

  return compareSnapshots(from, to);
}

export function getSinceLastVisitComparison(
  history: CompanyEvolutionHistory | null | undefined,
): SnapshotComparison | null {
  const ensured = ensureEvolutionHistory(history);
  const latest = ensured.snapshots[ensured.snapshots.length - 1] ?? null;
  if (!latest) return null;

  const from = findSnapshot(ensured.snapshots, ensured.previousVisitSnapshotId);
  return compareSnapshots(from, latest);
}
