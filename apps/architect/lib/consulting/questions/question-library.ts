import type {
  DiscoveryDimension,
  QuestionCandidate,
  QuestionEstimatedImpact,
  QuestionKind,
} from "@/types";

/**
 * Senior-consultant question library (Mission 10).
 * Prompts are easy executive Spanish to match product voice.
 * Internal keys / field names stay English.
 */

export type QuestionIntent =
  | "evidence_gap"
  | "consequence"
  | "contradiction"
  | "hypothesis_validation"
  | "department_balance"
  | "follow_up"
  | "discovery";

export type ThinkingMode = "executive" | "operational" | "balanced";

export interface LibraryQuestion extends QuestionCandidate {
  expectedLearning: string;
  businessValue: string;
  confidenceGain: number;
  estimatedImpact: QuestionEstimatedImpact;
  intent: QuestionIntent;
  thinkingMode: ThinkingMode;
  /** Soft triggers — used by consequence / topic engines. */
  triggers?: ReadonlyArray<"excel" | "whatsapp" | "paper" | "systems_known">;
}

function q(
  partial: Omit<LibraryQuestion, "kind"> & { kind?: QuestionKind },
): LibraryQuestion {
  return {
    kind: partial.kind ?? "long_text",
    ...partial,
  };
}

/** Consequence-first follow-ups when informal tools appear. */
export const CONSEQUENCE_LIBRARY: LibraryQuestion[] = [
  q({
    key: "excel_why_exists",
    prompt:
      "Mencionaron Excel — ¿por qué sigue siendo indispensable en el día a día?",
    dimension: "systems",
    priority: 99,
    reason:
      "Entender por qué Excel persiste revela el proceso real mejor que inventariar archivos.",
    expectedLearning:
      "Función de negocio que Excel cubre (control, velocidad, confianza, excepción).",
    businessValue:
      "Define si el riesgo es herramienta, proceso o propiedad del conocimiento.",
    confidenceGain: 14,
    estimatedImpact: "critical",
    intent: "consequence",
    thinkingMode: "executive",
    triggers: ["excel"],
    followUpOf: "excel",
    placeholder: "Por ejemplo: es la única fuente de verdad, o es más rápido…",
  }),
  q({
    key: "excel_business_risk",
    prompt:
      "Si Excel fallara mañana en el proceso más crítico, ¿qué decisión o entrega se detiene primero?",
    dimension: "operations",
    priority: 97,
    reason: "Consecuencia de negocio antes que catálogo de hojas.",
    expectedLearning: "Dependencia crítica y costo de caída.",
    businessValue: "Prioriza digitalización por impacto, no por volumen de archivos.",
    confidenceGain: 12,
    estimatedImpact: "critical",
    intent: "consequence",
    thinkingMode: "executive",
    triggers: ["excel"],
    followUpOf: "excel",
  }),
  q({
    key: "excel_ownership_accountability",
    prompt:
      "¿Quién responde si una cifra de Excel está mal — y quién se entera primero?",
    dimension: "team",
    priority: 96,
    reason: "Propiedad y accountability explican por qué el Excel no se abandona.",
    expectedLearning: "Dueño real, rutas de escalamiento y riesgo de persona única.",
    businessValue: "Detecta conocimiento tribal y puntos únicos de falla.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "consequence",
    thinkingMode: "operational",
    triggers: ["excel"],
    followUpOf: "excel",
  }),
  q({
    key: "whatsapp_why_channel",
    prompt:
      "Mencionaron WhatsApp — ¿qué hace ahí que no pueden hacer en otro canal?",
    dimension: "customers",
    priority: 99,
    reason: "El porqué del canal importa más que contar números.",
    expectedLearning: "Job-to-be-done del mensajero (velocidad, confianza, hábito del cliente).",
    businessValue: "Separa necesidad de cliente vs. atajo operativo riesgoso.",
    confidenceGain: 13,
    estimatedImpact: "critical",
    intent: "consequence",
    thinkingMode: "executive",
    triggers: ["whatsapp"],
    followUpOf: "whatsapp",
  }),
  q({
    key: "whatsapp_continuity_risk",
    prompt:
      "Si la persona que atiende WhatsApp no estuviera una semana, ¿cómo seguirían las conversaciones?",
    dimension: "sales",
    priority: 97,
    reason: "Continuidad comercial es la consecuencia de negocio del canal.",
    expectedLearning: "Fragilidad del historial y cobertura del equipo.",
    businessValue: "Cuantifica riesgo de pérdida de pipeline y clientes.",
    confidenceGain: 12,
    estimatedImpact: "critical",
    intent: "consequence",
    thinkingMode: "operational",
    triggers: ["whatsapp"],
    followUpOf: "whatsapp",
  }),
  q({
    key: "paper_business_reason",
    prompt:
      "El papel sigue en el proceso — ¿qué falla si lo quitan mañana: cumplimiento, costumbre u operación offline?",
    dimension: "operations",
    priority: 98,
    reason: "Distinguir causa raíz evita digitalizar ruido.",
    expectedLearning: "Motivo real del papel (legal, hábito, offline, control).",
    businessValue: "Enfoca automatización donde el papel es fricción, no requisito.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "consequence",
    thinkingMode: "balanced",
    triggers: ["paper"],
    followUpOf: "paper",
  }),
];

