/**
 * White Label Company Experience — presentation-layer merge of consultant
 * overrides onto the Mission 10 derived `BrandExperienceModel`.
 *
 * This module never touches `derive.ts` or any `deriveX()` function. It only
 * reads a `BrandExperienceModel` (or `null`) plus an optional `BrandOverrides`
 * record and produces an `EffectiveBrandExperience` — the single object
 * client-facing surfaces should read from. Extend here, never fork the
 * derivation engine.
 */
import type {
  BrandExperienceModel,
  BrandOverrides,
  BrandReportBrandingOverrides,
  TerminologyEntry,
} from "@/types";

export function emptyBrandOverrides(): BrandOverrides {
  return {
    logoUrl: null,
    primaryColor: null,
    accentColor: null,
    industryPositioning: null,
    homepageMessage: null,
    illustrationStyle: null,
    terminologyOverrides: {},
    reportBranding: { showLogoOnReports: true, footerText: null },
    updatedAt: new Date(0).toISOString(),
    updatedBy: null,
  };
}

/**
 * Stable content key for a terminology entry. Entry `id`s are regenerated
 * (random) on every blueprint-driven derivation, so overrides cannot key off
 * them. Term + derived label is stable as long as the underlying evidence
 * (industry, blueprint department/entity names) is stable.
 */
export function terminologyOverrideKey(
  entry: Pick<TerminologyEntry, "term" | "preferredLabel">,
): string {
  return `${entry.term}::${entry.preferredLabel}`;
}

export interface EffectiveBrandField<T> {
  value: T | null;
  /** Whether this came from a consultant override or the derived model. */
  source: "override" | "derived";
}

export interface EffectiveTerminologyEntry extends TerminologyEntry {
  effectiveLabel: string;
  overridden: boolean;
  overrideKey: string;
}

export type EffectiveReportBranding = BrandReportBrandingOverrides;

export interface EffectiveBrandExperience {
  companyDisplayName: string;
  logoUrl: EffectiveBrandField<string>;
  primaryColor: EffectiveBrandField<string>;
  accentColor: EffectiveBrandField<string>;
  industryPositioning: EffectiveBrandField<string>;
  homepageMessage: EffectiveBrandField<string>;
  illustrationStyle: EffectiveBrandField<string>;
  terminology: EffectiveTerminologyEntry[];
  departmentTerminology: EffectiveTerminologyEntry[];
  reportBranding: EffectiveReportBranding;
  /** Ready-to-spread inline CSS custom properties (e.g. on a wrapping element's `style`). */
  cssVariables: Record<string, string>;
}

function overrideField<T extends string>(
  overrideValue: T | null | undefined,
  derivedValue: T | null,
): EffectiveBrandField<T> {
  if (overrideValue != null && overrideValue.trim().length > 0) {
    return { value: overrideValue, source: "override" };
  }
  return { value: derivedValue, source: "derived" };
}

/**
 * Merge consultant `BrandOverrides` onto a derived `BrandExperienceModel`.
 * `model` may be `null` (blueprint not derived yet) — overrides still apply
 * so early white-label configuration is not blocked on discovery progress.
 */
export function applyBrandOverrides(
  model: BrandExperienceModel | null,
  overrides: BrandOverrides | null,
  fallbackCompanyName: string,
): EffectiveBrandExperience {
  const derivedPrimary =
    model?.designTokens.colors.find((c) => c.role === "primary")?.hex ?? null;
  const derivedAccent =
    model?.designTokens.colors.find((c) => c.role === "accent")?.hex ?? null;
  const derivedPositioning = model?.brandProfile.industryPositioning.value ?? null;

  const entries = model?.terminology.entries ?? [];
  const terminology: EffectiveTerminologyEntry[] = entries.map((entry) => {
    const overrideKey = terminologyOverrideKey(entry);
    const overrideLabel = overrides?.terminologyOverrides[overrideKey];
    const hasOverride = Boolean(overrideLabel && overrideLabel.trim().length > 0);
    return {
      ...entry,
      overrideKey,
      effectiveLabel: hasOverride ? overrideLabel!.trim() : entry.preferredLabel,
      overridden: hasOverride,
    };
  });

  const primaryColor = overrideField(overrides?.primaryColor, derivedPrimary);
  const accentColor = overrideField(overrides?.accentColor, derivedAccent);

  const cssVariables: Record<string, string> = {};
  if (primaryColor.value) {
    cssVariables["--architect-brand-primary"] = primaryColor.value;
  }
  if (accentColor.value) {
    cssVariables["--architect-brand-accent"] = accentColor.value;
  }

  return {
    companyDisplayName: model?.brandProfile.companyDisplayName ?? fallbackCompanyName,
    logoUrl: overrideField(overrides?.logoUrl, null),
    primaryColor,
    accentColor,
    industryPositioning: overrideField(overrides?.industryPositioning, derivedPositioning),
    homepageMessage: overrideField(overrides?.homepageMessage, null),
    illustrationStyle: overrideField(overrides?.illustrationStyle, null),
    terminology: terminology.filter((e) => e.term !== "Department"),
    departmentTerminology: terminology.filter((e) => e.term === "Department"),
    reportBranding: {
      showLogoOnReports: overrides?.reportBranding.showLogoOnReports ?? true,
      footerText: overrides?.reportBranding.footerText ?? null,
    },
    cssVariables,
  };
}
