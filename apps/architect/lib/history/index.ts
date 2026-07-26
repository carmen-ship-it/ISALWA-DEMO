export {
  captureWorkspaceSnapshot,
  hashContent,
  snapshotsEqualByHash,
  stableSerialize,
} from "./snapshots";

export {
  compareSnapshots,
  findSnapshot,
} from "./comparison";

export { deriveMilestones } from "./milestones";

export {
  buildTimelineFromMilestones,
  milestoneToTimelineEntry,
  snapshotTimelineEntry,
  sortEvolutionTimeline,
  visitTimelineEntry,
} from "./timeline";

export {
  compareHistorySnapshots,
  emptyEvolutionHistory,
  ensureCompanyEvolution,
  ensureEvolutionHistory,
  evolveCompanyHistory,
  getSinceLastVisitComparison,
  type EvolveResult,
} from "./company-evolution";
