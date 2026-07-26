/**
 * Interactive Business Builder — timeline estimate (Mission 16).
 * Phases derived from plan order (not solution roadmap rewrite).
 */

import { PRIORITY_WEIGHT, type BuilderPlan, type BuilderModulePriority } from "./modules";

export interface TimelinePhaseEstimate {
  phase: number;
  name: string;
  moduleIds: string[];
  moduleKeys: string[];
  estimatedWeeks: { low: number; high: number };
  dependsOnPhases: number[];
}

export interface BuilderTimelineEstimate {
  phases: TimelinePhaseEstimate[];
  totalWeeks: { low: number; high: number };
  /** Human-readable band for executive summaries. */
  band: string;
  rationale: string[];
}

const PHASE_NAMES = [
  "Foundation",
  "Core value",
  "Operations expansion",
  "Automation & insight",
  "Strategic extensions",
] as const;

const WEEKS_BY_PRIORITY: Record<BuilderModulePriority, { low: number; high: number }> = {
  must: { low: 4, high: 8 },
  should: { low: 3, high: 6 },
  could: { low: 2, high: 4 },
  later: { low: 1, high: 3 },
};

function phaseName(index: number): string {
  return PHASE_NAMES[Math.min(index, PHASE_NAMES.length - 1)];
}

function bandLabel(totalHigh: number): string {
  if (totalHigh <= 0) return "n/a";
  if (totalHigh <= 8) return "4–8 weeks";
  if (totalHigh <= 16) return "2–4 months";
  if (totalHigh <= 24) return "4–6 months";
  if (totalHigh <= 48) return "6–12 months";
  return "12+ months";
}

/**
 * Estimate timeline phases from plan order (chunks of up to 3 modules).
 * Pure + deterministic for a given plan.
 */
export function estimateTimeline(plan: BuilderPlan): BuilderTimelineEstimate {
  const ordered = plan.modules
    .slice()
    .sort((a, b) => a.order - b.order || a.moduleKey.localeCompare(b.moduleKey));

  if (ordered.length === 0) {
    return {
      phases: [],
      totalWeeks: { low: 0, high: 0 },
      band: "n/a",
      rationale: ["Empty plan — add modules before estimating timeline."],
    };
  }

  const chunkSize = 3;
  const phases: TimelinePhaseEstimate[] = [];

  for (let i = 0; i < ordered.length; i += chunkSize) {
    const chunk = ordered.slice(i, i + chunkSize);
    const phaseIndex = phases.length;
    const weeks = chunk.reduce(
      (acc, m) => {
        const w = WEEKS_BY_PRIORITY[m.priority];
        return { low: acc.low + w.low, high: acc.high + w.high };
      },
      { low: 0, high: 0 },
    );

    // Parallelism discount within a phase (never below the heaviest module).
    const heaviest = chunk.reduce(
      (max, m) => {
        const w = WEEKS_BY_PRIORITY[m.priority];
        return {
          low: Math.max(max.low, w.low),
          high: Math.max(max.high, w.high),
        };
      },
      { low: 0, high: 0 },
    );
    const parallelFactor = chunk.length > 1 ? 0.7 : 1;
    const estimatedWeeks = {
      low: Math.max(heaviest.low, Math.round(weeks.low * parallelFactor)),
      high: Math.max(heaviest.high, Math.round(weeks.high * parallelFactor)),
    };

    phases.push({
      phase: phaseIndex + 1,
      name: phaseName(phaseIndex),
      moduleIds: chunk.map((m) => m.id),
      moduleKeys: chunk.map((m) => m.moduleKey),
      estimatedWeeks,
      dependsOnPhases: phaseIndex === 0 ? [] : [phaseIndex],
    });
  }

  const totalWeeks = phases.reduce(
    (acc, p) => ({
      low: acc.low + p.estimatedWeeks.low,
      high: acc.high + p.estimatedWeeks.high,
    }),
    { low: 0, high: 0 },
  );

  const weight = ordered.reduce((s, m) => s + PRIORITY_WEIGHT[m.priority], 0);

  return {
    phases,
    totalWeeks,
    band: bandLabel(totalWeeks.high),
    rationale: [
      `${phases.length} phase${phases.length === 1 ? "" : "s"} from plan order (chunks of ${chunkSize}).`,
      `Priority weight ${weight} across ${ordered.length} modules.`,
      "Estimates are planning bands — not delivery commitments.",
    ],
  };
}