/** Soft contradiction clarifications (never accusatory). */
export const CONTRADICTION_LIBRARY: LibraryQuestion[] = [
  q({
    key: "clarify_system_vs_spreadsheet",
    prompt:
      "Para precisarlo: cuando dicen que está en el sistema, ¿qué parte sigue viviendo en Excel día a día?",
    dimension: "systems",
    priority: 95,
    reason: "Hay señales mixtas entre sistema formal y hojas de cálculo.",
    expectedLearning: "Límite real entre sistema de registro y trabajo paralelo.",
    businessValue: "Evita diseñar sobre una fuente de verdad inexistente.",
    confidenceGain: 15,
    estimatedImpact: "critical",
    intent: "contradiction",
    thinkingMode: "balanced",
  }),
  q({
    key: "clarify_process_vs_adhoc",
    prompt:
      "Cuando el proceso “depende de quién”, ¿en qué paso se vuelve más variable?",
    dimension: "operations",
    priority: 94,
    reason: "Proceso declarado y ejecución ad hoc pueden no alinearse.",
    expectedLearning: "Dónde la variabilidad destruye predictibilidad.",
    businessValue: "Prioriza estandarización donde duele el negocio.",
    confidenceGain: 12,
    estimatedImpact: "high",
    intent: "contradiction",
    thinkingMode: "operational",
  }),
  q({
    key: "clarify_visibility_gap",
    prompt:
      "¿Qué puede ver hoy la dirección en tiempo real — y qué solo se entera al final del mes?",
    dimension: "finance",
    priority: 93,
    reason: "Afirmaciones de visibilidad merecen definición operativa.",
    expectedLearning: "Brecha entre narrativa ejecutiva y datos disponibles.",
    businessValue: "Ancla reportes y tableros a decisiones reales.",
    confidenceGain: 12,
    estimatedImpact: "high",
    intent: "contradiction",
    thinkingMode: "executive",
  }),
  q({
    key: "clarify_team_capacity",
    prompt:
      "En el trabajo más crítico, ¿cuántas personas podrían cubrirlo mañana sin entrenamiento especial?",
    dimension: "team",
    priority: 93,
    reason: "Capacidad de equipo vs. concentración en una persona.",
    expectedLearning: "Cobertura real y riesgo de persona única.",
    businessValue: "Protege continuidad operativa y comercial.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "contradiction",
    thinkingMode: "executive",
  }),
];

