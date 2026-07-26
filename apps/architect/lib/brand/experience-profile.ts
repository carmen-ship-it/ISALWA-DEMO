import { departmentLabel } from "@/lib/presentation";
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
      "El software debe sentirse listo para el campo: objetivos grandes, pocos pasos, funciona en dispositivos compartidos.",
      Math.min(0.72, 0.4 + strength),
      "Inferido del lenguaje operativo y de piso de producción en el descubrimiento.",
      evidenceSubset(evidence, ["meeting", "memory", "blueprint"], 3),
    );
  }

  if (blueprint.departments.length >= 3) {
    return recommendation(
      `Los empleados de ${blueprint.departments.map((d) => departmentLabel(d.name)).join(", ")} necesitan un sistema compartido con vistas apropiadas a cada rol.`,
      Math.min(0.68, 0.38 + strength),
      "Inferido de la estructura de departamentos del blueprint.",
      evidenceSubset(evidence, ["blueprint"], 3),
    );
  }

  if (strength < 0.25) {
    return recommendation<string>(
      null,
      0,
      "La visión de experiencia del empleado requiere estructura de departamentos o evidencia operativa del descubrimiento.",
      [],
    );
  }

  return recommendation(
    "Software calmo y estructurado que reduce los traspasos manuales y hace visible el estado.",
    Math.min(0.55, 0.28 + strength),
    "Patrón de experiencia empresarial por defecto a partir del blueprint y el descubrimiento — baja especificidad.",
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
    expectations.push("Reemplazar la dispersión de hojas de cálculo con registros duraderos");
  }
  if (/whatsapp|chat|message/i.test(pains)) {
    expectations.push("Capturar el historial de conversaciones dentro del sistema de registro");
  }
  if (/manual|approval/i.test(pains)) {
    expectations.push("Rutas de aprobación claras con rastro de auditoría");
  }
  if (/verbal|whiteboard/i.test(pains)) {
    expectations.push("Tableros de estado visibles en vez de actualizaciones verbales");
  }

  if (expectations.length === 0) {
    return recommendation<string[]>(
      null,
      0,
      "No se infirieron expectativas de software sin puntos de dolor con evidencia.",
      [],
    );
  }

  return recommendation(
    expectations.slice(0, 5),
    Math.min(0.75, 0.42 + strength),
    "Expectativas derivadas de la matriz de puntos de dolor del blueprint — no funciones aspiracionales.",
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
      "Incorporación por rol: cada rol ve solo lo que necesita desde el primer día.",
      Math.min(0.7, 0.4 + strength),
      "Inferido del número de roles de la solución y el blueprint multidepartamental.",
      evidenceSubset(evidence, ["solution", "blueprint"], 3),
    );
  }

  if (workspace.industry === "manufacturing") {
    return recommendation(
      "Recorrido práctico con líderes del piso de producción antes del despliegue amplio.",
      0.55,
      "Patrón de incorporación de manufactura según la clasificación de industria.",
      evidenceSubset(evidence, ["industry"], 1),
    );
  }

  return recommendation<string>(
    null,
    0,
    "El estilo de incorporación se desconoce hasta mapear roles y departamentos.",
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
      "Los usuarios de campo y planta se benefician de objetivos táctiles más grandes y densidad legible.",
      evidenceSubset(evidence, ["industry"], 2),
    );
  }

  if (techScore != null && techScore >= 0.7) {
    return recommendation<ExperienceDensity>(
      "compact",
      0.58,
      "Una mayor madurez tecnológica sugiere tolerancia de usuarios avanzados a mayor densidad de información.",
      evidenceSubset(evidence, ["consulting"], 2),
    );
  }

  return recommendation<ExperienceDensity>(
    strength >= 0.3 ? "comfortable" : "unknown",
    strength >= 0.3 ? 0.45 : 0,
    strength >= 0.3
      ? "Densidad cómoda por defecto — no se capturó una preferencia explícita del usuario."
      : "Preferencia de densidad desconocida.",
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
    ? { value: "es", confidence: 0.62, reasoning: "Señales de idioma español en el descubrimiento o el conocimiento.", evidence: evidenceSubset(evidence, ["memory", "knowledge", "meeting"], 2) }
    : usHint
      ? { value: "en-US", confidence: 0.55, reasoning: "Señales de inglés/EE. UU. en el descubrimiento.", evidence: evidenceSubset(evidence, ["memory", "meeting"], 2) }
      : { value: null, confidence: 0, reasoning: "Idioma no inferido — seguirá el valor por defecto del tenant.", evidence: [] as BrandEvidenceRef[] };

  return {
    language,
    timezone: { value: null, confidence: 0, reasoning: "Zona horaria no inferida sin evidencia geográfica.", evidence: [] },
    dateFormat: spanishHint
      ? { value: "DD/MM/YYYY", confidence: 0.5, reasoning: "Formato de fecha regional inferido del contexto español/LATAM.", evidence: language.evidence }
      : { value: null, confidence: 0, reasoning: "Formato de fecha desconocido.", evidence: [] },
    numberFormat: { value: null, confidence: 0, reasoning: "Formato numérico desconocido.", evidence: [] },
    currency: usHint
      ? { value: "USD", confidence: 0.5, reasoning: "Señal de moneda del descubrimiento.", evidence: language.evidence }
      : { value: null, confidence: 0, reasoning: "Moneda desconocida.", evidence: [] },
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
        ? "Los flujos de aprobación se benefician de notificaciones dentro de la app."
        : "No se infirieron notificaciones dentro de la app.",
      evidence: hasApprovals ? evidenceSubset(evidence, ["blueprint"], 2) : [],
    },
    {
      channel: "email",
      enabled: workspace.meetings.length > 0 ? true : null,
      confidence: workspace.meetings.length > 0 ? 0.45 : 0,
      reasoning: "Se asume correo para resúmenes asíncronos cuando existe descubrimiento — sin confirmar.",
      evidence: evidenceSubset(evidence, ["meeting"], 1),
    },
    {
      channel: "sms",
      enabled: null,
      confidence: 0,
      reasoning: "SMS no inferido sin evidencia de servicio de campo o enfoque móvil.",
      evidence: [],
    },
    {
      channel: "push",
      enabled: null,
      confidence: 0,
      reasoning: "Push no inferido sin alcance de app móvil.",
      evidence: [],
    },
  ];
  return channels;
}
