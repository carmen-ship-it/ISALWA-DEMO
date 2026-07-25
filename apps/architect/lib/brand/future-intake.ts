import type { BrandAssetUploadProvider, BrandFutureOutput } from "@/types";

/**
 * Future brand asset upload providers — interfaces only.
 * No upload UI or storage in Mission 10.
 */
export const BRAND_ASSET_UPLOAD_PROVIDERS: readonly BrandAssetUploadProvider[] = [
  {
    id: "logo_upload",
    kind: "logo_upload",
    title: "Logo upload",
    description:
      "Primary logo, mark, wordmark, and favicon — feeds BrandProfile.logos with high confidence.",
    status: "designed",
    acceptedFormats: ["svg", "png", "webp"],
    feedsInto: "brand_experience",
  },
  {
    id: "photo_upload",
    kind: "photo_upload",
    title: "Brand photography",
    description:
      "Facility, team, and product photos for experience mood boards — evidence only.",
    status: "planned",
    acceptedFormats: ["jpg", "png", "webp"],
    feedsInto: "brand_experience",
  },
  {
    id: "brand_guidelines_upload",
    kind: "brand_guidelines_upload",
    title: "Brand guidelines",
    description:
      "PDF or document with colors, typography, voice — highest-confidence token source.",
    status: "designed",
    acceptedFormats: ["pdf", "docx"],
    feedsInto: "brand_experience",
  },
  {
    id: "font_upload",
    kind: "font_upload",
    title: "Custom fonts",
    description: "Licensed font files for DesignTokens.typography overrides.",
    status: "planned",
    acceptedFormats: ["woff2", "otf", "ttf"],
    feedsInto: "brand_experience",
  },
] as const;

export const BRAND_FUTURE_OUTPUTS: readonly BrandFutureOutput[] = [
  {
    id: "design_system_export",
    title: "Design system export",
    description: "Structured JSON of tokens, terminology, and navigation for ISALWA OS genesis.",
    status: "designed",
    sourcedFrom: "brand_experience",
  },
  {
    id: "figma_tokens",
    title: "Figma tokens",
    description: "Design token plugin export for design handoff.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
  {
    id: "css_variables",
    title: "CSS variables",
    description: "Runtime theme CSS custom properties for white-label tenants.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
  {
    id: "tenant_theme_pack",
    title: "Tenant theme pack",
    description: "Per-tenant theme bundle for multi-tenant ISALWA OS deployment.",
    status: "designed",
    sourcedFrom: "brand_experience",
  },
  {
    id: "style_guide_pdf",
    title: "Style guide PDF",
    description: "Client-facing brand and experience guide — export contract only.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
] as const;
