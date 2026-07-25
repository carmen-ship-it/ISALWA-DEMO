import { nowIso } from "@/lib/utils";
import type {
  ConversationMemory,
  Opportunity,
  OpportunityImpact,
} from "@/types";

interface OpportunityRule {
  id: string;
  title: string;
  impact: OpportunityImpact;
  description: string;
  requiresSignals?: string[];
  requiresIndustry?: string[];
  minPain?: number;
}

const RULES: OpportunityRule[] = [
  {
    id: "opp_digital_visit_reports",
    title: "Digital visit reports",
    impact: "quick_win",
    description:
      "Replace informal visit notes with structured field reports that feed one customer record.",
    requiresSignals: ["manual", "paper", "whatsapp"],
  },
  {
    id: "opp_approval_workflows",
    title: "Approval workflows",
    impact: "medium",
    description:
      "Make purchasing and commercial approvals explicit, with backups and thresholds.",
    requiresSignals: ["approvals"],
  },
  {
    id: "opp_production_dashboard",
    title: "Production planning dashboard",
    impact: "high",
    description:
      "Give leadership a live view of demand versus capacity and open work.",
    requiresIndustry: ["manufacturing", "distribution"],
  },
  {
    id: "opp_command_center",
    title: "Executive Command Center",
    impact: "strategic",
    description:
      "Unify sales, operations, and cash signals into one executive operating view.",
    minPain: 2,
  },
  {
    id: "opp_crm",
    title: "Centralized CRM",
    impact: "high",
    description:
      "Create one searchable history for customers, conversations, and commitments.",
    requiresSignals: ["whatsapp", "visibility", "excel"],
  },
  {
    id: "opp_inventory_truth",
    title: "Inventory truth layer",
    impact: "high",
    description:
      "Close the gap between spreadsheet counts and physical reality.",
    requiresIndustry: ["distribution", "manufacturing"],
    requiresSignals: ["excel"],
  },
];

export function generateOpportunities(
  memory: ConversationMemory,
  signalIds: string[],
  existingIds: Set<string>,
): Opportunity[] {
  const created: Opportunity[] = [];
  const industry = memory.summary.industry;
  const painCount = memory.painPoints.length;

  for (const rule of RULES) {
    if (existingIds.has(rule.id)) continue;
    if (
      rule.requiresIndustry &&
      !rule.requiresIndustry.includes(industry)
    ) {
      continue;
    }
    if (rule.minPain !== undefined && painCount < rule.minPain) continue;
    if (rule.requiresSignals) {
      const hit = rule.requiresSignals.some((id) => signalIds.includes(id));
      if (!hit) continue;
    }

    const evidence = memory.knownFacts
      .slice(-3)
      .flatMap((fact) => fact.evidence)
      .slice(0, 2);

    if (evidence.length === 0 && memory.summary.belief) {
      evidence.push(memory.summary.belief);
    }
    if (evidence.length === 0) continue;

    created.push({
      id: rule.id,
      title: rule.title,
      impact: rule.impact,
      description: rule.description,
      evidence,
      createdAt: nowIso(),
    });
  }

  return created;
}

export function impactLabel(impact: OpportunityImpact): string {
  switch (impact) {
    case "quick_win":
      return "Quick Win";
    case "medium":
      return "Medium Impact";
    case "high":
      return "High Impact";
    case "strategic":
      return "Strategic";
  }
}
