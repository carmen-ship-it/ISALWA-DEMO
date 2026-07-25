import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingPattern,
  ConversationMemory,
} from "@/types";

interface PatternRule {
  id: string;
  label: string;
  description: string;
  test: (blob: string, signalIds: Set<string>) => boolean;
}

const RULES: PatternRule[] = [
  {
    id: "shadow_crm",
    label: "Shadow CRM in messaging",
    description:
      "Commercial context accumulates in chat rather than a durable customer system.",
    test: (_b, signals) => signals.has("whatsapp"),
  },
  {
    id: "spreadsheet_os",
    label: "Spreadsheet operating system",
    description:
      "Excel functions as the de facto ERP for planning, tracking, or reporting.",
    test: (_b, signals) => signals.has("excel"),
  },
  {
    id: "approval_theater",
    label: "Informal approval theater",
    description:
      "Approvals exist socially but lack thresholds, backups, and trails.",
    test: (_b, signals) => signals.has("approvals"),
  },
  {
    id: "hero_operator",
    label: "Hero operator pattern",
    description:
      "One person carries disproportionate operational or commercial load.",
    test: (blob) => /one person|only i|i do everything|key person/i.test(blob),
  },
  {
    id: "month_end_scramble",
    label: "Month-end scramble",
    description:
      "Reporting is reconstructed under deadline instead of produced continuously.",
    test: (_b, signals) => signals.has("reports"),
  },
];

/**
 * Recurring consulting patterns — deterministic.
 */
export function evaluatePatterns(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingPattern[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => p.title),
  ]
    .join(" ")
    .toLowerCase();
  const signalIds = new Set(business.signals.map((s) => s.id));

  return RULES.filter((rule) => rule.test(blob, signalIds)).map((rule) => ({
    id: createId(rule.id),
    label: rule.label,
    description: rule.description,
    confidence: 0.76,
    evidence: memory.painPoints.map((p) => p.title).slice(0, 2),
  }));
}