/** Hypothesis validation — confirm or kill active beliefs. */
export const HYPOTHESIS_LIBRARY: LibraryQuestion[] = [
  q({
    key: "validate_growth_constraint",
    prompt:
      "Si el volumen creciera un 30% el próximo trimestre, ¿qué se rompería primero?",
    dimension: "operations",
    priority: 88,
    reason: "Validar la hipótesis de cuello de botella de crecimiento.",
    expectedLearning: "Constraint verdadero bajo estrés de escala.",
    businessValue: "Invierte en el cuello de botella correcto.",
    confidenceGain: 13,
    estimatedImpact: "critical",
    intent: "hypothesis_validation",
    thinkingMode: "executive",
  }),
  q({
    key: "validate_software_as_root",
    prompt:
      "Si tuvieran el software perfecto mañana, ¿qué problema del negocio seguiría igual?",
    dimension: "systems",
    priority: 87,
    reason: "Separar síntoma de herramienta vs. causa de proceso/personas.",
    expectedLearning: "Qué no se resuelve solo con software.",
    businessValue: "Evita comprar tecnología que no mueve el P&L.",
    confidenceGain: 14,
    estimatedImpact: "critical",
    intent: "hypothesis_validation",
    thinkingMode: "executive",
    triggers: ["systems_known"],
  }),
  q({
    key: "validate_manual_cost",
    prompt:
      "¿Cuántas horas a la semana estima el equipo en trabajo manual que no debería existir?",
    dimension: "operations",
    priority: 86,
    reason: "Validar el tamaño del costo operativo manual.",
    expectedLearning: "Magnitud del desperdicio operativo.",
    businessValue: "Justifica quick wins con número, no con intuición.",
    confidenceGain: 10,
    estimatedImpact: "high",
    intent: "hypothesis_validation",
    thinkingMode: "operational",
  }),
];

/** Executive framing — decisions, money, risk, ownership. */
export const EXECUTIVE_LIBRARY: LibraryQuestion[] = [
  q({
    key: "exec_decision_latency",
    prompt:
      "¿Qué decisión importante se toma hoy con información incompleta o tarde?",
    dimension: "finance",
    priority: 85,
    reason: "El valor ejecutivo está en decisiones, no en inventario de procesos.",
    expectedLearning: "Decisiones de alto valor con lag de información.",
    businessValue: "Conecta discovery con impacto en dirección.",
    confidenceGain: 12,
    estimatedImpact: "critical",
    intent: "discovery",
    thinkingMode: "executive",
  }),
  q({
    key: "exec_cash_friction",
    prompt:
      "¿Dónde se frena el efectivo — en cotizar, entregar, facturar o cobrar?",
    dimension: "finance",
    priority: 84,
    reason: "Mapear fricción de caja es comprensión de negocio de primer orden.",
    expectedLearning: "Etapa del ciclo de caja con mayor fricción.",
    businessValue: "Prioriza automatización por liquidez, no por moda.",
    confidenceGain: 13,
    estimatedImpact: "critical",
    intent: "discovery",
    thinkingMode: "executive",
  }),
];

/** Operational framing — who does what, handoffs, exceptions. */
export const OPERATIONAL_LIBRARY: LibraryQuestion[] = [
  q({
    key: "ops_handoff_break",
    prompt:
      "En un pedido típico, ¿en qué traspaso entre personas se pierde más tiempo o contexto?",
    dimension: "operations",
    priority: 84,
    reason: "Los traspasos revelan el proceso real.",
    expectedLearning: "Handoff frágil y pérdida de contexto.",
    businessValue: "Diseña módulos donde el trabajo ya se rompe.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "discovery",
    thinkingMode: "operational",
  }),
  q({
    key: "ops_exception_path",
    prompt:
      "Cuando un pedido o aprobación es “especial”, ¿quién improvisa y con qué criterio?",
    dimension: "operations",
    priority: 83,
    reason: "Las excepciones suelen ser el negocio real.",
    expectedLearning: "Ruta de excepción y criterio informal.",
    businessValue: "Evita diseñar solo el camino feliz.",
    confidenceGain: 10,
    estimatedImpact: "high",
    intent: "discovery",
    thinkingMode: "operational",
  }),
];

