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
  let name = "Calma empresarial";
  let confidence = 0.35;
  let rationale =
    "Tema empresarial claro por defecto hasta que existan lineamientos de marca o una preferencia explícita.";

  if (industry === "manufacturing" || industry === "construction") {
    aesthetic = {
      value: "Claridad operativa — alto contraste, decoración mínima",
      confidence: 0.52,
      reasoning: "Los contextos de manufactura/construcción favorecen la claridad sobre la expresividad.",
      evidence: ev,
    };
    name = "Campo y planta";
    confidence = 0.52;
    rationale = "Tema ajustado para usuarios de piso de producción y operativos — inferido de la industria.";
  } else if (industry === "healthcare") {
    aesthetic = {
      value: "Calma clínica — confiable, accesible, bajo ruido visual",
      confidence: 0.55,
      reasoning: "El patrón de la industria de salud favorece la confianza y la accesibilidad.",
      evidence: ev,
    };
    name = "Confianza clínica";
    confidence = 0.55;
  } else if (industry === "services") {
    aesthetic = {
      value: "Premium consultivo — fondos porcelana, tipografía serif, elevación suave",
      confidence: 0.48,
      reasoning: "Patrón de servicios profesionales alineado con el lenguaje porcelana de ISALWA.",
      evidence: ev,
    };
    name = "Premium consultivo";
    confidence = 0.48;
  } else {
    aesthetic = {
      value: null,
      confidence: 0,
      reasoning: "Estética desconocida — industria no clasificada y sin evidencia de marca.",
      evidence: [],
    };
    confidence = 0.2;
  }

  if (/dark mode|dark theme|night/i.test(factBlob)) {
    mode = "dark";
    confidence = Math.min(0.75, confidence + 0.25);
    rationale = "Se detectó preferencia por modo oscuro en el lenguaje del descubrimiento.";
  }

  const techMaturity =
    workspace.conversationMemory?.consulting?.maturity.dimensions.find(
      (d) => d.id === "technology",
    )?.score ?? null;

  if (techMaturity != null && techMaturity >= 0.75 && mode === "light") {
    rationale += " La madurez tecnológica sugiere que los usuarios podrían tolerar opciones de tema avanzadas más adelante.";
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
