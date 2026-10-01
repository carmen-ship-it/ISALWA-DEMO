import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { THIN_CONFIDENCE } from "@/lib/readiness";
import { nowIso } from "@/lib/utils";
import {
  PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
} from "../constants";
import {
  governanceFromConfidence,
  hasDiscoveryContent,
  itemDerivationMeta,
  mapBlueprintEvidence,
  mapCompanyModelEvidence,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

export function deriveUnderstandingSummary(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];

  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;

  if (!hasDiscoveryContent(workspace)) {
    const stableKey = stableKeyFor(
      "understanding",
      "descubrimiento-en-curso",
    );
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
      body:
        "Architect aún no tiene suficiente evidencia para proponer un modelo operativo. " +
        "Las entrevistas de descubrimiento y los documentos que comparta ISALWA alimentarán esta sección.",
      evidenceRefs: [
        quoteEvidence(
          "workspace",
          `Comprensión del negocio: ${workspace.businessUnderstanding}%`,
        ),
      ],
      governanceStatus: "requiere_confirmacion",
      sourceEngines: ["workspace"],
      ...meta,
    });
    return items;
  }

  if (blueprint?.summary?.trim()) {
    const stableKey = stableKeyFor("understanding", `blueprint-summary-v${blueprint.version}`);
    const confidence = averageBlueprintConfidence(blueprint);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: "Resumen del descubrimiento",
      body: blueprint.summary,
      evidenceRefs: mapBlueprintEvidence(blueprint.evidence),
      governanceStatus: governanceFromConfidence(confidence, "understanding"),
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  if (blueprint?.currentState?.trim()) {
    const stableKey = stableKeyFor(
      "understanding",
      `blueprint-current-v${blueprint.version}`,
    );
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: "Estado operativo actual",
      body: blueprint.currentState,
      evidenceRefs: mapBlueprintEvidence(blueprint.evidence),
      governanceStatus: governanceFromConfidence(
        averageBlueprintConfidence(blueprint),
        "understanding",
      ),
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  if (blueprint?.futureState?.trim()) {
    const stableKey = stableKeyFor(
      "understanding",
      `blueprint-future-v${blueprint.version}`,
    );
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: "Estado operativo objetivo",
      body: blueprint.futureState,
      evidenceRefs: mapBlueprintEvidence(blueprint.evidence),
      governanceStatus: governanceFromConfidence(
        averageBlueprintConfidence(blueprint),
        "understanding",
      ),
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  for (const pain of blueprint?.painPoints?.slice(0, 6) ?? []) {
    const stableKey = stableKeyFor("understanding", `pain-${pain.id}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: pain.title,
      body: pain.description,
      rationale: `Categoría: ${pain.category} · Severidad: ${pain.severity}`,
      evidenceRefs: mapBlueprintEvidence(pain.evidence),
      governanceStatus: governanceFromConfidence(
        pain.severity === "critical" ? 80 : 65,
        "understanding",
      ),
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  const org = workspace.companyModel?.organization;
  if (org?.summary?.trim()) {
    const stableKey = stableKeyFor("understanding", "company-model-org");
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "understanding",
      title: "Organización",
      body: org.summary,
      evidenceRefs: mapCompanyModelEvidence(org.evidence ?? []),
      governanceStatus: governanceFromConfidence(
        workspace.companyModel?.health?.overallScore ?? THIN_CONFIDENCE,
        "understanding",
      ),
      sourceEngines: ["company_model"],
      ...meta,
    });
  }

  return items;
}

function averageBlueprintConfidence(
  blueprint: NonNullable<CompanyWorkspace["blueprints"][number]>,
): number {
  const caps = blueprint.capabilities ?? [];
  if (caps.length === 0) return 55;
  const scores = caps.flatMap((c) =>
    c.evidence.length > 0 ? [70] : [45],
  );
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
