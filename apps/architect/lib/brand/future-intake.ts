import type { BrandAssetUploadProvider, BrandFutureOutput } from "@/types";

/**
 * Future brand asset upload providers — interfaces only.
 * No upload UI or storage in Mission 10.
 */
export const BRAND_ASSET_UPLOAD_PROVIDERS: readonly BrandAssetUploadProvider[] = [
  {
    id: "logo_upload",
    kind: "logo_upload",
    title: "Carga de logotipo",
    description:
      "Logotipo principal, isotipo, logotipo tipográfico y favicon — alimenta BrandProfile.logos con alta confianza.",
    status: "designed",
    acceptedFormats: ["svg", "png", "webp"],
    feedsInto: "brand_experience",
  },
  {
    id: "photo_upload",
    kind: "photo_upload",
    title: "Fotografía de marca",
    description:
      "Fotos de instalaciones, equipo y producto para tableros de experiencia — solo evidencia.",
    status: "planned",
    acceptedFormats: ["jpg", "png", "webp"],
    feedsInto: "brand_experience",
  },
  {
    id: "brand_guidelines_upload",
    kind: "brand_guidelines_upload",
    title: "Lineamientos de marca",
    description:
      "PDF o documento con colores, tipografía y voz — fuente de tokens de mayor confianza.",
    status: "designed",
    acceptedFormats: ["pdf", "docx"],
    feedsInto: "brand_experience",
  },
  {
    id: "font_upload",
    kind: "font_upload",
    title: "Fuentes personalizadas",
    description: "Archivos de fuentes con licencia para las anulaciones de DesignTokens.typography.",
    status: "planned",
    acceptedFormats: ["woff2", "otf", "ttf"],
    feedsInto: "brand_experience",
  },
] as const;

export const BRAND_FUTURE_OUTPUTS: readonly BrandFutureOutput[] = [
  {
    id: "design_system_export",
    title: "Exportación del sistema de diseño",
    description: "JSON estructurado de tokens, terminología y navegación para el génesis de ISALWA OS.",
    status: "designed",
    sourcedFrom: "brand_experience",
  },
  {
    id: "figma_tokens",
    title: "Tokens de Figma",
    description: "Exportación del plugin de tokens de diseño para el traspaso de diseño.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
  {
    id: "css_variables",
    title: "Variables CSS",
    description: "Propiedades personalizadas CSS del tema en tiempo de ejecución para tenants white-label.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
  {
    id: "tenant_theme_pack",
    title: "Paquete de tema por tenant",
    description: "Paquete de tema por tenant para el despliegue multi-tenant de ISALWA OS.",
    status: "designed",
    sourcedFrom: "brand_experience",
  },
  {
    id: "style_guide_pdf",
    title: "PDF de guía de estilo",
    description: "Guía de marca y experiencia orientada al cliente — solo contrato de exportación.",
    status: "planned",
    sourcedFrom: "brand_experience",
  },
] as const;
