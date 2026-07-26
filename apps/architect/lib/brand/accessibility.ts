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
    "Se asume WCAG AA como referencia empresarial hasta confirmar los colores de marca.",
    ev,
  );

  if (
    workspace.industry === "healthcare" ||
    /accessibility|a11y|ada|wcag/i.test(factBlob)
  ) {
    contrastTarget = recommendation(
      "AAA",
      0.62,
      "El sector salud o un lenguaje explícito de accesibilidad sugiere un objetivo de contraste más estricto.",
      ev,
    );
    notes.push("Considerar contraste AAA para flujos críticos de salud y seguridad.");
  }

  let motionPreference: BrandRecommendation<MotionPreference> = recommendation(
    "standard",
    0.4,
    "Se asume movimiento estándar — no se detectó preferencia de movimiento reducido.",
    ev,
  );

  if (/reduce motion|vestibular|motion sick/i.test(factBlob)) {
    motionPreference = recommendation(
      "reduce",
      0.7,
      "Se detectó preferencia de movimiento reducido en el descubrimiento.",
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
        "Los entornos operativos se benefician de una escala de tipografía más grande por defecto.",
        ev,
      )
    : recommendation<"standard" | "large" | "unknown">(
        "standard",
        0.45,
        "Escala de fuente estándar para flujos de oficina.",
        ev,
      );

  const keyboardFirst = shopFloor
    ? recommendation(false, 0.5, "Los entornos táctiles restan prioridad a la navegación por teclado.", ev)
    : recommendation(true, 0.48, "Los flujos de oficina deben mantenerse navegables por teclado.", ev);

  if (blueprint.workflows.some((w) => w.steps.some((s) => s.manual))) {
    notes.push("Los pasos manuales del flujo pueden requerir confirmación adicional y prevención de errores.");
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
