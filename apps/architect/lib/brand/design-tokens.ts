import { colorTokenRoleLabel } from "@/lib/presentation";
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
          ? `${colorTokenRoleLabel(swatch.role)} por defecto de la industria con señales débiles de lenguaje de marca — no especificado por el cliente.`
          : `${colorTokenRoleLabel(swatch.role)} inferido solo por industria. El cliente no indicó un color primario.`,
        evidence: industryEvidence,
      }))
    : [
        {
          name: "Primario sin definir",
          hex: null,
          role: "primary" as const,
          confidence: 0,
          reasoning: "Color primario desconocido — industria sin clasificar y sin lineamientos de marca.",
          evidence: [],
        },
      ];

  const typography: TypographyToken[] = deriveTypography(workspace, evidence);
  const spacing = deriveSpacing(workspace, blueprint, evidence);

  const borderRadius = workspace.industry === "manufacturing"
    ? recommendation("8px", 0.42, "Las interfaces operativas suelen usar un radio moderado para mayor claridad.", industryEvidence)
    : recommendation("12px", 0.4, "Los servicios profesionales por defecto usan un radio empresarial más suave.", industryEvidence);

  const elevation = recommendation(
    "Sutil — bordes de 1–2px, sombras suaves solo en tarjetas",
    0.45,
    "Patrón empresarial porcelana de ISALWA inferido según la etapa de madurez del producto.",
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
      reasoning: "Serif de display inferida del lenguaje de diseño de ISALWA — se anula cuando existan lineamientos de marca.",
      evidence: ev,
    },
    {
      role: "heading",
      family: "System UI",
      weight: "600",
      confidence: 0.4,
      reasoning: "Los encabezados usan la fuente sans del sistema hasta que se suban fuentes de marca personalizadas.",
      evidence: ev,
    },
    {
      role: "body",
      family: "System UI",
      weight: "400",
      confidence: 0.45,
      reasoning: "El cuerpo de texto usa por defecto la pila de fuentes accesible del sistema.",
      evidence: ev,
    },
    {
      role: "mono",
      family: "UI Monospace",
      weight: "400",
      confidence: 0.3,
      reasoning: "Monoespaciada solo para métricas e identificadores.",
      evidence: ev,
    },
    {
      role: "label",
      family: "System UI",
      weight: "500",
      confidence: 0.4,
      reasoning: "Kickers en mayúsculas con tracking de 11px — ritmo de ISALWA.",
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
      ? "Ritmo de 8px inferido de la estructura del blueprint del sistema operativo empresarial."
      : "El ritmo de espaciado se desconoce hasta que existan departamentos en el blueprint.",
    evidence: evidenceSubset(evidence, ["blueprint"], 2),
  };
}

export function designTokenId(): string {
  return createId("token");
}
