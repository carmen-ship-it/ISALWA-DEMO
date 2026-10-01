import type {
  BlueprintEvidenceRef,
  CompanyModelEvidenceRef,
  PlanificacionEvidenceRef,
  PlanificacionGovernanceStatus,
  PlanificacionItemKind,
  PlanificacionSourceEngine,
  ProcessEvidenceRef,
  SolutionEvidenceRef,
} from "@/types";
import { READY_CONFIDENCE, THIN_CONFIDENCE } from "@/lib/readiness";
import { PLANIFICACION_DERIVATION_VERSION } from "../constants";

export function stableKeyFor(kind: string, seed: string): string {
  const normalized = seed
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80);
  return `${kind}:${normalized || "item"}`;
}

export function planificacionItemId(stableKey: string): string {
  const slug = stableKey.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 96);
  return `pitem_${slug}`;
}

export function planificacionQuestionId(stableKey: string): string {
  const slug = stableKey.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 96);
  return `pq_${slug}`;
}

export function governanceFromConfidence(
  confidence: number,
  kind: PlanificacionItemKind,
): PlanificacionGovernanceStatus {
  if (kind === "technical_requirement") return "propuesta";
  if (confidence >= READY_CONFIDENCE) return "propuesta";
  if (confidence >= THIN_CONFIDENCE) return "requiere_confirmacion";
  return kind === "information_gap" || kind === "client_decision"
    ? "requiere_confirmacion"
    : "requiere_confirmacion";
}

export function mapBlueprintEvidence(
  refs: BlueprintEvidenceRef[],
  engine: PlanificacionSourceEngine = "blueprint",
): PlanificacionEvidenceRef[] {
  return refs.slice(0, 4).map((ref) => ({
    sourceEngine: engine,
    sourceId: ref.id,
    quote: ref.label,
  }));
}

export function mapSolutionEvidence(
  refs: SolutionEvidenceRef[],
): PlanificacionEvidenceRef[] {
  return refs.slice(0, 4).map((ref) => ({
    sourceEngine: "solution",
    sourceId: ref.id,
    quote: ref.label,
  }));
}

export function mapProcessEvidence(
  refs: ProcessEvidenceRef[],
): PlanificacionEvidenceRef[] {
  return refs.slice(0, 4).map((ref) => ({
    sourceEngine: "processes",
    sourceId: ref.id,
    quote: ref.label,
  }));
}

export function mapCompanyModelEvidence(
  refs: CompanyModelEvidenceRef[],
): PlanificacionEvidenceRef[] {
  return refs.slice(0, 4).map((ref) => ({
    sourceEngine: "company_model",
    sourceId: ref.id,
    quote: ref.label,
  }));
}

export function quoteEvidence(
  sourceEngine: PlanificacionSourceEngine,
  quote: string,
  sourceId?: string,
  confidence?: number,
): PlanificacionEvidenceRef {
  return { sourceEngine, sourceId, quote, confidence };
}

export function itemDerivationMeta(derivedAt: string) {
  return {
    derivedAt,
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
  };
}

export function averageConfidence(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(
    (values.reduce((sum, n) => sum + n, 0) / values.length) * 100,
  ) / 100;
}

export function hasDiscoveryContent(workspace: {
  businessUnderstanding: number;
  blueprints: { length: number };
  recommendations: { length: number };
  solutionArchitecture: unknown | null;
  businessProcesses: unknown | null;
  companyModel: unknown | null;
}): boolean {
  return (
    workspace.businessUnderstanding > 0 ||
    workspace.blueprints.length > 0 ||
    workspace.recommendations.length > 0 ||
    workspace.solutionArchitecture !== null ||
    workspace.businessProcesses !== null ||
    workspace.companyModel !== null
  );
}
