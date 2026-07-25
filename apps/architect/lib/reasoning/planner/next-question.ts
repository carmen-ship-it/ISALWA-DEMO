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
    prompt: "¿Cómo funcionan hoy las ventas, del primer contacto al pedido cerrado?",
    kind: "long_text",
    dimension: "sales",
    priority: 90,
    reason: "Aún no conocemos cómo venden.",
    placeholder: "Cuénteme una venta típica…",
  },
  {
    key: "customer_contact",
    prompt: "¿Cómo lo contactan los clientes día a día?",
    kind: "long_text",
    dimension: "customers",
    priority: 88,
    reason: "Aún no conocemos los canales de contacto.",
  },
  {
    key: "customer_count",
    prompt: "¿Cuántos clientes activos atienden, aproximadamente?",
    kind: "text",
    dimension: "customers",
    priority: 84,
    reason: "Aún no conocemos la escala de clientes.",
  },
  {
    key: "geography",
    prompt: "¿Dónde operan — ciudades, regiones o países?",
    kind: "text",
    dimension: "geography",
    priority: 82,
    reason: "Aún no conocemos la geografía.",
  },
  {
    key: "team_structure",
    prompt: "¿Cómo está estructurado hoy el equipo comercial u operativo?",
    kind: "long_text",
    dimension: "team",
    priority: 86,
    reason: "Aún no conocemos la estructura del equipo.",
    placeholder: "Roles, tamaño del equipo, quién responde por qué…",
  },
  {
    key: "order_intake",
    prompt: "¿Cómo reciben los pedidos?",
    kind: "long_text",
    dimension: "operations",
    priority: 87,
    reason: "Aún no conocemos la recepción de pedidos.",
  },
  {
    key: "bottlenecks",
    prompt: "¿Qué es lo que más frena al equipo en una semana normal?",
    kind: "long_text",
    dimension: "operations",
    priority: 85,
    reason: "Aún no conocemos los cuellos de botella.",
  },
  {
    key: "finance_process",
    prompt: "¿Cómo funcionan hoy la facturación, el cobro y las aprobaciones financieras?",
    kind: "long_text",
    dimension: "finance",
    priority: 80,
    reason: "Aún no conocemos el proceso financiero.",
  },
  {
    key: "approvals",
    prompt: "¿Dónde se traban las aprobaciones y quién debe decir que sí?",
    kind: "long_text",
    dimension: "finance",
    priority: 81,
    reason: "Aún no conocemos quién aprueba.",
  },
  {
    key: "production_planning",
    prompt: "¿Cómo funciona hoy la planificación de producción?",
    kind: "long_text",
    dimension: "production",
    priority: 89,
    reason: "Aún no conocemos la planificación de producción.",
  },
  {
    key: "inventory_flow",
    prompt: "¿Cómo fluye el inventario desde la compra hasta la entrega?",
    kind: "long_text",
    dimension: "operations",
    priority: 91,
    reason: "Aún no conocemos el flujo de inventario.",
  },
  {
    key: "purchasing_approvals",
    prompt: "¿Cómo funcionan las aprobaciones de compra?",
    kind: "long_text",
    dimension: "finance",
    priority: 88,
    reason: "Aún no conocemos las aprobaciones de compra.",
  },
  {
    key: "current_software",
    prompt: "¿Qué software usan hoy para operar el negocio?",
    kind: "long_text",
    dimension: "systems",
    priority: 83,
    reason: "Aún no conocemos los sistemas actuales.",
  },
  {
    key: "information_storage",
    prompt: "¿Dónde se guarda hoy la información importante?",
    kind: "long_text",
    dimension: "systems",
    priority: 84,
    reason: "Aún no conocemos el sistema de registro.",
  },
  {
    key: "mistakes",
    prompt: "¿Qué causa errores con más frecuencia?",
    kind: "long_text",
    dimension: "operations",
    priority: 79,
    reason: "Aún no conocemos las fuentes de error.",
  },
  {
    key: "one_fix",
    prompt: "Si pudieran arreglar una sola cosa la próxima semana, ¿qué sería?",
    kind: "long_text",
    dimension: "operations",
    priority: 70,
    reason: "Aún no conocemos la mejora prioritaria.",
  },
  {
    key: "disappearance_test",
    prompt:
      "Si mañana desapareciera su herramienta o proceso más importante, ¿qué pasaría?",
    kind: "long_text",
    dimension: "systems",
    priority: 72,
    reason: "Aún no conocemos la dependencia crítica.",
  },
];

function industryCandidates(memory: ConversationMemory): QuestionCandidate[] {
  const industry = memory.summary.industry;
  const extras: QuestionCandidate[] = [];

  if (industry === "manufacturing" || industry === "distribution") {
    extras.push(
      {
        key: "inventory_flow",
        prompt: "¿Cómo fluye el inventario desde la compra hasta la entrega?",
        kind: "long_text",
        dimension: "operations",
        priority: 93,
        reason: "El flujo de inventario es crítico en esta industria.",
      },
      {
        key: "purchasing_approvals",
        prompt: "¿Cómo funcionan las aprobaciones de compra?",
        kind: "long_text",
        dimension: "finance",
        priority: 92,
        reason: "Las aprobaciones de compra son críticas en esta industria.",
      },
      {
        key: "production_planning",
        prompt: "¿Cómo funciona la planificación de producción o reposición?",
        kind: "long_text",
        dimension: "production",
        priority: 92,
        reason: "La planificación es crítica en esta industria.",
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
        reason: `Enfoque de industria: ${profile.label}.`,
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

  // 2) Unknown applicable dimensions first
  const uncovered = memory.score.dimensions
    .filter(
      (dimension) => dimension.applicable !== false && !dimension.covered,
    )
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
    placeholder: candidate.placeholder ?? "Cuéntenos cómo es en la práctica…",
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
    `Estimación basada en la entrevista: ${confidence}%`,
  ];

  if (still.length > 0) {
    lines.push("", "Aún necesitamos:", ...still.map((item) => `• ${item}`));
  }

  return lines.join("\n");
}