/** Department-balance fillers when a dimension is starved. */
export const DEPARTMENT_BALANCE_LIBRARY: LibraryQuestion[] = [
  q({
    key: "balance_finance_visibility",
    prompt:
      "¿Cómo se entera finanzas de lo que ya se vendió u operó — al momento o al consolidar?",
    dimension: "finance",
    priority: 82,
    reason: "Finanzas está poco cubierta frente a otras áreas.",
    expectedLearning: "Latencia entre operación y control financiero.",
    businessValue: "Cierra el ciclo comercial–operativo–financiero.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "department_balance",
    thinkingMode: "balanced",
  }),
  q({
    key: "balance_sales_reality",
    prompt:
      "En ventas, ¿qué parte del trabajo es cazar demanda y qué parte es administrar pedidos?",
    dimension: "sales",
    priority: 82,
    reason: "Ventas necesita más evidencia para equilibrar el mapa.",
    expectedLearning: "Mix hunting vs. order admin.",
    businessValue: "Evita sobrediseñar CRM si el dolor es fulfillment.",
    confidenceGain: 10,
    estimatedImpact: "high",
    intent: "department_balance",
    thinkingMode: "balanced",
  }),
  q({
    key: "balance_team_roles",
    prompt:
      "¿Quién tiene la última palabra cuando operaciones y ventas discrepan sobre un pedido?",
    dimension: "team",
    priority: 81,
    reason: "Gobernanza de equipo aún poco clara.",
    expectedLearning: "Autoridad de resolución de conflictos.",
    businessValue: "Aclara roles antes de codificar flujos.",
    confidenceGain: 9,
    estimatedImpact: "medium",
    intent: "department_balance",
    thinkingMode: "executive",
  }),
  q({
    key: "balance_customer_promise",
    prompt:
      "¿Qué promesa al cliente es la más difícil de cumplir de forma consistente?",
    dimension: "customers",
    priority: 81,
    reason: "La voz del cliente aún es un vacío de evidencia.",
    expectedLearning: "Promesa frágil y causa raíz operativa.",
    businessValue: "Ancla mejoras a retención y reputación.",
    confidenceGain: 10,
    estimatedImpact: "high",
    intent: "department_balance",
    thinkingMode: "executive",
  }),
  q({
    key: "balance_production_plan",
    prompt:
      "¿La producción o reposición se planifica con demanda real, con stock, o con intuición?",
    dimension: "production",
    priority: 82,
    reason: "Producción/reposición necesita más claridad en esta industria.",
    expectedLearning: "Base de planificación y calidad de señal de demanda.",
    businessValue: "Reduce quiebres y exceso de inventario.",
    confidenceGain: 11,
    estimatedImpact: "high",
    intent: "department_balance",
    thinkingMode: "operational",
  }),
];

export const FULL_CONSULTANT_LIBRARY: LibraryQuestion[] = [
  ...CONSEQUENCE_LIBRARY,
  ...CONTRADICTION_LIBRARY,
  ...HYPOTHESIS_LIBRARY,
  ...EXECUTIVE_LIBRARY,
  ...OPERATIONAL_LIBRARY,
  ...DEPARTMENT_BALANCE_LIBRARY,
];

export function libraryByKey(key: string): LibraryQuestion | undefined {
  return FULL_CONSULTANT_LIBRARY.find((item) => item.key === key);
}

export function enrichCandidate(
  candidate: QuestionCandidate,
  extras?: Partial<LibraryQuestion>,
): LibraryQuestion {
  const fromLib = libraryByKey(candidate.key);
  return {
    kind: candidate.kind,
    key: candidate.key,
    prompt: candidate.prompt,
    dimension: candidate.dimension,
    priority: candidate.priority,
    reason: candidate.reason,
    followUpOf: candidate.followUpOf,
    placeholder: candidate.placeholder,
    expectedLearning:
      extras?.expectedLearning ??
      fromLib?.expectedLearning ??
      candidate.expectedLearning ??
      "Mayor claridad sobre este aspecto del negocio.",
    businessValue:
      extras?.businessValue ??
      fromLib?.businessValue ??
      candidate.businessValue ??
      "Reduce incertidumbre en el diseño de la solución.",
    confidenceGain:
      extras?.confidenceGain ??
      fromLib?.confidenceGain ??
      candidate.confidenceGain ??
      Math.min(12, Math.max(4, Math.round(candidate.priority / 10))),
    estimatedImpact:
      extras?.estimatedImpact ??
      fromLib?.estimatedImpact ??
      candidate.estimatedImpact ??
      (candidate.priority >= 90
        ? "critical"
        : candidate.priority >= 80
          ? "high"
          : "medium"),
    intent: extras?.intent ?? fromLib?.intent ?? "discovery",
    thinkingMode: extras?.thinkingMode ?? fromLib?.thinkingMode ?? "balanced",
    triggers: extras?.triggers ?? fromLib?.triggers,
  };
}

export function dimensionOfIntent(intent: QuestionIntent): DiscoveryDimension | null {
  if (intent === "consequence") return "systems";
  if (intent === "contradiction") return null;
  return null;
}
