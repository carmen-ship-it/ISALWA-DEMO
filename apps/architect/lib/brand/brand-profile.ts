import { industryLabel } from "@/lib/reasoning/industry/detect";
import type {
  BrandEvidenceRef,
  BrandProfile,
  BrandRecommendation,
  BusinessBlueprint,
  CompanyWorkspace,
  LogoAssetRef,
} from "@/types";
import { collectFactBlob, evidenceSubset } from "./evidence";

const INDUSTRY_VOICE: Record<string, { tone: string; traits: string[]; positioning: string }> = {
  manufacturing: {
    tone: "Directo, operativo, sin rodeos",
    traits: ["Práctico", "Confiable", "Orientado a la acción"],
    positioning: "Fabricante de mercado medio con enfoque operativo",
  },
  healthcare: {
    tone: "Calmado, preciso, confiable",
    traits: ["Cuidadoso", "Cumplido", "Centrado en las personas"],
    positioning: "Organización de salud regulada",
  },
  distribution: {
    tone: "Rápido, claro, orientado al servicio",
    traits: ["Responsivo", "Enfocado en logística", "Atento al cliente"],
    positioning: "Operador de distribución regional",
  },
  retail: {
    tone: "Cercano, enérgico, orientado al cliente",
    traits: ["Amigable", "Visual", "Promocional"],
    positioning: "Marca de retail orientada al cliente",
  },
  services: {
    tone: "Profesional, consultivo, claro",
    traits: ["Experto", "Estructurado", "Orientado a la relación"],
    positioning: "Firma de servicios profesionales",
  },
  construction: {
    tone: "Sólido, consciente de la seguridad, listo para campo",
    traits: ["Resistente", "Seguridad primero", "Orientado a proyectos"],
    positioning: "Operación de construcción y campo",
  },
};

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

export function deriveBrandProfile(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): BrandProfile {
  const industry = workspace.industry;
  const industryHint = INDUSTRY_VOICE[industry];
  const factBlob = collectFactBlob(workspace);
  const hasMeetings = workspace.meetings.length > 0;
  const hasKnowledge = (workspace.knowledge?.assets.length ?? 0) > 0;
  const hasFacts = (workspace.conversationMemory?.knownFacts.length ?? 0) > 0;

  const evidenceStrength =
    (hasMeetings ? 0.25 : 0) +
    (hasKnowledge ? 0.2 : 0) +
    (hasFacts ? 0.2 : 0) +
    (blueprint.departments.length > 0 ? 0.15 : 0) +
    (industry !== "unknown" ? 0.2 : 0);

  const industryEvidence = evidenceSubset(evidence, ["industry", "blueprint"], 3);

  const tagline = deriveTagline(workspace, factBlob, evidenceStrength, evidence);
  const voiceTone = industryHint
    ? recommendation(
        industryHint.tone,
        Math.min(0.72, 0.35 + evidenceStrength),
        `Inferido de los patrones de la industria de ${industryLabel(industry)} y el contexto del descubrimiento — no declarado explícitamente por el cliente.`,
        industryEvidence,
      )
    : recommendation<string>(
        null,
        0,
        "Evidencia insuficiente para inferir la voz de marca. El lema y el tono surgirán de los lineamientos de marca o de un descubrimiento más profundo.",
        [],
      );

  const personalityTraits = industryHint
    ? recommendation(
        industryHint.traits,
        Math.min(0.68, 0.3 + evidenceStrength),
        "Rasgos de personalidad inferidos de la industria y el contexto operativo.",
        industryEvidence,
      )
    : recommendation<string[]>(
        null,
        0,
        "No se infirieron rasgos de personalidad sin clasificación de industria o evidencia de marca.",
        [],
      );

  const positioning = industryHint
    ? recommendation(
        `${workspace.companyName} — ${industryHint.positioning}`,
        Math.min(0.7, 0.32 + evidenceStrength),
        "Posicionamiento derivado del nombre de la empresa, la industria y los departamentos del blueprint.",
        evidenceSubset(evidence, ["blueprint", "industry", "memory"], 4),
      )
    : recommendation<string>(
        null,
        0,
        "El posicionamiento de industria se desconoce hasta clasificar la industria.",
        [],
      );

  const differentiation = deriveDifferentiation(workspace, blueprint, factBlob, evidence);

  const logos: LogoAssetRef[] = [
    {
      kind: "primary",
      status: "unknown",
      url: null,
      notes: "En espera de carga de logotipo o lineamientos de marca.",
      confidence: 0,
    },
    {
      kind: "mark",
      status: "unknown",
      url: null,
      notes: null,
      confidence: 0,
    },
    {
      kind: "wordmark",
      status: "unknown",
      url: null,
      notes: null,
      confidence: 0,
    },
    {
      kind: "favicon",
      status: "unknown",
      url: null,
      notes: null,
      confidence: 0,
    },
  ];

  return {
    companyDisplayName: workspace.companyName,
    tagline,
    voiceTone,
    personalityTraits,
    industryPositioning: positioning,
    logos,
    differentiation,
  };
}

function deriveTagline(
  workspace: CompanyWorkspace,
  factBlob: string,
  strength: number,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<string> {
  if (/operating system|os for|builds operating/i.test(factBlob)) {
    return recommendation(
      "Diseñe su empresa antes de construir el software.",
      Math.min(0.75, 0.45 + strength),
      "Inferido del lenguaje del descubrimiento sobre sistemas operativos y diseño estructurado.",
      evidenceSubset(evidence, ["meeting", "memory", "knowledge"], 3),
    );
  }

  if (workspace.knowledge?.summary && strength >= 0.35) {
    const short = workspace.knowledge.summary.split(".")[0]?.trim();
    if (short && short.length < 120) {
      return recommendation(
        short,
        Math.min(0.62, 0.35 + strength),
        "Derivado del resumen de conocimiento — puede reflejar el enfoque operativo más que un lema de marketing.",
        evidenceSubset(evidence, ["knowledge"], 2),
      );
    }
  }

  return recommendation<string>(
    null,
    0,
    "No se infirió un lema. El cliente no ha proporcionado lineamientos de marca ni lenguaje de posicionamiento explícito.",
    [],
  );
}

function deriveDifferentiation(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  factBlob: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<string> {
  const pains = blueprint.painPoints.slice(0, 2).map((p) => p.title);
  if (pains.length > 0 && workspace.meetings.length > 0) {
    return recommendation(
      `La diferenciación debe enfatizar resolver ${pains.join(" y ")} con flujos de trabajo duraderos.`,
      0.58,
      "Inferido de puntos de dolor con evidencia — diferenciación operativa, no un argumento de marketing.",
      evidenceSubset(evidence, ["blueprint", "meeting"], 3),
    );
  }

  if (/family-owned|regional|mid-market/i.test(factBlob)) {
    return recommendation(
      "Enfatizar una relación de confianza y largo plazo por encima del software empresarial genérico.",
      0.52,
      "Inferido de hechos del descubrimiento sobre la escala y propiedad de la empresa.",
      evidenceSubset(evidence, ["meeting", "memory"], 2),
    );
  }

  return recommendation<string>(
    null,
    0,
    "No se infirió diferenciación sin puntos de dolor, lenguaje de marca o contexto competitivo.",
    [],
  );
}
