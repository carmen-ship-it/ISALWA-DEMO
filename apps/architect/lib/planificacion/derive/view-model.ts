import type { CompanyWorkspace, PlanificacionViewModel, PlanificacionViewModelItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  PLANIFICACION_DERIVATION_VERSION,
  PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE,
} from "../constants";
import { normalizePlanificacionState } from "../migrate-v2";
import {
  deriveAiAuthorityQuestions,
  deriveAiAuthorityRequirements,
} from "./ai-authority";
import { deriveCommandCenterRequirements } from "./command-center";
import { deriveProposedCapabilities } from "./capabilities";
import {
  deriveEventsWorkAttentionRequirements,
} from "./events-work-attention";
import { deriveFoundationRequirements } from "./foundation";
import {
  deriveFinanceDependencyQuestions,
  deriveFinanceDependencyRequirements,
} from "./finance-dependency";
import { deriveGapsAndQuestions } from "./gaps";
import {
  deriveIdentityEntryQuestions,
  deriveIdentityEntryRequirements,
} from "./identity-entry";
import {
  deriveAdminGovernanceQuestions,
  deriveAdminGovernanceRequirements,
} from "./admin-governance";
import {
  derivePartyLifecycleQuestions,
  derivePartyLifecycleRequirements,
} from "./party-lifecycle";
import {
  deriveWorkforceLifecycleQuestions,
  deriveWorkforceLifecycleRequirements,
} from "./workforce-lifecycle";
import { derivePhases } from "./phases";
import { groupItemsByKind, mergeDerivedWithPersisted } from "./merge";
import { deriveRecommendations } from "./recommendations";
import { deriveTechnicalRequirements } from "./technical";
import { deriveUnderstandingSummary } from "./understanding";
import { hasDiscoveryContent } from "./helpers";
import type { PlanificacionPlanItem } from "@/types";

function enrichViewModelItems(
  mergedItems: PlanificacionPlanItem[],
  derivedItems: PlanificacionPlanItem[],
): PlanificacionViewModelItem[] {
  const derivedByKey = new Map(derivedItems.map((item) => [item.stableKey, item]));
  return mergedItems.map((item) => {
    const architect = derivedByKey.get(item.stableKey);
    return {
      ...item,
      architectProposal: {
        title: architect?.title ?? item.title,
        body: architect?.body ?? item.body,
        recommendation: architect?.recommendation ?? item.recommendation,
        rationale: architect?.rationale ?? item.rationale,
      },
    };
  });
}

/** Collect all derived plan items before merge with persisted state. */
export function deriveAllPlanItems(workspace: CompanyWorkspace) {
  const understanding = deriveUnderstandingSummary(workspace);
  const recommendations = deriveRecommendations(workspace);
  const capabilities = deriveProposedCapabilities(workspace);
  const commandCenter = deriveCommandCenterRequirements(workspace);
  const { gaps, questions: gapQuestions } = deriveGapsAndQuestions(workspace);
  const technical = deriveTechnicalRequirements(workspace);
  const foundation = deriveFoundationRequirements(workspace);
  const identityEntry = deriveIdentityEntryRequirements(workspace);
  const eventsWorkAttention = deriveEventsWorkAttentionRequirements(workspace);
  const aiAuthority = deriveAiAuthorityRequirements(workspace);
  const financeDependency = deriveFinanceDependencyRequirements(workspace);
  const workforce = deriveWorkforceLifecycleRequirements(workspace);
  const partyLifecycle = derivePartyLifecycleRequirements(workspace);
  const adminGovernance = deriveAdminGovernanceRequirements(workspace);

  const items = [
    ...understanding,
    ...recommendations,
    ...capabilities,
    ...commandCenter,
    ...gaps,
    ...technical,
    ...foundation,
    ...identityEntry,
    ...eventsWorkAttention,
    ...aiAuthority,
    ...financeDependency,
    ...workforce,
    ...partyLifecycle,
    ...adminGovernance,
  ];

  const architectureQuestions = [
    ...deriveIdentityEntryQuestions(),
    ...deriveFinanceDependencyQuestions(),
    ...deriveAiAuthorityQuestions(),
    ...deriveWorkforceLifecycleQuestions(),
    ...derivePartyLifecycleQuestions(),
    ...deriveAdminGovernanceQuestions(),
  ];

  const deduped = dedupeByStableKey(items);
  const dedupedQuestions = dedupeQuestionsByStableKey([
    ...gapQuestions,
    ...architectureQuestions,
  ]);
  return { items: deduped, questions: dedupedQuestions };
}

function dedupeByStableKey<T extends { stableKey: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.stableKey)) continue;
    seen.add(row.stableKey);
    out.push(row);
  }
  return out;
}

function dedupeQuestionsByStableKey(
  rows: PlanificacionViewModel["questions"],
): PlanificacionViewModel["questions"] {
  const seen = new Set<string>();
  const out: PlanificacionViewModel["questions"] = [];
  for (const row of rows) {
    if (seen.has(row.stableKey)) continue;
    seen.add(row.stableKey);
    out.push(row);
  }
  return out;
}

export function buildPlanificacionViewModel(
  workspace: CompanyWorkspace,
): PlanificacionViewModel {
  const derivedAt = nowIso();
  const persisted = normalizePlanificacionState(workspace.planificacion);
  const { items: derivedItems, questions: derivedQuestions } =
    deriveAllPlanItems(workspace);
  const merged = mergeDerivedWithPersisted(
    derivedItems,
    derivedQuestions,
    persisted,
  );
  const viewItems = enrichViewModelItems(merged.items, derivedItems);

  const discoveryInProgress = !hasDiscoveryContent(workspace);
  const overallHeadline = discoveryInProgress
    ? PLANIFICACION_DISCOVERY_IN_PROGRESS_HEADLINE
    : workspace.lastActivityLabel || "Planificación derivada del descubrimiento";

  return {
    derivationVersion: PLANIFICACION_DERIVATION_VERSION,
    derivedAt,
    overallHeadline,
    understandingMaturityPct: workspace.businessUnderstanding,
    discoveryInProgress,
    items: viewItems,
    questions: merged.questions,
    phases: derivePhases(workspace),
    preservedProcedures: persisted.preservedProcedures,
    byKind: groupItemsByKind(viewItems) as PlanificacionViewModel["byKind"],
    changeLog: persisted.changeLog,
  };
}
