import { createId, nowIso } from "@/lib/utils";
import type {
  ConsultantInsight,
  ConversationMemory,
  Observation,
} from "@/types";

const INSIGHT_CONFIDENCE_GATE = 80;

interface InsightRule {
  id: string;
  requiredSignals?: string[];
  requiredFactKeys?: string[];
  minOverall?: number;
  title: string;
  body: (memory: ConversationMemory, evidence: string[]) => string;
  risk: (evidence: string[]) => string;
  recommendation: string;
  severity: Observation["severity"];
}

const RULES: InsightRule[] = [
  {
    id: "insight_individual_dependency",
    requiredSignals: ["whatsapp", "visibility"],
    minOverall: INSIGHT_CONFIDENCE_GATE,
    title: "Commercial process depends on individuals",
    body: (_memory, evidence) =>
      `Your commercial process appears to depend heavily on individual employees. Evidence: “${evidence[0]}”.`,
    risk: () =>
      "If one salesperson leaves, customer history may be lost or fragmented.",
    recommendation: "Centralize customer communication and history.",
    severity: "critical",
  },
  {
    id: "insight_excel_os",
    requiredSignals: ["excel"],
    minOverall: 70,
    title: "Spreadsheets are acting as the operating system",
    body: (_memory, evidence) =>
      `Critical work appears to live in spreadsheets rather than a durable system of record. Evidence: “${evidence[0]}”.`,
    risk: () =>
      "Version drift and silent errors become inevitable as more people depend on the files.",
    recommendation: "Identify the load-bearing spreadsheets and replace them with structured workflows.",
    severity: "notable",
  },
  {
    id: "insight_whatsapp_routing",
    requiredSignals: ["whatsapp"],
    minOverall: 72,
    title: "Messaging is carrying routing and ownership",
    body: (_memory, evidence) =>
      `Customer and internal coordination seem to run through messaging threads. Evidence: “${evidence[0]}”.`,
    risk: () =>
      "Conversations cannot be reliably assigned, searched, or transferred when people change roles.",
    recommendation: "Introduce explicit conversation ownership and searchable history.",
    severity: "notable",
  },
  {
    id: "insight_approvals",
    requiredSignals: ["approvals"],
    minOverall: 75,
    title: "Approvals concentrate risk",
    body: (_memory, evidence) =>
      `Approvals appear concentrated and may block the operation. Evidence: “${evidence[0]}”.`,
    risk: () => "A single absence can stall purchasing, sales, or delivery.",
    recommendation: "Define approval matrices with backups and clear thresholds.",
    severity: "critical",
  },
  {
    id: "insight_no_history",
    requiredSignals: ["visibility"],
    minOverall: 78,
    title: "No centralized customer history",
    body: (_memory, evidence) =>
      `There appears to be no shared, trusted customer history. Evidence: “${evidence[0]}”.`,
    risk: () => "Every handoff restarts context and increases error risk.",
    recommendation: "Create one customer record that sales, operations, and support can trust.",
    severity: "critical",
  },
  {
    id: "insight_paper",
    requiredSignals: ["paper"],
    minOverall: 70,
    title: "Paper still carries operational truth",
    body: (_memory, evidence) =>
      `Parts of the process still rely on paper. Evidence: “${evidence[0]}”.`,
    risk: () => "Offline habit and legal needs can hide process debt if left unexamined.",
    recommendation: "Separate legal necessity from habit before digitizing.",
    severity: "info",
  },
];

/**
 * Never hallucinate: only emit insights when signals/facts + evidence exist.
 * Prefer generating when overall confidence exceeds ~80%.
 */
export function generateInsights(
  memory: ConversationMemory,
  businessSignals: Array<{ id: string; evidence: string }>,
  existingObservationIds: Set<string>,
): { observations: Observation[]; insights: ConsultantInsight[] } {
  const observations: Observation[] = [];
  const insights: ConsultantInsight[] = [];
  const signalIds = new Set(businessSignals.map((s) => s.id));
  const factKeys = new Set(memory.knownFacts.map((f) => f.key));

  for (const rule of RULES) {
    if (existingObservationIds.has(rule.id)) continue;
    if (
      rule.minOverall !== undefined &&
      memory.score.overall < rule.minOverall &&
      memory.summary.confidenceScore < rule.minOverall
    ) {
      // Allow slightly earlier if strong signal cluster
      const strong =
        (rule.requiredSignals?.every((id) => signalIds.has(id)) ?? false) &&
        memory.score.overall >= Math.max(65, (rule.minOverall ?? 80) - 10);
      if (!strong) continue;
    }

    if (rule.requiredSignals?.some((id) => !signalIds.has(id))) continue;
    if (rule.requiredFactKeys?.some((key) => !factKeys.has(key))) continue;

    const evidence = businessSignals
      .filter((signal) => rule.requiredSignals?.includes(signal.id))
      .map((signal) => signal.evidence);

    const factEvidence = memory.knownFacts
      .filter((fact) => rule.requiredFactKeys?.includes(fact.key))
      .flatMap((fact) => fact.evidence);

    const allEvidence = [...evidence, ...factEvidence].filter(Boolean);
    if (allEvidence.length === 0) continue;

    const body = rule.body(memory, allEvidence);
    const risk = rule.risk(allEvidence);
    const confidence = Math.max(
      memory.score.overall,
      memory.summary.confidenceScore,
    );

    observations.push({
      id: rule.id,
      createdAt: nowIso(),
      title: rule.title,
      body,
      severity: rule.severity,
      signals: rule.requiredSignals ?? [],
      relatedTopics: [],
      evidence: allEvidence,
      risk,
      recommendation: rule.recommendation,
      confidence,
    });

    insights.push(
      {
        id: createId("insight"),
        kind: "observation",
        title: rule.title,
        body,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
      {
        id: createId("insight"),
        kind: "risk",
        title: "Risk",
        body: risk,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
      {
        id: createId("insight"),
        kind: "recommendation",
        title: "Recommendation",
        body: rule.recommendation,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
    );
  }

  return { observations, insights };
}
