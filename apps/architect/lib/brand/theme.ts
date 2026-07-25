import type {
  BrandEvidenceRef,
  BrandRecommendation,
  BusinessBlueprint,
  CompanyWorkspace,
  ThemeMode,
  ThemeRecommendation,
} from "@/types";
import { collectFactBlob, evidenceSubset } from "./evidence";

export function deriveThemeRecommendation(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): ThemeRecommendation {
  const factBlob = collectFactBlob(workspace);
  const industry = workspace.industry;
  const ev = evidenceSubset(evidence, ["industry", "blueprint", "consulting"], 4);

  let aesthetic: BrandRecommendation<string>;
  let mode: ThemeMode = "light";
  let name = "Enterprise Calm";
  let confidence = 0.35;
  let rationale =
    "Default light enterprise theme until brand guidelines or explicit preference exists.";

  if (industry === "manufacturing" || industry === "construction") {
    aesthetic = {
      value: "Operational clarity — high contrast, minimal decoration",
      confidence: 0.52,
      reasoning: "Manufacturing/construction contexts favor clarity over expressiveness.",
      evidence: ev,
    };
    name = "Field & Plant";
    confidence = 0.52;
    rationale = "Theme tuned for shop-floor and operational users — inferred from industry.";
  } else if (industry === "healthcare") {
    aesthetic = {
      value: "Clinical calm — trustworthy, accessible, low visual noise",
      confidence: 0.55,
      reasoning: "Healthcare industry pattern favors trust and accessibility.",
      evidence: ev,
    };
    name = "Clinical Trust";
    confidence = 0.55;
  } else if (industry === "services") {
    aesthetic = {
      value: "Premium consultative — porcelain backgrounds, serif display, soft elevation",
      confidence: 0.48,
      reasoning: "Professional services pattern aligned with ISALWA porcelain language.",
      evidence: ev,
    };
    name = "Consultative Premium";
    confidence = 0.48;
  } else {
    aesthetic = {
      value: null,
      confidence: 0,
      reasoning: "Aesthetic unknown — industry not classified and no brand evidence.",
      evidence: [],
    };
    confidence = 0.2;
  }

  if (/dark mode|dark theme|night/i.test(factBlob)) {
    mode = "dark";
    confidence = Math.min(0.75, confidence + 0.25);
    rationale = "Dark mode preference detected in discovery language.";
  }

  const techMaturity =
    workspace.conversationMemory?.consulting?.maturity.dimensions.find(
      (d) => d.id === "technology",
    )?.score ?? null;

  if (techMaturity != null && techMaturity >= 0.75 && mode === "light") {
    rationale += " Technology maturity suggests users may tolerate advanced theme options later.";
  }

  return {
    name,
    mode,
    aesthetic,
    rationale,
    confidence,
    evidence: ev,
  };
}
