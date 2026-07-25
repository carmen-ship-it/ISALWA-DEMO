import type {
  AccessibilityProfile,
  BrandEvidenceRef,
  BrandRecommendation,
  BusinessBlueprint,
  CompanyWorkspace,
  ContrastTarget,
  MotionPreference,
} from "@/types";
import { collectFactBlob, evidenceSubset } from "./evidence";

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

export function deriveAccessibilityProfile(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): AccessibilityProfile {
  const factBlob = collectFactBlob(workspace);
  const ev = evidenceSubset(evidence, ["industry", "blueprint", "consulting"], 3);
  const notes: string[] = [];

  let contrastTarget: BrandRecommendation<ContrastTarget> = recommendation(
    "AA",
    0.5,
    "WCAG AA assumed as enterprise baseline until brand colors are confirmed.",
    ev,
  );

  if (
    workspace.industry === "healthcare" ||
    /accessibility|a11y|ada|wcag/i.test(factBlob)
  ) {
    contrastTarget = recommendation(
      "AAA",
      0.62,
      "Healthcare or explicit accessibility language suggests stricter contrast target.",
      ev,
    );
    notes.push("Consider AAA contrast for critical health and safety workflows.");
  }

  let motionPreference: BrandRecommendation<MotionPreference> = recommendation(
    "standard",
    0.4,
    "Standard motion assumed — no reduce-motion preference captured.",
    ev,
  );

  if (/reduce motion|vestibular|motion sick/i.test(factBlob)) {
    motionPreference = recommendation(
      "reduce",
      0.7,
      "Reduce-motion preference detected in discovery.",
      ev,
    );
  }

  const shopFloor =
    workspace.industry === "manufacturing" ||
    workspace.industry === "construction" ||
    /shop floor|warehouse|field/i.test(factBlob);

  const fontScaleDefault = shopFloor
    ? recommendation<"standard" | "large" | "unknown">(
        "large",
        0.55,
        "Operational environments benefit from larger default type scale.",
        ev,
      )
    : recommendation<"standard" | "large" | "unknown">(
        "standard",
        0.45,
        "Standard font scale for office workflows.",
        ev,
      );

  const keyboardFirst = shopFloor
    ? recommendation(false, 0.5, "Touch-first environments de-prioritize keyboard-first.", ev)
    : recommendation(true, 0.48, "Office workflows should remain keyboard navigable.", ev);

  if (blueprint.workflows.some((w) => w.steps.some((s) => s.manual))) {
    notes.push("Manual workflow steps may need extra confirmation and error prevention.");
  }

  const scores = [
    contrastTarget.confidence,
    motionPreference.confidence,
    fontScaleDefault.confidence,
    keyboardFirst.confidence,
  ].filter((s) => s > 0);

  const overallConfidence =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
      : 0;

  return {
    contrastTarget,
    motionPreference,
    fontScaleDefault,
    keyboardFirst,
    notes,
    overallConfidence,
    evidence: ev,
  };
}
