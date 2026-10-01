import type {
  IsalwaPlanificacionStateV2,
  PlanificacionClientQuestion,
  PlanificacionItemKind,
  PlanificacionPlanItem,
} from "@/types";

function mergePlanItem(
  derived: PlanificacionPlanItem,
  persisted?: PlanificacionPlanItem,
): PlanificacionPlanItem {
  if (!persisted) return derived;

  const merged: PlanificacionPlanItem = {
    ...derived,
    id: persisted.id,
    clientResponse: persisted.clientResponse,
    approval: persisted.approval,
  };

  if (persisted.approval) {
    merged.governanceStatus = "aprobado";
    merged.title = persisted.title;
    merged.body = persisted.body;
    merged.recommendation = persisted.recommendation ?? derived.recommendation;
    merged.rationale = persisted.rationale ?? derived.rationale;
    merged.clientResponse = persisted.clientResponse;
    merged.approval = persisted.approval;
    return merged;
  }

  if (persisted.governanceStatus === "rechazado") {
    merged.governanceStatus = "rechazado";
    merged.clientResponse = persisted.clientResponse ?? merged.clientResponse;
    return merged;
  }

  if (persisted.clientResponse) {
    merged.clientResponse = persisted.clientResponse;
    if (persisted.clientResponse.action === "corregir") {
      merged.governanceStatus = "en_revision";
      merged.body = persisted.clientResponse.text || merged.body;
    }
    if (persisted.clientResponse.action === "confirmar") {
      merged.governanceStatus =
        persisted.governanceStatus === "aprobado"
          ? "aprobado"
          : "requiere_confirmacion";
    }
  }

  if (
    persisted.governanceStatus === "en_revision" ||
    persisted.governanceStatus === "decision_isalwa"
  ) {
    merged.governanceStatus = persisted.governanceStatus;
  }

  return merged;
}

function mergeQuestion(
  derived: PlanificacionClientQuestion,
  persisted?: PlanificacionClientQuestion,
): PlanificacionClientQuestion {
  if (!persisted) return derived;
  return {
    ...derived,
    id: persisted.id,
    status: persisted.status,
    response: persisted.response,
    actor: persisted.actor,
    respondedAt: persisted.respondedAt,
  };
}

export function mergeDerivedItems(
  derived: PlanificacionPlanItem[],
  persisted: PlanificacionPlanItem[],
): PlanificacionPlanItem[] {
  const byKey = new Map(persisted.map((item) => [item.stableKey, item]));
  const merged = derived.map((item) => mergePlanItem(item, byKey.get(item.stableKey)));

  for (const item of persisted) {
    if (!merged.some((m) => m.stableKey === item.stableKey)) {
      merged.push(item);
    }
  }

  return merged;
}

export function mergeDerivedQuestions(
  derived: PlanificacionClientQuestion[],
  persisted: PlanificacionClientQuestion[],
): PlanificacionClientQuestion[] {
  const byKey = new Map(persisted.map((q) => [q.stableKey, q]));
  const merged = derived.map((q) => mergeQuestion(q, byKey.get(q.stableKey)));

  for (const q of persisted) {
    if (!merged.some((m) => m.stableKey === q.stableKey)) {
      merged.push(q);
    }
  }

  return merged;
}

export function mergeDerivedWithPersisted(
  derivedItems: PlanificacionPlanItem[],
  derivedQuestions: PlanificacionClientQuestion[],
  persistedState: IsalwaPlanificacionStateV2,
): {
  items: PlanificacionPlanItem[];
  questions: PlanificacionClientQuestion[];
} {
  return {
    items: mergeDerivedItems(derivedItems, persistedState.items),
    questions: mergeDerivedQuestions(derivedQuestions, persistedState.questions),
  };
}

export function groupItemsByKind(
  items: PlanificacionPlanItem[],
): Record<PlanificacionItemKind, PlanificacionPlanItem[]> {
  const kinds: PlanificacionItemKind[] = [
    "understanding",
    "recommendation",
    "capability",
    "information_gap",
    "client_decision",
    "technical_requirement",
  ];
  const grouped = Object.fromEntries(
    kinds.map((kind) => [kind, [] as PlanificacionPlanItem[]]),
  ) as Record<PlanificacionItemKind, PlanificacionPlanItem[]>;

  for (const item of items) {
    grouped[item.kind].push(item);
  }
  return grouped;
}
