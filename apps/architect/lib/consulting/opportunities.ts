import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingOpportunity,
  ConsultingOpportunityHorizon,
  ConversationMemory,
  OpportunityDifficulty,
} from "@/types";

interface OpportunityRule {
  id: string;
  title: string;
  horizon: ConsultingOpportunityHorizon;
  estimatedImpact: string;
  difficulty: OpportunityDifficulty;
  dependencies: string[];
  departmentsAffected: string[];
  test: (blob: string, signalIds: Set<string>, painCount: number) => boolean;
}

const RULES: OpportunityRule[] = [
  {
    id: "opp_shared_customer_record",
    title: "Create one shared customer record",
    horizon: "Quick Wins",
    estimatedImpact: "Stops lost commercial history within weeks",
    difficulty: "low",
    dependencies: ["Owner agreement on system of record"],
    departmentsAffected: ["Sales", "Support"],
    test: (blob, signals) =>
      signals.has("whatsapp") || /customer history|lost.*whatsapp/i.test(blob),
  },
  {
    id: "opp_approval_thresholds",
    title: "Codify approval thresholds",
    horizon: "30-day",
    estimatedImpact: "Removes silent queues and uneven policy",
    difficulty: "moderate",
    dependencies: ["Finance policy", "Backup approvers"],
    departmentsAffected: ["Purchasing", "Finance", "Management"],
    test: (_b, signals) => signals.has("approvals"),
  },
  {
    id: "opp_retire_load_bearing_excel",
    title: "Retire load-bearing Excel processes",
    horizon: "90-day",
    estimatedImpact: "Reduces error and version drift across operations",
    difficulty: "high",
    dependencies: ["Module selection", "Data migration plan"],
    departmentsAffected: ["Operations", "Finance", "Sales"],
    test: (_b, signals) => signals.has("excel"),
  },
  {
    id: "opp_sop_pack",
    title: "Publish a minimum SOP pack",
    horizon: "30-day",
    estimatedImpact: "Cuts onboarding time and tribal-knowledge risk",
    difficulty: "moderate",
    dependencies: ["Process owners named"],
    departmentsAffected: ["Operations", "People"],
    test: (blob) => /no sop|no documentation|tribal|undocumented/i.test(blob),
  },
  {
    id: "opp_executive_visibility",
    title: "Stand up an executive operating view",
    horizon: "6-month",
    estimatedImpact: "Leadership decides from current truth, not month-end spreadsheets",
    difficulty: "high",
    dependencies: ["Trusted metrics", "Core modules live"],
    departmentsAffected: ["Management", "Operations", "Finance"],
    test: (_b, _s, painCount) => painCount >= 2,
  },
  {
    id: "opp_automation_layer",
    title: "Automate exception detection",
    horizon: "1-year",
    estimatedImpact: "Managers intervene early instead of cleaning up late",
    difficulty: "high",
    dependencies: ["Clean operational data", "Clear ownership"],
    departmentsAffected: ["Operations", "Technology"],
    test: (blob, signals) =>
      signals.has("manual") || /manual|bottleneck|duplicate/i.test(blob),
  },
  {
    id: "opp_business_os",
    title: "Found the Business OS",
    horizon: "strategic",
    estimatedImpact: "Company operates on durable capabilities, not chat and files",
    difficulty: "high",
    dependencies: ["Blueprint agreement", "Phased investment"],
    departmentsAffected: ["Management", "Operations", "Sales", "Finance"],
    test: (_b, _s, painCount) => painCount >= 1,
  },
];

/**
 * Translate findings into timed opportunities — deterministic.
 */
export function evaluateOpportunities(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingOpportunity[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => p.title),
    ...memory.summary.painPoints,
  ]
    .join(" ")
    .toLowerCase();
  const signalIds = new Set(business.signals.map((s) => s.id));
  const painCount = memory.painPoints.length;

  const out: ConsultingOpportunity[] = [];
  for (const rule of RULES) {
    if (!rule.test(blob, signalIds, painCount)) continue;
    out.push({
      id: createId(rule.id),
      title: rule.title,
      horizon: rule.horizon,
      estimatedImpact: rule.estimatedImpact,
      difficulty: rule.difficulty,
      dependencies: rule.dependencies,
      departmentsAffected: rule.departmentsAffected,
      evidence: memory.painPoints.map((p) => p.title).slice(0, 3),
      confidence: 0.74,
    });
  }

  return out;
}
