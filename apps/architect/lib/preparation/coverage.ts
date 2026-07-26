/**
 * Preparation coverage — departments / topics the Architect already sees.
 * Deterministic from knowledge coverage + discovery dimensions + memory departments.
 */

import type {
  DiscoveryScore,
  KnowledgeCoverageSlice,
  KnowledgeCoverageArea,
} from "@/types";

export type PreparationTopicId =
  | KnowledgeCoverageArea
  | "Systems"
  | "Geography"
  | "Production"
  | "Team";

export interface PreparationCoverageSlice {
  topic: PreparationTopicId;
  /** 0–100 coverage for interview planning. */
  percent: number;
  status: "strong" | "partial" | "thin" | "missing";
  evidence: string[];
}

export interface PreparationCoverage {
  slices: PreparationCoverageSlice[];
  /** Topics below the attention threshold. */
  requiringAttention: PreparationTopicId[];
  /** Average across slices. */
  averagePercent: number;
}

const ATTENTION_THRESHOLD = 40;

function statusFor(percent: number): PreparationCoverageSlice["status"] {
  if (percent <= 0) return "missing";
  if (percent < ATTENTION_THRESHOLD) return "thin";
  if (percent < 70) return "partial";
  return "strong";
}

function knowledgePercent(
  coverage: KnowledgeCoverageSlice[],
  area: KnowledgeCoverageArea,
): { percent: number; note: string | null } {
  const slice = coverage.find((c) => c.area === area);
  if (!slice) return { percent: 0, note: null };
  return { percent: slice.percent, note: slice.note };
}

function dimensionPercent(
  score: DiscoveryScore | null,
  id: string,
): { percent: number; label: string | null } {
  const dim = score?.dimensions.find((d) => d.id === id);
  if (!dim || dim.applicable === false) {
    return { percent: 0, label: null };
  }
  return {
    percent: Math.round(dim.confidence * 100),
    label: dim.label,
  };
}

/**
 * Build department/topic coverage for preparation planning.
 */
export function derivePreparationCoverage(input: {
  knowledgeCoverage: KnowledgeCoverageSlice[];
  discoveryScore: DiscoveryScore | null;
  departments: string[];
}): PreparationCoverage {
  const slices: PreparationCoverageSlice[] = [];

  const knowledgeAreas: KnowledgeCoverageArea[] = [
    "Customers",
    "Sales",
    "Operations",
    "Finance",
    "HR",
  ];

  for (const area of knowledgeAreas) {
    const fromKnowledge = knowledgePercent(input.knowledgeCoverage, area);
    const dimId =
      area === "Customers"
        ? "customers"
        : area === "Sales"
          ? "sales"
          : area === "Operations"
            ? "operations"
            : area === "Finance"
              ? "finance"
              : "team";
    const fromDim = dimensionPercent(input.discoveryScore, dimId);
    const deptHit = input.departments.some((d) =>
      d.toLowerCase().includes(area.toLowerCase().slice(0, 4)),
    );

    const percent = Math.max(
      fromKnowledge.percent,
      fromDim.percent,
      deptHit ? 25 : 0,
    );
    const evidence: string[] = [];
    if (fromKnowledge.percent > 0 && fromKnowledge.note) {
      evidence.push(fromKnowledge.note);
    }
    if (fromDim.label && fromDim.percent > 0) {
      evidence.push(`Discovery: ${fromDim.label}`);
    }
    if (deptHit) {
      evidence.push("Named in company departments");
    }

    slices.push({
      topic: area,
      percent,
      status: statusFor(percent),
      evidence,
    });
  }

  const systems = dimensionPercent(input.discoveryScore, "systems");
  slices.push({
    topic: "Systems",
    percent: systems.percent,
    status: statusFor(systems.percent),
    evidence: systems.label ? [`Discovery: ${systems.label}`] : [],
  });

  const geography = dimensionPercent(input.discoveryScore, "geography");
  slices.push({
    topic: "Geography",
    percent: geography.percent,
    status: statusFor(geography.percent),
    evidence: geography.label ? [`Discovery: ${geography.label}`] : [],
  });

  const production = dimensionPercent(input.discoveryScore, "production");
  if (production.label !== null || production.percent > 0) {
    slices.push({
      topic: "Production",
      percent: production.percent,
      status: statusFor(production.percent),
      evidence: production.label ? [`Discovery: ${production.label}`] : [],
    });
  }

  const team = dimensionPercent(input.discoveryScore, "team");
  // Team may already be represented via HR; keep if discovery has signal.
  if (team.percent > 0) {
    const hr = slices.find((s) => s.topic === "HR");
    if (hr) {
      hr.percent = Math.max(hr.percent, team.percent);
      hr.status = statusFor(hr.percent);
      if (team.label) hr.evidence.push(`Discovery: ${team.label}`);
    }
  }

  const averagePercent =
    slices.length === 0
      ? 0
      : Math.round(
          slices.reduce((sum, s) => sum + s.percent, 0) / slices.length,
        );

  const requiringAttention = slices
    .filter((s) => s.percent < ATTENTION_THRESHOLD)
    .map((s) => s.topic);

  return {
    slices,
    requiringAttention,
    averagePercent,
  };
}
