import type {
  BrandEvidenceRef,
  BrandRecommendation,
  BusinessBlueprint,
  CompanyWorkspace,
  ExperienceDensity,
  ExperienceProfile,
  NotificationChannelPreference,
  RegionalFormatPreference,
} from "@/types";
import { collectFactBlob, evidenceSubset, knowledgeThemes } from "./evidence";

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

export function deriveExperienceProfile(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): ExperienceProfile {
  const factBlob = collectFactBlob(workspace);
  const consulting = workspace.conversationMemory?.consulting;
  const deptCount = blueprint.departments.length;
  const roleCount = workspace.solutionArchitecture?.roles.length ?? 0;
  const themes = knowledgeThemes(workspace);

  const strength =
    (workspace.meetings.length > 0 ? 0.25 : 0) +
    (deptCount > 0 ? 0.2 : 0) +
    (roleCount > 0 ? 0.15 : 0) +
    (consulting ? 0.2 : 0) +
    (themes.length > 0 ? 0.1 : 0);

  const employeeVision = deriveEmployeeVision(workspace, blueprint, factBlob, strength, evidence);
  const softwareExpectations = deriveSoftwareExpectations(workspace, blueprint, strength, evidence);
  const onboardingStyle = deriveOnboardingStyle(workspace, roleCount, strength, evidence);
  const density = deriveDensityPreference(workspace, strength, evidence);
  const regionalFormats = deriveRegionalFormats(workspace, factBlob, evidence);
  const notificationPreferences = deriveNotificationPreferences(workspace, blueprint, evidence);

  return {
    employeeExperienceVision: employeeVision,
    softwareExpectations: softwareExpectations,
    onboardingStyle: onboardingStyle,
    densityPreference: density,
    regionalFormats,
    notificationPreferences,
  };
}

