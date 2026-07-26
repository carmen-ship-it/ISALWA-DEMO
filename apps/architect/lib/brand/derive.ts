import { departmentLabel } from "@/lib/presentation";
import { industryLabel } from "@/lib/reasoning/industry/detect";
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
    `Marca y experiencia derivadas del Blueprint v${blueprint.version} y ${evidence.length} referencias de evidencia.`,
    brandProfile.voiceTone.reasoning,
    themeRecommendation.rationale,
    `Navegación: ${navigation.map((n) => n.label).join(" · ") || "ninguna"}.`,
    overallConfidence < 0.4
      ? "La confianza general es baja — suba lineamientos de marca o complete el descubrimiento para obtener recomendaciones más sólidas."
      : "Las recomendaciones están informadas por la industria y la evidencia; los activos de marca del cliente aumentarán la confianza.",
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
    summary: `Marca y experiencia de ${workspace.companyName} — Blueprint v${blueprint.version}. ${terminology.entries.length} términos, ${navigation.length} patrones de navegación, ${Math.round(overallConfidence * 100)}% de confianza.`,
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
    workspace.industry !== "unknown" ? industryLabel(workspace.industry) : "industria sin clasificar";
  const deptLine =
    blueprint.departments.length > 0
      ? `Opera en ${blueprint.departments.map((d) => departmentLabel(d.name)).join(", ")}.`
      : "La estructura departamental todavía está tomando forma.";

  return [
    `Perfil de marca y experiencia de ${displayName} (${industry}).`,
    deptLine,
    `${navCount} recomendación(es) de navegación y ${termCount} mapeo(s) de terminología derivados de modelos canónicos.`,
    confidence >= 0.5
      ? "Evidencia suficiente para orientar el tema y la experiencia."
      : "Inferencia en etapa temprana — subir lineamientos de marca y logotipos mejorará considerablemente la precisión.",
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
    title: `Marca y experiencia · Blueprint v${model.blueprintVersion}`,
    description: model.summary,
    category: "brand",
  };
}
