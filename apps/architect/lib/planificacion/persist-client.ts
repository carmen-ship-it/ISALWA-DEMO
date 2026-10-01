import type {
  IsalwaPlanificacionStateV2,
  PlanificacionClientAction,
  PlanificacionClientQuestion,
  PlanificacionGovernanceStatus,
  PlanificacionPlanItem,
  PlanificacionViewModelItem,
} from "@/types";
import { appendPlanificacionChange } from "./migrate-v2";
import { nowIso } from "@/lib/utils";

export function findPersistedItem(
  state: IsalwaPlanificacionStateV2,
  itemId: string,
): PlanificacionPlanItem | undefined {
  return state.items.find((item) => item.id === itemId);
}

export function upsertPersistedItem(
  state: IsalwaPlanificacionStateV2,
  item: PlanificacionPlanItem,
): IsalwaPlanificacionStateV2 {
  const exists = state.items.some((row) => row.id === item.id || row.stableKey === item.stableKey);
  const items = exists
    ? state.items.map((row) =>
        row.id === item.id || row.stableKey === item.stableKey ? item : row,
      )
    : [...state.items, item];
  return {
    ...state,
    items,
    lastUpdatedAt: nowIso(),
  };
}

function governanceAfterAction(
  action: PlanificacionClientAction,
  current: PlanificacionGovernanceStatus,
): PlanificacionGovernanceStatus {
  if (action === "rechazar") return "rechazado";
  if (action === "corregir") return "en_revision";
  if (action === "confirmar") {
    return current === "aprobado" ? "aprobado" : "requiere_confirmacion";
  }
  if (action === "comentar") {
    return current === "aprobado" ? "aprobado" : "en_revision";
  }
  return current;
}

export function applyPlanItemClientAction(
  state: IsalwaPlanificacionStateV2,
  viewItem: PlanificacionViewModelItem,
  action: PlanificacionClientAction,
  text: string,
  actor: string,
): IsalwaPlanificacionStateV2 {
  const at = nowIso();
  const persisted = findPersistedItem(state, viewItem.id);
  const { architectProposal: _omit, ...itemShape } = viewItem;
  const base: PlanificacionPlanItem = persisted ?? itemShape;

  const nextItem: PlanificacionPlanItem = {
    ...base,
    clientResponse: {
      action,
      text,
      actor,
      at,
    },
    governanceStatus: governanceAfterAction(action, base.governanceStatus),
  };

  if (action === "corregir" && text.trim()) {
    nextItem.body = text.trim();
  }

  let next = upsertPersistedItem(state, nextItem);
  next = appendPlanificacionChange(
    next,
    `Planificación · ${viewItem.title} — ${action}`,
    text,
    actor,
    "Respuesta de cliente en Planificación ISALWA",
  );
  return next;
}

export function approvePlanItem(
  state: IsalwaPlanificacionStateV2,
  viewItem: PlanificacionViewModelItem,
  actor: string,
): IsalwaPlanificacionStateV2 {
  const at = nowIso();
  const persisted = findPersistedItem(state, viewItem.id);
  const { architectProposal: _omit, ...itemShape } = viewItem;
  const base: PlanificacionPlanItem = persisted ?? itemShape;

  const approvedBody =
    base.clientResponse?.action === "corregir" && base.clientResponse.text
      ? base.clientResponse.text
      : viewItem.body;

  const nextItem: PlanificacionPlanItem = {
    ...base,
    body: approvedBody,
    governanceStatus: "aprobado",
    approval: {
      actor,
      at,
      snapshotVersion: viewItem.derivationVersion,
      snapshotId: viewItem.stableKey,
    },
    clientResponse: base.clientResponse ?? {
      action: "aprobar",
      text: approvedBody,
      actor,
      at,
    },
  };

  let next = upsertPersistedItem(state, nextItem);
  next = appendPlanificacionChange(
    next,
    `Aprobado · ${viewItem.title}`,
    approvedBody,
    actor,
    "Requisito aprobado para handoff",
  );
  return next;
}

export function markPlanItemForReview(
  state: IsalwaPlanificacionStateV2,
  viewItem: PlanificacionViewModelItem,
  actor: string,
): IsalwaPlanificacionStateV2 {
  const persisted = findPersistedItem(state, viewItem.id);
  const { architectProposal: _omit, ...itemShape } = viewItem;
  const base: PlanificacionPlanItem = persisted ?? itemShape;
  const nextItem: PlanificacionPlanItem = {
    ...base,
    governanceStatus: "en_revision",
  };
  let next = upsertPersistedItem(state, nextItem);
  next = appendPlanificacionChange(
    next,
    `En revisión · ${viewItem.title}`,
    "Marcado para revisión antes de aprobar",
    actor,
    "Gobernanza Planificación",
  );
  return next;
}

export function respondPlanQuestion(
  state: IsalwaPlanificacionStateV2,
  questionId: string,
  response: string,
  actor: string,
  status: PlanificacionClientQuestion["status"] = "respondido",
): IsalwaPlanificacionStateV2 {
  const at = nowIso();
  const questions = state.questions.map((q) =>
    q.id === questionId
      ? { ...q, response, status, actor, respondedAt: at }
      : q,
  );
  const question = state.questions.find((q) => q.id === questionId);
  let next: IsalwaPlanificacionStateV2 = {
    ...state,
    questions,
    lastUpdatedAt: at,
  };
  if (question) {
    next = appendPlanificacionChange(
      next,
      `Pregunta · ${question.question}`,
      response,
      actor,
      "Decisión / aclaración de ISALWA",
    );
  }
  return next;
}

export function approvePlanQuestion(
  state: IsalwaPlanificacionStateV2,
  questionId: string,
  actor: string,
): IsalwaPlanificacionStateV2 {
  const question = state.questions.find((q) => q.id === questionId);
  if (!question?.response) {
    return state;
  }
  return respondPlanQuestion(state, questionId, question.response, actor, "aprobado");
}