function deriveEmployeeVision(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  factBlob: string,
  strength: number,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<string> {
  if (/shop floor|production|warehouse|field/i.test(factBlob)) {
    return recommendation(
      "Software should feel field-ready: large targets, minimal steps, works on shared devices.",
      Math.min(0.72, 0.4 + strength),
      "Inferred from operational and shop-floor language in discovery.",
      evidenceSubset(evidence, ["meeting", "memory", "blueprint"], 3),
    );
  }

  if (blueprint.departments.length >= 3) {
    return recommendation(
      `Employees across ${blueprint.departments.map((d) => d.name).join(", ")} need a shared system with role-appropriate views.`,
      Math.min(0.68, 0.38 + strength),
      "Inferred from blueprint department structure.",
      evidenceSubset(evidence, ["blueprint"], 3),
    );
  }

  if (strength < 0.25) {
    return recommendation<string>(
      null,
      0,
      "Employee experience vision requires department structure or operational discovery evidence.",
      [],
    );
  }

  return recommendation(
    "Calm, structured software that reduces manual handoffs and makes status visible.",
    Math.min(0.55, 0.28 + strength),
    "Default enterprise experience pattern from blueprint and discovery — low specificity.",
    evidenceSubset(evidence, ["blueprint", "memory"], 2),
  );
}

function deriveSoftwareExpectations(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  strength: number,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<string[]> {
  const expectations: string[] = [];
  const pains = blueprint.painPoints.map((p) => p.title.toLowerCase()).join(" ");

  if (/excel|spreadsheet/i.test(pains)) {
    expectations.push("Replace spreadsheet sprawl with durable records");
  }
  if (/whatsapp|chat|message/i.test(pains)) {
    expectations.push("Capture conversation history inside the system of record");
  }
  if (/manual|approval/i.test(pains)) {
    expectations.push("Clear approval paths with audit trail");
  }
  if (/verbal|whiteboard/i.test(pains)) {
    expectations.push("Visible status boards instead of verbal updates");
  }

  if (expectations.length === 0) {
    return recommendation<string[]>(
      null,
      0,
      "No software expectations inferred without evidenced pain points.",
      [],
    );
  }

  return recommendation(
    expectations.slice(0, 5),
    Math.min(0.75, 0.42 + strength),
    "Expectations derived from blueprint pain matrix — not aspirational features.",
    evidenceSubset(evidence, ["blueprint"], 3),
  );
}

function deriveOnboardingStyle(
  workspace: CompanyWorkspace,
  roleCount: number,
  strength: number,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<string> {
  if (roleCount >= 4) {
    return recommendation(
      "Role-based onboarding: each role sees only what they need on day one.",
      Math.min(0.7, 0.4 + strength),
      "Inferred from solution role count and multi-department blueprint.",
      evidenceSubset(evidence, ["solution", "blueprint"], 3),
    );
  }

  if (workspace.industry === "manufacturing") {
    return recommendation(
      "Hands-on walkthrough with shop-floor champions before broad rollout.",
      0.55,
      "Manufacturing onboarding pattern from industry classification.",
      evidenceSubset(evidence, ["industry"], 1),
    );
  }

  return recommendation<string>(
    null,
    0,
    "Onboarding style unknown until roles and departments are mapped.",
    [],
  );
}

function deriveDensityPreference(
  workspace: CompanyWorkspace,
  strength: number,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<ExperienceDensity> {
  const consulting = workspace.conversationMemory?.consulting;
  const techScore =
    consulting?.health.gauges.find((g) => g.id === "technology")?.score ?? null;

  if (workspace.industry === "manufacturing" || workspace.industry === "construction") {
    return recommendation<ExperienceDensity>(
      "comfortable",
      Math.min(0.65, 0.35 + strength),
      "Field and plant users benefit from larger touch targets and readable density.",
      evidenceSubset(evidence, ["industry"], 2),
    );
  }

  if (techScore != null && techScore >= 0.7) {
    return recommendation<ExperienceDensity>(
      "compact",
      0.58,
      "Higher technology maturity suggests power-user tolerance for information density.",
      evidenceSubset(evidence, ["consulting"], 2),
    );
  }

  return recommendation<ExperienceDensity>(
    strength >= 0.3 ? "comfortable" : "unknown",
    strength >= 0.3 ? 0.45 : 0,
    strength >= 0.3
      ? "Default comfortable density — no explicit user preference captured."
      : "Density preference unknown.",
    evidenceSubset(evidence, ["consulting", "industry"], 2),
  );
}

function deriveRegionalFormats(
  workspace: CompanyWorkspace,
  factBlob: string,
  evidence: BrandEvidenceRef[],
): RegionalFormatPreference {
  const spanishHint = /español|spanish|méxico|mexico|latam|colombia|argentina/i.test(
    factBlob,
  );
  const usHint = /united states|u\.s\.|usd|\bdollar/i.test(factBlob);

  const language = spanishHint
    ? { value: "es", confidence: 0.62, reasoning: "Spanish language hints in discovery or knowledge.", evidence: evidenceSubset(evidence, ["memory", "knowledge", "meeting"], 2) }
    : usHint
      ? { value: "en-US", confidence: 0.55, reasoning: "English/US hints in discovery.", evidence: evidenceSubset(evidence, ["memory", "meeting"], 2) }
      : { value: null, confidence: 0, reasoning: "Language not inferred — will follow tenant default.", evidence: [] as BrandEvidenceRef[] };

  return {
    language,
    timezone: { value: null, confidence: 0, reasoning: "Timezone not inferred without geographic evidence.", evidence: [] },
    dateFormat: spanishHint
      ? { value: "DD/MM/YYYY", confidence: 0.5, reasoning: "Regional date format inferred from Spanish/LATAM context.", evidence: language.evidence }
      : { value: null, confidence: 0, reasoning: "Date format unknown.", evidence: [] },
    numberFormat: { value: null, confidence: 0, reasoning: "Number format unknown.", evidence: [] },
    currency: usHint
      ? { value: "USD", confidence: 0.5, reasoning: "Currency hint from discovery.", evidence: language.evidence }
      : { value: null, confidence: 0, reasoning: "Currency unknown.", evidence: [] },
  };
}

function deriveNotificationPreferences(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  evidence: BrandEvidenceRef[],
): NotificationChannelPreference[] {
  const hasApprovals = blueprint.operatingRules.some((r) =>
    /approv/i.test(r.statement),
  );
  const channels: NotificationChannelPreference[] = [
    {
      channel: "in_app",
      enabled: hasApprovals ? true : null,
      confidence: hasApprovals ? 0.6 : 0,
      reasoning: hasApprovals
        ? "Approval workflows benefit from in-app notifications."
        : "In-app notifications not inferred.",
      evidence: hasApprovals ? evidenceSubset(evidence, ["blueprint"], 2) : [],
    },
    {
      channel: "email",
      enabled: workspace.meetings.length > 0 ? true : null,
      confidence: workspace.meetings.length > 0 ? 0.45 : 0,
      reasoning: "Email assumed for async summaries when discovery exists — not confirmed.",
      evidence: evidenceSubset(evidence, ["meeting"], 1),
    },
    {
      channel: "sms",
      enabled: null,
      confidence: 0,
      reasoning: "SMS not inferred without field-service or mobile-first evidence.",
      evidence: [],
    },
    {
      channel: "push",
      enabled: null,
      confidence: 0,
      reasoning: "Push not inferred without mobile app scope.",
      evidence: [],
    },
  ];
  return channels;
}
