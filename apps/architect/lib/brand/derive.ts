import { createId } from "@/lib/utils";
import type {
  BrandExperienceModel,
  BusinessBlueprint,
  CompanyWorkspace,
} from "@/types";
import { deriveAccessibilityProfile } from "./accessibility";
import { deriveBrandProfile } from "./brand-profile";
import { deriveDesignTokens } from "./design-tokens";
import { collectBrandEvidence } from "./evidence";
import { deriveExperienceProfile } from "./experience-profile";
import { deriveNavigationPreferences } from "./navigation";
import { deriveTerminology } from "./terminology";
import { deriveThemeRecommendation } from "./theme";
import { deriveWhiteLabelConfig } from "./white-label";

/**
 * Derive Brand & Experience Studio model from Business Blueprint + workspace evidence.
 * Deterministic. Never invents without evidence. No LLM.
 */
export function deriveBrandExperience(input: {
  workspace: CompanyWorkspace;
  blueprint: BusinessBlueprint;
}): BrandExperienceModel {
  const { workspace, blueprint } = input;
  const stamp = new Date().toISOString();
  const evidence = collectBrandEvidence(workspace, blueprint);

  const brandProfile = deriveBrandProfile(workspace, blueprint, evidence);
  const experienceProfile = deriveExperienceProfile(workspace, blueprint, evidence);
  const designTokens = deriveDesignTokens(workspace, blueprint, evidence);
  const themeRecommendation = deriveThemeRecommendation(workspace, blueprint, evidence);
  const terminology = deriveTerminology(workspace, blueprint, evidence);
  const navigation = deriveNavigationPreferences(
    workspace,
    blueprint,
    workspace.solutionArchitecture,
    evidence,
  );
  const accessibility = deriveAccessibilityProfile(workspace, blueprint, evidence);
  const whiteLabel = deriveWhiteLabelConfig(workspace, evidence);

  const confidenceSamples = [
    brandProfile.voiceTone.confidence,
    themeRecommendation.confidence,
    accessibility.overallConfidence,
    navigation[0]?.confidence ?? 0,
    designTokens.colors[0]?.confidence ?? 0,
    experienceProfile.employeeExperienceVision.confidence,
  ].filter((c) => c > 0);

  const overallConfidence =
    confidenceSamples.length === 0
      ? 0
      : Math.round(
          (confidenceSamples.reduce((a, b) => a + b, 0) / confidenceSamples.length) *
            100,
        ) / 100;

  const reasoning: string[] = [
    `Brand experience derived from Blueprint v${blueprint.version} and ${evidence.length} evidence refs.`,
    brandProfile.voiceTone.reasoning,
    themeRecommendation.rationale,
    `Navigation: ${navigation.map((n) => n.label).join(" · ") || "none"}.`,
    overallConfidence < 0.4
      ? "Overall confidence is low — upload brand guidelines or complete discovery for stronger recommendations."
      : "Recommendations are industry- and evidence-informed; client brand assets will increase confidence.",
  ];

  const executiveSummary = buildExecutiveSummary(
    workspace,
    blueprint,
    brandProfile.companyDisplayName,
    overallConfidence,
    navigation.length,
    terminology.entries.length,
  );

  return {
    id: createId("brand"),
    workspaceId: workspace.id,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    generatedAt: stamp,
    summary: `Brand & Experience for ${workspace.companyName} — Blueprint v${blueprint.version}. ${terminology.entries.length} terminology entries, ${navigation.length} navigation patterns, ${Math.round(overallConfidence * 100)}% confidence.`,
    executiveSummary,
    brandProfile,
    experienceProfile,
    designTokens,
    themeRecommendation,
    terminology,
    navigation,
    accessibility,
    whiteLabel,
    overallConfidence,
    evidence,
    reasoning,
  };
}

function buildExecutiveSummary(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  displayName: string,
  confidence: number,
  navCount: number,
  termCount: number,
): string {
  const industry =
    workspace.industry !== "unknown" ? workspace.industry : "unclassified industry";
  const deptLine =
    blueprint.departments.length > 0
      ? `Operating across ${blueprint.departments.map((d) => d.name).join(", ")}.`
      : "Department structure still emerging.";

  return [
    `${displayName} brand and experience profile (${industry}).`,
    deptLine,
    `${navCount} navigation recommendation(s) and ${termCount} terminology mapping(s) derived from canonical models.`,
    confidence >= 0.5
      ? "Sufficient evidence for directional theme and experience guidance."
      : "Early-stage inference — brand guidelines and logo uploads will materially improve accuracy.",
  ].join(" ");
}

export function brandExperienceTimelineEvent(
  model: BrandExperienceModel,
): {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  description: string;
  category: "brand";
} {
  return {
    id: createId("timeline"),
    workspaceId: model.workspaceId,
    date: model.generatedAt,
    title: `Brand & Experience · Blueprint v${model.blueprintVersion}`,
    description: model.summary,
    category: "brand",
  };
}
