import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  governanceFromConfidence,
  itemDerivationMeta,
  mapBlueprintEvidence,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

export function deriveRecommendations(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];

  for (const rec of workspace.recommendations) {
    const stableKey = stableKeyFor("recommendation", `ws-rec-${rec.id}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "recommendation",
      title: rec.title,
      body: rec.rationale,
      recommendation: rec.rationale,
      rationale: rec.relatedPainPoints.join(" · ") || undefined,
      evidenceRefs: rec.relatedPainPoints.map((p) =>
        quoteEvidence("recommendations", p),
      ),
      governanceStatus: governanceFromConfidence(
        priorityConfidence(rec.priority),
        "recommendation",
      ),
      priority: rec.priority,
      sourceEngines: ["recommendations"],
      ...meta,
    });
  }

  const consulting = workspace.conversationMemory?.consulting;
  for (const rec of consulting?.recommendations ?? []) {
    const stableKey = stableKeyFor("recommendation", `consult-${rec.id}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "recommendation",
      title: rec.title,
      body: rec.rationale,
      recommendation: rec.rationale,
      evidenceRefs: rec.evidence.map((e) =>
        quoteEvidence("consulting", e, rec.id),
      ),
      governanceStatus: governanceFromConfidence(
        consulting?.confidence.overall ?? priorityConfidence(rec.priority),
        "recommendation",
      ),
      priority: rec.priority,
      sourceEngines: ["consulting"],
      ...meta,
    });
  }

  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;

  for (const opp of blueprint?.opportunities?.slice(0, 8) ?? []) {
    const stableKey = stableKeyFor("recommendation", `opp-${opp.id}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "recommendation",
      title: opp.title,
      body: opp.description,
      recommendation: opp.description,
      rationale: `Horizonte: ${opp.horizon}`,
      evidenceRefs: mapBlueprintEvidence(opp.evidence),
      governanceStatus: governanceFromConfidence(68, "recommendation"),
      priority: "next",
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  for (const line of blueprint?.recommendations?.slice(0, 6) ?? []) {
    const stableKey = stableKeyFor("recommendation", line);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "recommendation",
      title: line.slice(0, 120),
      body: line,
      recommendation: line,
      evidenceRefs: mapBlueprintEvidence(blueprint?.evidence ?? []),
      governanceStatus: governanceFromConfidence(65, "recommendation"),
      sourceEngines: ["blueprint"],
      ...meta,
    });
  }

  return items;
}

function priorityConfidence(
  priority: "now" | "next" | "later",
): number {
  if (priority === "now") return 78;
  if (priority === "next") return 68;
  return 58;
}
