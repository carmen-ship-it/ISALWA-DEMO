import { createId, nowIso } from "@/lib/utils";
import type {
  IsalwaPlanificacionState,
  IsalwaPlanificacionStateV1,
  IsalwaPlanificacionStateV2,
  PlanificacionClientQuestion,
  PlanificacionPlanItem,
} from "@/types";
import { isPlanificacionStateV2 } from "@/types";
import {
  PLANIFICACION_DERIVATION_VERSION,
  PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
} from "./constants";
import {
  isFabricatedPlanificacionChangeEntry,
  mapDataReqStatusToGovernance,
} from "./migrate-helpers";
import { planificacionItemId, planificacionQuestionId, stableKeyFor } from "./derive/helpers";

export function createEmptyPlanificacionStateV2(): IsalwaPlanificacionStateV2 {
  const stamp = nowIso();
  return {
    version: 2,
    initializedAt: stamp,
    lastUpdatedAt: stamp,
    items: [],
    questions: [],
    changeLog: [],
    preservedProcedures: [],
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
  };
}

function mapDataRequirementToItem(
  req: IsalwaPlanificacionStateV1["dataRequirements"][number],
  derivedAt: string,
): PlanificacionPlanItem {
  const stableKey = stableKeyFor("information_gap", req.title);
  const governanceStatus = mapDataReqStatusToGovernance(req.status);
  const item: PlanificacionPlanItem = {
    id: planificacionItemId(stableKey),
    stableKey,
    kind: "information_gap",
    title: req.title,
    body: req.description,
    evidenceRefs: [],
    governanceStatus,
    sourceEngines: ["workspace"],
    derivedAt,
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
  };

  if (req.status === "aprobado" && req.updatedAt) {
    item.approval = {
      actor: "Cliente ISALWA",
      at: req.updatedAt,
      snapshotVersion: 1,
    };
  }

  if (req.notes?.trim()) {
    item.clientResponse = {
      action: "comentar",
      text: req.notes,
      actor: "Cliente ISALWA",
      at: req.updatedAt ?? derivedAt,
    };
  }

  return item;
}

function mapDecisionToQuestion(
  dec: IsalwaPlanificacionStateV1["decisions"][number],
  derivedAt: string,
): PlanificacionClientQuestion {
  const stableKey = stableKeyFor("client_decision", dec.question);
  return {
    id: planificacionQuestionId(stableKey),
    stableKey,
    question: dec.question,
    ourUnderstanding: PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
    whyItMatters: dec.why,
    recommendation: dec.recommendation,
    options: dec.options,
    status: dec.status,
    response: dec.response ?? undefined,
    actor: dec.response ? "Cliente ISALWA" : undefined,
    respondedAt: dec.response ? dec.updatedAt : undefined,
    derivedAt,
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
  };
}

function shouldPreserveV1Decision(
  dec: IsalwaPlanificacionStateV1["decisions"][number],
): boolean {
  if (dec.response) return true;
  if (!dec.isDemo) return true;
  return false;
}

/**
 * Migrate v1 persisted state to v2 without inventing business facts.
 * Checklist rows and answered decisions become persisted client state.
 */
export function migratePlanificacionToV2(
  state: IsalwaPlanificacionState,
): IsalwaPlanificacionStateV2 {
  if (isPlanificacionStateV2(state)) {
    return state;
  }

  const derivedAt = state.lastUpdatedAt ?? nowIso();
  const items: PlanificacionPlanItem[] = state.dataRequirements.map((req) =>
    mapDataRequirementToItem(req, derivedAt),
  );
  const questions: PlanificacionClientQuestion[] = state.decisions
    .filter(shouldPreserveV1Decision)
    .map((dec) => mapDecisionToQuestion(dec, derivedAt));

  const changeLog = state.changeLog.filter(
    (entry) => !isFabricatedPlanificacionChangeEntry(entry.approvedBy),
  );

  return {
    version: 2,
    initializedAt: state.initializedAt,
    lastUpdatedAt: state.lastUpdatedAt,
    items,
    questions,
    changeLog,
    preservedProcedures: state.preservedProcedures,
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
  };
}

/** Normalize any persisted shape to v2 for derivation merge. */
export function normalizePlanificacionState(
  state: IsalwaPlanificacionState | null | undefined,
): IsalwaPlanificacionStateV2 {
  if (!state) return createEmptyPlanificacionStateV2();
  return migratePlanificacionToV2(state);
}

/** Upgrade v2 persisted state in place when derivation algorithm advances. */
export function bumpPlanificacionDerivationVersion(
  state: IsalwaPlanificacionStateV2,
): IsalwaPlanificacionStateV2 {
  if (state.derivationVersion === PLANIFICACION_DERIVATION_VERSION) {
    return state;
  }
  return {
    ...state,
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
    lastUpdatedAt: nowIso(),
  };
}

export function appendPlanificacionChange(
  state: IsalwaPlanificacionStateV2,
  change: string,
  reason: string,
  approvedBy: string,
  impact: string,
): IsalwaPlanificacionStateV2 {
  const entry = {
    id: createId("pch"),
    at: nowIso(),
    change,
    reason,
    approvedBy,
    impact,
  };
  return {
    ...state,
    changeLog: [entry, ...state.changeLog],
    lastUpdatedAt: entry.at,
  };
}
