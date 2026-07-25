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
    tone: "Direct, operational, no-nonsense",
    traits: ["Practical", "Reliable", "Hands-on"],
    positioning: "Operations-first mid-market manufacturer",
  },
  healthcare: {
    tone: "Calm, precise, trustworthy",
    traits: ["Careful", "Compliant", "Human-centered"],
    positioning: "Regulated care organization",
  },
  distribution: {
    tone: "Fast, clear, service-oriented",
    traits: ["Responsive", "Logistics-minded", "Customer-aware"],
    positioning: "Regional distribution operator",
  },
  retail: {
    tone: "Approachable, energetic, customer-facing",
    traits: ["Friendly", "Visual", "Promotional"],
    positioning: "Customer-facing retail brand",
  },
  services: {
    tone: "Professional, consultative, clear",
    traits: ["Expert", "Structured", "Partnership-oriented"],
    positioning: "Professional services firm",
  },
  construction: {
    tone: "Grounded, safety-conscious, field-ready",
    traits: ["Rugged", "Safety-first", "Project-driven"],
    positioning: "Construction and field operations",
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
        `Inferred from ${industry} industry patterns and discovery context — not stated explicitly by the client.`,
        industryEvidence,
      )
    : recommendation<string>(
        null,
        0,
        "Insufficient evidence to infer brand voice. Tagline and tone will emerge from brand guidelines or deeper discovery.",
        [],
      );

  const personalityTraits = industryHint
    ? recommendation(
        industryHint.traits,
        Math.min(0.68, 0.3 + evidenceStrength),
        "Personality traits inferred from industry and operational context.",
        industryEvidence,
      )
    : recommendation<string[]>(
        null,
        0,
        "No personality traits inferred without industry classification or brand evidence.",
        [],
      );

  const positioning = industryHint
    ? recommendation(
        `${workspace.companyName} — ${industryHint.positioning}`,
        Math.min(0.7, 0.32 + evidenceStrength),
        "Positioning derived from company name, industry, and blueprint departments.",
        evidenceSubset(evidence, ["blueprint", "industry", "memory"], 4),
      )
    : recommendation<string>(
        null,
        0,
        "Industry positioning unknown until industry is classified.",
        [],
      );

  const differentiation = deriveDifferentiation(workspace, blueprint, factBlob, evidence);

  const logos: LogoAssetRef[] = [
    {
      kind: "primary",
      status: "unknown",
      url: null,
      notes: "Awaiting logo upload or brand guidelines intake.",
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
      "Design your company before you build software.",
      Math.min(0.75, 0.45 + strength),
      "Inferred from discovery language about operating systems and structured design.",
      evidenceSubset(evidence, ["meeting", "memory", "knowledge"], 3),
    );
  }

  if (workspace.knowledge?.summary && strength >= 0.35) {
    const short = workspace.knowledge.summary.split(".")[0]?.trim();
    if (short && short.length < 120) {
      return recommendation(
        short,
        Math.min(0.62, 0.35 + strength),
        "Derived from knowledge summary — may reflect operational focus rather than marketing tagline.",
        evidenceSubset(evidence, ["knowledge"], 2),
      );
    }
  }

  return recommendation<string>(
    null,
    0,
    "No tagline inferred. Client has not provided brand guidelines or explicit positioning language.",
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
      `Differentiation should emphasize solving ${pains.join(" and ")} with durable workflows.`,
      0.58,
      "Inferred from evidenced pain points — operational differentiation, not marketing claim.",
      evidenceSubset(evidence, ["blueprint", "meeting"], 3),
    );
  }

  if (/family-owned|regional|mid-market/i.test(factBlob)) {
    return recommendation(
      "Emphasize trusted, long-term partnership over generic enterprise software.",
      0.52,
      "Inferred from discovery facts about company scale and ownership.",
      evidenceSubset(evidence, ["meeting", "memory"], 2),
    );
  }

  return recommendation<string>(
    null,
    0,
    "Differentiation not inferred without pain points, brand language, or competitive context.",
    [],
  );
}
