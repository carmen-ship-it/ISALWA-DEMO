import { INDUSTRY_PROFILES } from "@/data/catalog";
import { createId } from "@/lib/utils";
import type {
  ConversationMemory,
  DiscoveryDimension,
  Question,
  QuestionCandidate,
} from "@/types";

const CATALOG: QuestionCandidate[] = [
  {
    key: "sales_motion",
    prompt: "How do sales currently work, from first contact to closed order?",
    kind: "long_text",
    dimension: "sales",
    priority: 90,
    reason: "Sales motion is unknown.",
    placeholder: "Walk me through a typical sale…",
  },
  {
    key: "customer_contact",
    prompt: "How do customers contact you day to day?",
    kind: "long_text",
    dimension: "customers",
    priority: 88,
    reason: "Customer contact channels are unknown.",
  },
  {
    key: "customer_count",
    prompt: "Roughly how many active customers do you serve?",
    kind: "text",
    dimension: "customers",
    priority: 84,
    reason: "Customer scale is unknown.",
  },
  {
    key: "geography",
    prompt: "Where do you operate — cities, regions, or countries?",
    kind: "text",
    dimension: "geography",
    priority: 82,
    reason: "Geography is unknown.",
  },
  {
    key: "team_structure",
    prompt: "How is the commercial or operating team structured today?",
    kind: "long_text",
    dimension: "team",
    priority: 86,
    reason: "Team structure is unknown.",
    placeholder: "Roles, headcount, who owns what…",
  },
  {
    key: "order_intake",
    prompt: "How do you receive orders?",
    kind: "long_text",
    dimension: "operations",
    priority: 87,
    reason: "Order intake is unknown.",
  },
  {
    key: "bottlenecks",
    prompt: "What slows people down the most in a normal week?",
    kind: "long_text",
    dimension: "operations",
    priority: 85,
    reason: "Operational bottlenecks are unknown.",
  },
  {
    key: "finance_process",
    prompt: "How do invoicing, collections, and financial approvals work today?",
    kind: "long_text",
    dimension: "finance",
    priority: 80,
    reason: "Finance process is unknown.",
  },
  {
    key: "approvals",
    prompt: "Where do approvals get stuck, and who must say yes?",
    kind: "long_text",
    dimension: "finance",
    priority: 81,
    reason: "Approval ownership is unknown.",
  },
  {
    key: "production_planning",
    prompt: "How does production planning work today?",
    kind: "long_text",
    dimension: "production",
    priority: 89,
    reason: "Production planning is unknown.",
  },
  {
    key: "inventory_flow",
    prompt: "How does inventory flow from purchase to fulfillment?",
    kind: "long_text",
    dimension: "operations",
    priority: 91,
    reason: "Inventory flow is unknown.",
  },
  {
    key: "purchasing_approvals",
    prompt: "How do purchasing approvals work?",
    kind: "long_text",
    dimension: "finance",
    priority: 88,
    reason: "Purchasing approvals are unknown.",
  },
  {
    key: "current_software",
    prompt: "What software do you currently use to run the business?",
    kind: "long_text",
    dimension: "systems",
    priority: 83,
    reason: "Current systems are unknown.",
  },
  {
    key: "information_storage",
    prompt: "Where is important information stored today?",
    kind: "long_text",
    dimension: "systems",
    priority: 84,
    reason: "System of record is unknown.",
  },
  {
    key: "mistakes",
    prompt: "What causes mistakes most often?",
    kind: "long_text",
    dimension: "operations",
    priority: 79,
    reason: "Error sources are unknown.",
  },
  {
    key: "one_fix",
    prompt: "If you could fix one thing next week, what would it be?",
    kind: "long_text",
    dimension: "operations",
    priority: 70,
    reason: "Priority improvement is unknown.",
  },
  {
    key: "disappearance_test",
    prompt:
      "If your most important tool or process disappeared tomorrow, what would happen?",
    kind: "long_text",
    dimension: "systems",
    priority: 72,
    reason: "Critical dependency is unknown.",
  },
];

