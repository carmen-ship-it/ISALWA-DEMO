/**
 * Deterministic confidence scoring for explained recommendations.
 * Combines consulting meta-confidence, related entity confidence, and evidence density.
 */

import type {
  CompanyWorkspace,
  ConsultingOpportunity,
  ConsultingRisk,
} from "@/types";
import type { ConfidenceBand, ExplanationConfidence } from "./types";

export function buildExplanationConfidence(opts: {
  workspace: CompanyWorkspace;
  evidenceCount: number;
  relatedRisks?: ConsultingRisk[];
  relatedOpportunities?: ConsultingOpportunity[];
  moduleConfidence?: number;
  explicitScore?: number;
}): ExplanationConfidence {
  const consulting = opts.workspace.conversationMemory?.consulting;
  const base =
    opts.explicitScore ??
    consulting?.confidence.overall ??
    opts.workspace.businessUnderstanding / 100;

  const riskConf = average(
    (opts.relatedRisks ?? []).map((r) => r.confidence),
  );
  const oppConf = average(
    (opts.relatedOpportunities ?? []).map((o) => o.confidence),
  );
  const moduleConf = opts.moduleConfidence;

  const parts = [clamp01(base)];
  if (riskConf != null) parts.push(clamp01(riskConf));
  if (oppConf != null) parts.push(clamp01(oppConf));
  if (moduleConf != null) parts.push(clamp01(moduleConf));

  let score = average(parts) ?? 0.35;

  if (opts.evidenceCount >= 5) score = Math.min(1, score + 0.06);
  else if (opts.evidenceCount >= 3) score = Math.min(1, score + 0.03);
  else if (opts.evidenceCount <= 1) score = Math.max(0, score - 0.08);

  score = Math.round(score * 100) / 100;
  const band = confidenceBand(score);

  const factors: string[] = [];
  if (consulting?.confidence.overall != null) {
    factors.push(
      `Confianza consultora general: ${Math.round(consulting.confidence.overall * 100)}%`,
    );
  }
  if (riskConf != null) {
    factors.push(
      `Confianza del riesgo vinculado: ${Math.round(riskConf * 100)}%`,
    );
  }
  if (oppConf != null) {
    factors.push(
      `Confianza de la oportunidad vinculada: ${Math.round(oppConf * 100)}%`,
    );
  }
  if (moduleConf != null) {
    factors.push(
      `Confianza de la capacidad: ${Math.round(moduleConf * 100)}%`,
    );
  }
  factors.push(
    opts.evidenceCount > 0
      ? `${opts.evidenceCount} pieza(s) de evidencia en el expediente`
      : "Evidencia aún limitada — validar en la próxima sesión",
  );
  if (consulting?.confidence.evidenceDensity != null) {
    factors.push(
      `Densidad de evidencia: ${Math.round(consulting.confidence.evidenceDensity * 100)}%`,
    );
  }

  return {
    score,
    band,
    summary: confidenceSummaryEs(band, score),
    factors: factors.slice(0, 5),
  };
}

export function confidenceBand(score: number): ConfidenceBand {
  const pct = clamp01(score) * 100;
  if (pct >= 75) return "alta";
  if (pct >= 45) return "media";
  if (pct >= 20) return "baja";
  return "emergente";
}

export function confidenceBandLabelEs(band: ConfidenceBand): string {
  switch (band) {
    case "alta":
      return "Alta";
    case "media":
      return "Media";
    case "baja":
      return "Baja";
    default:
      return "Emergente";
  }
}

export function confidenceSummaryEs(
  band: ConfidenceBand,
  score: number,
): string {
  const pct = Math.round(clamp01(score) * 100);
  switch (band) {
    case "alta":
      return `Confianza alta (${pct}%). La evidencia del discovery respalda con firmeza esta recomendación.`;
    case "media":
      return `Confianza media (${pct}%). El patrón es claro; conviene validar supuestos residuales.`;
    case "baja":
      return `Confianza baja (${pct}%). Hay señales útiles, pero aún falta densidad de evidencia.`;
    default:
      return `Confianza emergente (${pct}%). Tratar como hipótesis de trabajo hasta completar discovery.`;
  }
}

function clamp01(n: number): number {
  const unit = n > 1.0001 ? n / 100 : n;
  return Math.max(0, Math.min(1, unit));
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
