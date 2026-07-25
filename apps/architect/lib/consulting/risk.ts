import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingRisk,
  ConsultingRiskPatternId,
  ConversationMemory,
  RiskSeverity,
} from "@/types";

interface RiskRule {
  patternId: ConsultingRiskPatternId;
  title: string;
  severity: RiskSeverity;
  businessImpact: string;
  recommendedMitigation: string;
  test: (ctx: RiskContext) => { hit: boolean; evidence: string[]; confidence: number };
}

interface RiskContext {
  blob: string;
  memory: ConversationMemory;
  business: BusinessProfile;
  signalIds: Set<string>;
}

const RULES: RiskRule[] = [
  {
    patternId: "excel_dependency",
    title: "Excel dependency",
    severity: "high",
    businessImpact:
      "Operational truth fragments across files; decisions lag and errors compound.",
    recommendedMitigation:
      "Designate a system of record and retire load-bearing spreadsheets by process.",
    test: ({ signalIds, blob, memory }) => ({
      hit: signalIds.has("excel") || /excel|spreadsheet/i.test(blob),
      evidence: [
        ...memory.summary.currentSoftware.filter((t) => /excel|sheet/i.test(t)),
        ...memory.painPoints
          .filter((p) => /excel|spreadsheet/i.test(p.title))
          .map((p) => p.title),
      ].slice(0, 3),
      confidence: 0.86,
    }),
  },
  {
    patternId: "whatsapp_dependency",
    title: "WhatsApp dependency",
    severity: "high",
    businessImpact:
      "Customer and deal history lives in personal devices; continuity breaks when people leave.",
    recommendedMitigation:
      "Capture commercial conversations into a shared customer record with clear ownership.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("whatsapp") || /whatsapp/i.test(blob),
      evidence: ["Messaging used as workflow"],
      confidence: 0.84,
    }),
  },
  {
    patternId: "paper_forms",
    title: "Paper forms",
    severity: "moderate",
    businessImpact: "Slow cycle times, lost paperwork, and weak auditability.",
    recommendedMitigation:
      "Digitize high-volume forms first; keep exceptions explicit.",
    test: ({ signalIds }) => ({
      hit: signalIds.has("paper"),
      evidence: ["Paper-based process signal"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "manual_approvals",
    title: "Manual approvals",
    severity: "high",
    businessImpact: "Work queues behind individuals; policy is informal and uneven.",
    recommendedMitigation:
      "Codify thresholds, backups, and approval trails in a shared workflow.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("approvals") || /manual approv/i.test(blob),
      evidence: ["Approval bottleneck signal"],
      confidence: 0.82,
    }),
  },
  {
    patternId: "duplicate_work",
    title: "Duplicate work",
    severity: "moderate",
    businessImpact: "Cost and error rate rise as the same facts are typed repeatedly.",
    recommendedMitigation:
      "Capture once at intake; propagate through modules instead of re-entry.",
    test: ({ signalIds }) => ({
      hit: signalIds.has("duplicate") || signalIds.has("repeated"),
      evidence: ["Duplicate / repeated work signal"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "manual_reporting",
    title: "Manual reporting",
    severity: "moderate",
    businessImpact: "Leadership sees yesterday’s picture; reporting consumes scarce time.",
    recommendedMitigation:
      "Define trusted metrics and generate them from operational systems.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("reports") || /manual report|end of (the )?month/i.test(blob),
      evidence: ["Manual reporting signal"],
      confidence: 0.78,
    }),
  },
  {
    patternId: "tribal_knowledge",
    title: "Tribal knowledge",
    severity: "critical",
    businessImpact:
      "The company cannot scale or recover if key people are unavailable.",
    recommendedMitigation:
      "Externalize critical procedures and ownership into durable company memory.",
    test: ({ blob }) => ({
      hit: /tribal|only .+ knows|in (my|his|her) head|key person/i.test(blob),
      evidence: ["Language suggesting knowledge concentrated in people"],
      confidence: 0.75,
    }),
  },
  {
    patternId: "no_documentation",
    title: "No documentation",
    severity: "high",
    businessImpact: "Training, quality, and continuity depend on oral tradition.",
    recommendedMitigation:
      "Start with the five highest-risk SOPs and keep them owned and current.",
    test: ({ blob }) => ({
      hit: /no (sop|documentation|docs)|don'?t (have|use) (sops?|documentation)|undocumented/i.test(
        blob,
      ),
      evidence: ["Documentation gap referenced"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "single_employee_owns_everything",
    title: "Single employee owns everything",
    severity: "critical",
    businessImpact: "Bus-factor risk on approvals, customers, or operations.",
    recommendedMitigation:
      "Introduce backups, shared queues, and role clarity for critical paths.",
    test: ({ blob, memory }) => ({
      hit:
        /one person|only (i|he|she|one)|single (person|owner|employee)|everything goes through/i.test(
          blob,
        ) ||
        (memory.summary.teamHint !== null &&
          /1|one|solo/i.test(memory.summary.teamHint)),
      evidence: ["Concentration of ownership suggested"],
      confidence: 0.72,
    }),
  },
  {
    patternId: "no_audit_trail",
    title: "No audit trail",
    severity: "high",
    businessImpact: "Disputes and compliance reviews cannot reconstruct decisions.",
    recommendedMitigation:
      "Record who approved what, when, and against which policy version.",
    test: ({ blob }) => ({
      hit: /no audit|no trail|can'?t (prove|show)|no history of approv/i.test(blob),
      evidence: ["Auditability concern"],
      confidence: 0.7,
    }),
  },
  {
    patternId: "no_backups",
    title: "No backups",
    severity: "critical",
    businessImpact: "Operational data loss becomes existential.",
    recommendedMitigation:
      "Establish backup ownership and recovery tests for critical stores.",
    test: ({ blob }) => ({
      hit: /no backup|without backup|lost (the )?file|drive (died|failed)/i.test(blob),
      evidence: ["Backup / recovery gap"],
      confidence: 0.78,
    }),
  },
  {
    patternId: "customer_concentration",
    title: "Customer concentration",
    severity: "high",
    businessImpact: "Revenue shock if a small set of customers churns.",
    recommendedMitigation:
      "Measure concentration, protect key accounts, and diversify acquisition.",
    test: ({ blob }) => ({
      hit: /few customers|top (client|customer)|concentrat|depend on one customer/i.test(
        blob,
      ),
      evidence: ["Possible customer concentration"],
      confidence: 0.68,
    }),
  },
  {
    patternId: "supplier_concentration",
    title: "Supplier concentration",
    severity: "moderate",
    businessImpact: "Supply disruption cascades into production and delivery.",
    recommendedMitigation:
      "Map critical suppliers and define alternate sources for top SKUs.",
    test: ({ blob }) => ({
      hit: /one supplier|single vendor|only supplier|supplier risk/i.test(blob),
      evidence: ["Possible supplier concentration"],
      confidence: 0.66,
    }),
  },
];

/**
 * Operational risk pattern detection — deterministic.
 */
export function evaluateRisks(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingRisk[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => `${p.title} ${p.description}`),
    ...memory.summary.painPoints,
    business.description ?? "",
  ]
    .join("\n")
    .toLowerCase();

  const signalIds = new Set(business.signals.map((s) => s.id));
  const ctx: RiskContext = { blob, memory, business, signalIds };
  const risks: ConsultingRisk[] = [];

  for (const rule of RULES) {
    const result = rule.test(ctx);
    if (!result.hit) continue;
    risks.push({
      id: createId("crisk"),
      patternId: rule.patternId,
      title: rule.title,
      severity: rule.severity,
      confidence: result.confidence,
      businessImpact: rule.businessImpact,
      recommendedMitigation: rule.recommendedMitigation,
      evidence:
        result.evidence.length > 0
          ? result.evidence
          : [`Pattern matched: ${rule.title}`],
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(severity: RiskSeverity): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "moderate":
      return 2;
    case "low":
      return 1;
  }
}
