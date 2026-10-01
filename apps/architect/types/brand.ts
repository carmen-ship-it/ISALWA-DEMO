/**
 * Brand & Experience Studio — Mission 10 domain contracts.
 * Deterministic identity and experience design from workspace evidence.
 * No LLM. No uploads. No code/PDF/diagram generation.
 */

export type BrandEvidenceSource =
  | "blueprint"
  | "knowledge"
  | "meeting"
  | "consulting"
  | "memory"
  | "industry"
  | "solution";

export type BrandAssetKind =
  | "logo_primary"
  | "logo_mark"
  | "wordmark"
  | "favicon"
  | "photo"
  | "brand_guidelines";

export type ColorTokenRole =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "background"
  | "surface"
  | "text"
  | "border"
  | "success"
  | "warning"
  | "danger";

export type NavigationPattern =
  | "sidebar"
  | "top_nav"
  | "hub"
  | "role_based"
  | "module_first";

export type ExperienceDensity =
  | "compact"
  | "comfortable"
  | "spacious"
  | "unknown";

export type FormalityLevel = "formal" | "neutral" | "casual" | "unknown";

export type ContrastTarget = "AA" | "AAA" | "unknown";

export type MotionPreference = "reduce" | "standard" | "unknown";

export type ThemeMode = "light" | "dark" | "system" | "unknown";

export type BrandFutureIntakeKind =
  | "logo_upload"
  | "photo_upload"
  | "brand_guidelines_upload"
  | "font_upload";

export interface BrandEvidenceRef {
  source: BrandEvidenceSource;
  id: string;
  label: string;
}

/** Generic recommendation wrapper — value may be null when evidence is insufficient. */
export interface BrandRecommendation<T> {
  value: T | null;
  confidence: number;
  reasoning: string;
  evidence: BrandEvidenceRef[];
}

export interface LogoAssetRef {
  kind: "primary" | "mark" | "wordmark" | "favicon";
  status: "unknown" | "inferred" | "uploaded";
  /** Future — populated by upload providers only. */
  url: null;
  notes: string | null;
  confidence: number;
}

export interface BrandProfile {
  companyDisplayName: string;
  tagline: BrandRecommendation<string>;
  voiceTone: BrandRecommendation<string>;
  personalityTraits: BrandRecommendation<string[]>;
  industryPositioning: BrandRecommendation<string>;
  logos: LogoAssetRef[];
  differentiation: BrandRecommendation<string>;
}

export interface ColorToken {
  name: string;
  hex: string | null;
  role: ColorTokenRole;
  confidence: number;
  reasoning: string;
  evidence: BrandEvidenceRef[];
}

export interface TypographyToken {
  role: "display" | "heading" | "body" | "mono" | "label";
  family: string | null;
  weight: string | null;
  confidence: number;
  reasoning: string;
  evidence: BrandEvidenceRef[];
}

export interface SpacingRhythm {
  baseUnit: number | null;
  confidence: number;
  reasoning: string;
  evidence: BrandEvidenceRef[];
}

export interface DesignTokens {
  colors: ColorToken[];
  typography: TypographyToken[];
  spacing: SpacingRhythm;
  borderRadius: BrandRecommendation<string>;
  elevation: BrandRecommendation<string>;
}

export interface ThemeRecommendation {
  name: string;
  mode: ThemeMode;
  aesthetic: BrandRecommendation<string>;
  rationale: string;
  confidence: number;
  evidence: BrandEvidenceRef[];
}

export interface TerminologyEntry {
  id: string;
  term: string;
  preferredLabel: string;
  context: string;
  confidence: number;
  evidence: BrandEvidenceRef[];
}

export interface TerminologyProfile {
  entries: TerminologyEntry[];
  localeDefault: BrandRecommendation<string>;
  formality: BrandRecommendation<FormalityLevel>;
}

export interface NavigationPreference {
  id: string;
  pattern: NavigationPattern;
  label: string;
  rationale: string;
  confidence: number;
  evidence: BrandEvidenceRef[];
  /** Module names from Solution Architecture — never invented. */
  modules: string[];
}

export interface AccessibilityProfile {
  contrastTarget: BrandRecommendation<ContrastTarget>;
  motionPreference: BrandRecommendation<MotionPreference>;
  fontScaleDefault: BrandRecommendation<"standard" | "large" | "unknown">;
  keyboardFirst: BrandRecommendation<boolean>;
  notes: string[];
  overallConfidence: number;
  evidence: BrandEvidenceRef[];
}

