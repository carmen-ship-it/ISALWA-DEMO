import { INDUSTRY_PROFILES } from "@/data/catalog";
import type { Industry } from "@/types";

export function detectIndustry(text: string): {
  industry: Industry;
  confidence: number;
  label: string;
} {
  const normalized = text.toLowerCase();
  let best: Industry = "unknown";
  let bestScore = 0;

  for (const profile of INDUSTRY_PROFILES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += keyword.includes(" ") ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = profile.id;
    }
  }

  if (bestScore === 0) {
    return { industry: "unknown", confidence: 0, label: "Sin definir" };
  }

  const label =
    INDUSTRY_PROFILES.find((profile) => profile.id === best)?.label ?? best;

  return {
    industry: best,
    confidence: Math.min(1, bestScore / 4),
    label,
  };
}

export function industryLabel(industry: Industry): string {
  return (
    INDUSTRY_PROFILES.find((profile) => profile.id === industry)?.label ??
    "Sin definir"
  );
}

/** Composite beliefs like "manufacturing distributor". */
export function composeIndustryBelief(
  text: string,
  primary: Industry,
): { belief: string; confidence: number } {
  const lower = text.toLowerCase();
  const hasManufacturing =
    primary === "manufacturing" ||
    /\bmanufactur|\bfactory|\bproduction\b|\bplant\b/.test(lower);
  const hasDistribution =
    primary === "distribution" ||
    /\bdistribut|\bwholesale|\bwarehouse|\bfulfill/.test(lower);

  if (hasManufacturing && hasDistribution) {
    return {
      belief: "Creo que operan como fabricante-distribuidor.",
      confidence: 0.74,
    };
  }

  if (primary === "unknown") {
    return {
      belief: "Todavía estamos formando una idea del tipo de empresa que es.",
      confidence: 0.35,
    };
  }

  const label = industryLabel(primary).toLowerCase();
  return {
    belief: `Creo que operan principalmente como un negocio de ${label}.`,
    confidence: 0.62,
  };
}
