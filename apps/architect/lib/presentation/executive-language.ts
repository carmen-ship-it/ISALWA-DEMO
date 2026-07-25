/**
 * Presentation-only helpers for executive-facing workspace copy.
 * Does not alter engine outputs — maps raw scores/phrases for display.
 */

export type StrengthBand = "High" | "Medium" | "Low" | "Emerging";

export type CoverageBand = "Strong" | "Solid" | "Partial" | "Limited" | "Early";

/** Accepts 0–1 (unit) or 0–100 (percent). */
export function toPercent(score: number, scale: "unit" | "percent" = "unit"): number {
  const pct = scale === "percent" ? score : score * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function strengthBand(
  score: number,
  scale: "unit" | "percent" = "unit",
): StrengthBand {
  const pct = toPercent(score, scale);
  if (pct >= 75) return "High";
  if (pct >= 45) return "Medium";
  if (pct >= 20) return "Low";
  return "Emerging";
}

export function coverageBand(
  score: number,
  scale: "unit" | "percent" = "percent",
): CoverageBand {
  const pct = toPercent(score, scale);
  if (pct >= 80) return "Strong";
  if (pct >= 60) return "Solid";
  if (pct >= 40) return "Partial";
  if (pct >= 20) return "Limited";
  return "Early";
}

export function recommendationStrength(score: number, scale: "unit" | "percent" = "unit"): string {
  return `Recommendation strength: ${strengthBand(score, scale)}`;
}

export function understandingLevel(score0to100: number): string {
  const band = strengthBand(score0to100, "percent");
  switch (band) {
    case "High":
      return "Strong";
    case "Medium":
      return "Developing";
    case "Low":
      return "Early";
    default:
      return "Forming";
  }
}

export function understandingSentence(score0to100: number): string {
  const level = understandingLevel(score0to100);
  switch (level) {
    case "Strong":
      return "We have a clear, evidence-backed picture of how the business operates.";
    case "Developing":
      return "Core operations are understood; a few areas still need validation.";
    case "Early":
      return "Initial patterns are visible; deeper discovery will sharpen the picture.";
    default:
      return "Discovery is underway — structured understanding is still forming.";
  }
}

export function maturityLabel(score: number | null | undefined): string {
  if (score == null) return "Not yet assessed";
  const band = strengthBand(score, "unit");
  switch (band) {
    case "High":
      return "Mature";
    case "Medium":
      return "Developing";
    case "Low":
      return "Foundational";
    default:
      return "Emerging";
  }
}

export function healthLabel(score: number | null | undefined): string {
  if (score == null) return "Not yet assessed";
  const band = strengthBand(score, "unit");
  switch (band) {
    case "High":
      return "Healthy";
    case "Medium":
      return "Stable with gaps";
    case "Low":
      return "Under strain";
    default:
      return "Needs attention";
  }
}

export function strengthHint(score: number, scale: "unit" | "percent" = "unit"): string {
  switch (strengthBand(score, scale)) {
    case "High":
      return "Well supported by discovery evidence";
    case "Medium":
      return "Supported, with room to validate further";
    case "Low":
      return "Indicative — confirm with stakeholders";
    default:
      return "Early signal — treat as directional";
  }
}

const DEPENDENCY_PHRASES: Record<string, string> = {
  crm: "Requires customer information",
  customers: "Requires customer records",
  customer: "Requires customer records",
  contacts: "Requires contact information",
  accounts: "Requires account records",
  inventory: "Requires inventory data",
  products: "Requires product catalog",
  product: "Requires product catalog",
  orders: "Requires order information",
  order: "Requires order information",
  invoices: "Requires billing information",
  billing: "Requires billing information",
  payments: "Requires payment information",
  finance: "Requires financial records",
  hr: "Requires people information",
  employees: "Requires employee records",
  users: "Requires user accounts",
  auth: "Requires secure sign-in",
  authentication: "Requires secure sign-in",
  permissions: "Requires access controls",
  reporting: "Requires reporting capability",
  analytics: "Requires analytics capability",
  documents: "Requires document management",
  files: "Requires document storage",
  notifications: "Requires notifications",
  calendar: "Requires scheduling capability",
  projects: "Requires project tracking",
  tasks: "Requires task management",
  workflow: "Requires workflow orchestration",
  integrations: "Requires system integrations",
  api: "Requires system connectivity",
};

/** Map engine dependency tokens / module names → executive phrases. */
export function humanizeDependency(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const key = trimmed.toLowerCase().replace(/[_-]+/g, " ").trim();
  const compact = key.replace(/\s+/g, "");

  if (DEPENDENCY_PHRASES[key]) return DEPENDENCY_PHRASES[key];
  if (DEPENDENCY_PHRASES[compact]) return DEPENDENCY_PHRASES[compact];

  for (const [token, phrase] of Object.entries(DEPENDENCY_PHRASES)) {
    if (key.includes(token) || compact.includes(token)) return phrase;
  }

  // Strip "Depends on" style prefixes if engines ever emit them.
  const cleaned = trimmed.replace(/^depends\s+on\s+/i, "").trim();
  return `Requires ${cleaned} to be in place`;
}

export function humanizeDependencies(deps: string[]): string {
  const phrases = deps.map(humanizeDependency).filter(Boolean);
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0]!;
  return phrases.join("; ");
}

export function revisionLabel(
  indexFromNewest: number,
  superseded: boolean,
): string {
  if (indexFromNewest === 0 && !superseded) return "Current";
  if (superseded || indexFromNewest > 0) {
    return indexFromNewest === 0 ? "Previous" : `Earlier revision`;
  }
  return "Current";
}

export function riskLevelLabel(level: string | null | undefined): string {
  if (!level || level === "unknown") return "";
  const normalized = level.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "High priority";
  if (normalized === "medium" || normalized === "moderate") return "Monitor closely";
  if (normalized === "low") return "Contained";
  return level;
}