export interface RegionalFormatPreference {
  language: BrandRecommendation<string>;
  timezone: BrandRecommendation<string>;
  dateFormat: BrandRecommendation<string>;
  numberFormat: BrandRecommendation<string>;
  currency: BrandRecommendation<string>;
}

export interface NotificationChannelPreference {
  channel: "email" | "in_app" | "sms" | "push";
  enabled: boolean | null;
  confidence: number;
  reasoning: string;
  evidence: BrandEvidenceRef[];
}

export interface ExperienceProfile {
  employeeExperienceVision: BrandRecommendation<string>;
  softwareExpectations: BrandRecommendation<string[]>;
  onboardingStyle: BrandRecommendation<string>;
  densityPreference: BrandRecommendation<ExperienceDensity>;
  regionalFormats: RegionalFormatPreference;
  notificationPreferences: NotificationChannelPreference[];
}

/**
 * White Label Company Experience — manual brand configuration captured by the
 * consultant and layered on top of the derived `BrandExperienceModel`.
 *
 * This is deliberately separate from `FutureWhiteLabelConfig` (multi-tenant
 * SaaS readiness, still `enabled: false`). `BrandOverrides` is single-tenant,
 * per-workspace cosmetic configuration — no new tenancy model, no parallel
 * branding system. It never regenerates automatically; it persists across
 * blueprint-driven `brandExperience` recalculation and is merged at
 * presentation time via `applyBrandOverrides()` (`lib/brand/overrides.ts`).
 */
export interface BrandReportBrandingOverrides {
  showLogoOnReports: boolean;
  footerText: string | null;
}

export interface BrandOverrides {
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  /** Free-text override for `brandProfile.industryPositioning`. */
  industryPositioning: string | null;
  /** Custom welcome message shown on the workspace home/executive view. */
  homepageMessage: string | null;
  /**
   * Descriptive preference only (e.g. "line", "flat", "photographic").
   * No illustration rendering system exists yet — captured for a future
   * mission, never wired to visuals. See WHITE_LABEL_EXPERIENCE.md gaps.
   */
  illustrationStyle: string | null;
  /**
   * Keyed by `${TerminologyEntry.term}::${TerminologyEntry.preferredLabel}` —
   * a stable content key, since entry ids are regenerated on every
   * blueprint-driven derivation. Covers both business terminology (Customer,
   * Order, Employee…) and department display names (`term === "Department"`).
   */
  terminologyOverrides: Record<string, string>;
  reportBranding: BrandReportBrandingOverrides;
  updatedAt: string;
  updatedBy: string | null;
}

/** Multi-tenant white-label readiness — contracts only. */
export interface FutureWhiteLabelConfig {
  enabled: boolean;
  tenantId: string | null;
  customDomain: BrandRecommendation<string>;
  hideIsalwaBranding: BrandRecommendation<boolean>;
  partnerName: BrandRecommendation<string>;
  /** Per-tenant overrides — keys are token paths, values are design values. */
  tokenOverrides: BrandRecommendation<Record<string, string>>;
  status: "designed" | "planned";
}

export interface BrandExperienceModel {
  id: string;
  workspaceId: string;
  blueprintId: string;
  blueprintVersion: number;
  generatedAt: string;
  summary: string;
  executiveSummary: string;
  brandProfile: BrandProfile;
  experienceProfile: ExperienceProfile;
  designTokens: DesignTokens;
  themeRecommendation: ThemeRecommendation;
  terminology: TerminologyProfile;
  navigation: NavigationPreference[];
  accessibility: AccessibilityProfile;
  whiteLabel: FutureWhiteLabelConfig;
  overallConfidence: number;
  evidence: BrandEvidenceRef[];
  reasoning: string[];
}

/** Future upload provider contracts — no implementation in Mission 10. */
export interface BrandAssetUploadProvider {
  id: string;
  kind: BrandFutureIntakeKind;
  title: string;
  description: string;
  status: "designed" | "planned";
  acceptedFormats: readonly string[];
  feedsInto: "brand_experience";
}

export type BrandFutureOutputKind =
  | "design_system_export"
  | "figma_tokens"
  | "css_variables"
  | "tenant_theme_pack"
  | "style_guide_pdf";

export interface BrandFutureOutput {
  id: BrandFutureOutputKind;
  title: string;
  description: string;
  status: "designed" | "planned";
  sourcedFrom: "brand_experience";
}