function industryCandidates(memory: ConversationMemory): QuestionCandidate[] {
  const industry = memory.summary.industry;
  const extras: QuestionCandidate[] = [];

  if (industry === "manufacturing" || industry === "distribution") {
    extras.push(
      {
        key: "inventory_flow",
        prompt: "How does inventory flow from purchase to fulfillment?",
        kind: "long_text",
        dimension: "operations",
        priority: 93,
        reason: "Inventory flow is critical for this industry.",
      },
      {
        key: "purchasing_approvals",
        prompt: "How do purchasing approvals work?",
        kind: "long_text",
        dimension: "finance",
        priority: 92,
        reason: "Purchasing approvals are critical for this industry.",
      },
      {
        key: "production_planning",
        prompt: "How does production or replenishment planning work?",
        kind: "long_text",
        dimension: "production",
        priority: 92,
        reason: "Planning is critical for this industry.",
      },
    );
  }

  const profile = INDUSTRY_PROFILES.find((item) => item.id === industry);
  if (profile) {
    profile.starterQuestions.forEach((prompt, index) => {
      extras.push({
        key: `industry_${industry}_${index}`,
        prompt,
        kind: "long_text",
        dimension: index === 0 ? "sales" : "operations",
        priority: 86 - index,
        reason: `Industry lens for ${profile.label}.`,
      });
    });
  }

  return extras;
}

/**
 * Prefer unknown information over interesting information.
 * Never duplicate. Dig-deeper follow-ups outrank general discovery.
 */
export function planNextQuestion(
  memory: ConversationMemory,
): Question | null {
  const asked = new Set(memory.askedQuestionKeys);

  // 1) Highest-value queued follow-up
  const followUp = memory.followUpQueue.find((item) => !asked.has(item.key));
  if (followUp) {
    return candidateToQuestion(followUp);
  }

  // 2) Unknown dimensions first
  const uncovered = memory.score.dimensions
    .filter((dimension) => !dimension.covered)
    .sort((a, b) => a.confidence - b.confidence);

  const pool = [...industryCandidates(memory), ...CATALOG]
    .filter((candidate) => !asked.has(candidate.key))
    .sort((a, b) => b.priority - a.priority);

  for (const dimension of uncovered) {
    const match = pool.find((candidate) => candidate.dimension === dimension.id);
    if (match) return candidateToQuestion(match);
  }

  // 3) Any remaining high-priority unknown
  const next = pool[0];
  return next ? candidateToQuestion(next) : null;
}

function candidateToQuestion(candidate: QuestionCandidate): Question {
  return {
    id: createId(`q_${candidate.key}`),
    prompt: candidate.prompt,
    kind: candidate.kind,
    topic: candidate.key,
    questionKey: candidate.key,
    dimension: candidate.dimension as DiscoveryDimension,
    priority: candidate.priority,
    placeholder: candidate.placeholder ?? "Share what is true in practice…",
    helpText: candidate.reason,
  };
}

export function markQuestionAsked(
  memory: ConversationMemory,
  questionKey: string | undefined,
): ConversationMemory {
  if (!questionKey) return memory;
  return {
    ...memory,
    askedQuestionKeys: Array.from(
      new Set([...memory.askedQuestionKeys, questionKey]),
    ),
    followUpQueue: memory.followUpQueue.filter(
      (item) => item.key !== questionKey,
    ),
  };
}

export function formatThinkingPreamble(memory: ConversationMemory): string {
  const confidence = memory.summary.confidenceScore;
  const still = memory.score.stillNeed.slice(0, 3);
  const lines = [
    memory.summary.belief,
    "",
    `Confidence: ${confidence}%`,
  ];

  if (still.length > 0) {
    lines.push("", "Still need:", ...still.map((item) => `• ${item}`));
  }

  return lines.join("\n");
}
