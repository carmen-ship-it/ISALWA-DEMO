/**
 * Consulting Intelligence Agent — the scheduled (overnight) review
 * (Mission 24 — Autonomous Consulting Cycle).
 *
 * Extends `runConsultingIntelligenceCycle` — it does not invent a second
 * agent. Today the cycle only runs when evidence lands (an interview answer
 * or a processed document, `lib/memory/apply-interview.ts` /
 * `lib/intake/pipeline.ts`). This module adds the third, honest trigger the
 * roadmap asks for: a schedule, so a workspace with no new evidence this
 * week still gets re-read instead of only ever updating on demand.
 *
 * No fake overnight insight is possible by construction: the cycle is a pure
 * function of the current workspace, so re-running it with nothing new to
 * read reproduces the same numbers, and `buildOvernightDigest` says so
 * honestly instead of inventing a change.
 */

import { createId } from "@/lib/utils";
import type { CompanyWorkspace, TimelineEvent } from "@/types";
import { runConsultingIntelligenceCycle } from "./cycle";
import { buildOvernightDigest, type OvernightDigest } from "./overnight-digest";

/**
 * How long a workspace can go without a review before the schedule decides
 * it is due again — matches the roadmap's "nightly" cadence with headroom
 * for a cron that (per Vercel's own Hobby-plan behaviour) may run once a day
 * at a time that drifts by up to an hour.
 */
export const OVERNIGHT_REVIEW_INTERVAL_MS = 20 * 60 * 60 * 1000;

/**
 * Whether a workspace is due for a scheduled review right now.
 *
 * Honest by construction: a workspace that has never run a cycle is due (it
 * has never been reviewed); one whose last cycle is recent is not — running
 * again immediately would not change anything and would only inflate the
 * cycle counter for no reason.
 */
export function isOvernightReviewDue(
  workspace: CompanyWorkspace,
  now: Date = new Date(),
): boolean {
  if (workspace.status !== "active") return false;
  const lastCycleAt = workspace.consultingIntelligence?.updatedAt;
  if (!lastCycleAt) return true;
  const last = new Date(lastCycleAt).getTime();
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= OVERNIGHT_REVIEW_INTERVAL_MS;
}

export interface OvernightReviewOutcome {
  workspace: CompanyWorkspace;
  /** False when the workspace was not due — `workspace` is returned unchanged. */
  ran: boolean;
  digest: OvernightDigest | null;
}

/**
 * Run one scheduled review for a workspace, when due.
 *
 * Mirrors the two existing call sites (`apply-interview.ts`,
 * `lib/intake/pipeline.ts`): the cycle is run, its result is folded into the
 * workspace, and the caller owns persistence — this function never writes to
 * a store itself.
 */
export function runOvernightReview(
  workspace: CompanyWorkspace,
  now: Date = new Date(),
): OvernightReviewOutcome {
  if (!isOvernightReviewDue(workspace, now)) {
    return { workspace, ran: false, digest: null };
  }

  const at = now.toISOString();
  const cycle = runConsultingIntelligenceCycle(workspace, {
    kind: "scheduled_review",
    label: "Revisión nocturna programada",
    at,
  });

  const digest = buildOvernightDigest(cycle, workspace.companyName, at);

  const timelineEvent: TimelineEvent | null = digest.changed
    ? {
        id: createId("timeline"),
        workspaceId: workspace.id,
        date: at,
        title: "Revisión nocturna · novedades reales",
        description: digest.headline,
        category: "overnight_review",
      }
    : null;

  const nextWorkspace: CompanyWorkspace = {
    ...cycle.workspace,
    lastOvernightReview: digest,
    timeline: timelineEvent ? [timelineEvent, ...cycle.workspace.timeline] : cycle.workspace.timeline,
  };

  return { workspace: nextWorkspace, ran: true, digest };
}
