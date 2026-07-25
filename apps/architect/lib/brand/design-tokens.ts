import { createId } from "@/lib/utils";
import type {
  BrandEvidenceRef,
  BrandRecommendation,
  BusinessBlueprint,
  ColorToken,
  CompanyWorkspace,
  DesignTokens,
  TypographyToken,
} from "@/types";
import { collectFactBlob, evidenceSubset } from "./evidence";

/** Industry palette hints — low confidence until brand guidelines exist. */
const INDUSTRY_PALETTES: Record<
  string,
  Array<{ role: ColorToken["role"]; name: string; hex: string }>
> = {
  manufacturing: [
    { role: "primary", name: "Steel Blue", hex: "#334155" },
    { role: "accent", name: "Safety Amber", hex: "#D97706" },
    { role: "background", name: "Porcelain", hex: "#FAFAF9" },
    { role: "surface", name: "White", hex: "#FFFFFF" },
    { role: "text", name: "Slate 900", hex: "#0F172A" },
  ],
  healthcare: [
    { role: "primary", name: "Trust Blue", hex: "#1E40AF" },
    { role: "accent", name: "Calm Teal", hex: "#0D9488" },
    { role: "background", name: "Clinical White", hex: "#F8FAFC" },
    { role: "text", name: "Slate 800", hex: "#1E293B" },
  ],
  services: [
    { role: "primary", name: "Charcoal", hex: "#27272A" },
    { role: "accent", name: "Glaze Violet", hex: "#7C3AED" },
    { role: "background", name: "Porcelain", hex: "#FAFAF9" },
    { role: "text", name: "Neutral 950", hex: "#0A0A0A" },
  ],
  distribution: [
    { role: "primary", name: "Logistics Navy", hex: "#1E3A5F" },
    { role: "accent", name: "Route Orange", hex: "#EA580C" },
    { role: "background", name: "Off White", hex: "#F5F5F4" },
  ],
  retail: [
    { role: "primary", name: "Retail Black", hex: "#171717" },
    { role: "accent", name: "Warm Coral", hex: "#F97316" },
    { role: "background", name: "Warm White", hex: "#FFFBEB" },
  ],
};

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

export function deriveDesignTokens(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): DesignTokens {
  const industry = workspace.industry;
  const palette = INDUSTRY_PALETTES[industry];
  const factBlob = collectFactBlob(workspace);
  const hasBrandLanguage = /brand|color|logo|visual|design/i.test(factBlob);

  const baseConfidence = palette
    ? hasBrandLanguage
      ? 0.55
      : 0.38
    : 0;

  const industryEvidence = evidenceSubset(evidence, ["industry", "knowledge", "meeting"], 3);

  const colors: ColorToken[] = palette
    ? palette.map((swatch) => ({
        name: swatch.name,
        hex: swatch.hex,
        role: swatch.role,
        confidence: baseConfidence,
        reasoning: hasBrandLanguage
          ? `Industry default ${swatch.role} with weak brand-language signals — not client-specified.`
          : `Industry-inferred ${swatch.role} only. No primary color stated by client.`,
        evidence: industryEvidence,
      }))
    : [
        {
          name: "Unknown Primary",
          hex: null,
          role: "primary" as const,
          confidence: 0,
          reasoning: "Primary color unknown — industry unclassified and no brand guidelines.",
          evidence: [],
        },
      ];

  const typography: TypographyToken[] = deriveTypography(workspace, evidence);
  const spacing = deriveSpacing(workspace, blueprint, evidence);

  const borderRadius = workspace.industry === "manufacturing"
    ? recommendation("8px", 0.42, "Operational UIs often use moderate radius for clarity.", industryEvidence)
    : recommendation("12px", 0.4, "Professional services default to softer enterprise radius.", industryEvidence);

  const elevation = recommendation(
    "Subtle — 1–2px borders, soft shadows on cards only",
    0.45,
    "ISALWA porcelain enterprise pattern inferred from product maturity stage.",
    evidenceSubset(evidence, ["memory"], 1),
  );

  return {
    colors,
    typography,
    spacing,
    borderRadius,
    elevation,
  };
}

function deriveTypography(
  workspace: CompanyWorkspace,
  evidence: BrandEvidenceRef[],
): TypographyToken[] {
  const ev = evidenceSubset(evidence, ["industry", "memory"], 2);
  return [
    {
      role: "display",
      family: "Newsreader",
      weight: "400 italic",
      confidence: 0.35,
      reasoning: "Display serif inferred from ISALWA design language — override when brand guidelines exist.",
      evidence: ev,
    },
    {
      role: "heading",
      family: "System UI",
      weight: "600",
      confidence: 0.4,
      reasoning: "Headings use system sans until custom brand fonts uploaded.",
      evidence: ev,
    },
    {
      role: "body",
      family: "System UI",
      weight: "400",
      confidence: 0.45,
      reasoning: "Body text defaults to accessible system stack.",
      evidence: ev,
    },
    {
      role: "mono",
      family: "UI Monospace",
      weight: "400",
      confidence: 0.3,
      reasoning: "Monospace for metrics and IDs only.",
      evidence: ev,
    },
    {
      role: "label",
      family: "System UI",
      weight: "500",
      confidence: 0.4,
      reasoning: "Uppercase kickers at 11px tracking — ISALWA rhythm.",
      evidence: ev,
    },
  ];
}

function deriveSpacing(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
) {
  return {
    baseUnit: blueprint.departments.length > 0 ? 8 : null,
    confidence: blueprint.departments.length > 0 ? 0.5 : 0,
    reasoning: blueprint.departments.length > 0
      ? "8px rhythm inferred from enterprise OS blueprint structure."
      : "Spacing rhythm unknown until blueprint departments exist.",
    evidence: evidenceSubset(evidence, ["blueprint"], 2),
  };
}

export function designTokenId(): string {
  return createId("token");
}
