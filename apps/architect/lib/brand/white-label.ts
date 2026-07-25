import type {
  BrandEvidenceRef,
  BrandRecommendation,
  CompanyWorkspace,
  FutureWhiteLabelConfig,
} from "@/types";
import { evidenceSubset } from "./evidence";

function recommendation<T>(
  value: T | null,
  confidence: number,
  reasoning: string,
  evidence: BrandEvidenceRef[],
): BrandRecommendation<T> {
  return { value, confidence, reasoning, evidence };
}

export function deriveWhiteLabelConfig(
  workspace: CompanyWorkspace,
  evidence: BrandEvidenceRef[],
): FutureWhiteLabelConfig {
  const ev = evidenceSubset(evidence, ["memory", "industry"], 2);
  const isPartner =
    workspace.industry === "services" &&
    /partner|agency|reseller|white.?label/i.test(
      workspace.knowledge?.summary?.toLowerCase() ?? "",
    );

  return {
    enabled: false,
    tenantId: workspace.id,
    customDomain: recommendation<string>(
      null,
      0,
      "Custom domain not configured — future tenant provisioning.",
      [],
    ),
    hideIsalwaBranding: recommendation(
      isPartner ? true : null,
      isPartner ? 0.45 : 0,
      isPartner
        ? "Partner/reseller language suggests future white-label interest."
        : "White-label hiding not inferred.",
      ev,
    ),
    partnerName: recommendation<string>(
      null,
      0,
      "Partner name unknown until commercial terms captured.",
      [],
    ),
    tokenOverrides: recommendation<Record<string, string>>(
      {},
      0.2,
      "Token override map reserved for per-tenant theme packs — empty until brand assets uploaded.",
      ev,
    ),
    status: "designed",
  };
}
