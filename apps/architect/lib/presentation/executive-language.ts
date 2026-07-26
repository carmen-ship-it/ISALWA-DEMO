/**
 * Presentation-only helpers for executive-facing workspace copy (Spanish).
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

export function coverageBandLabelEs(band: CoverageBand): string {
  switch (band) {
    case "Strong":
      return "Sólida";
    case "Solid":
      return "Buena";
    case "Partial":
      return "Parcial";
    case "Limited":
      return "Limitada";
    default:
      return "Inicial";
  }
}

function strengthBandEs(band: StrengthBand): string {
  switch (band) {
    case "High":
      return "Alta";
    case "Medium":
      return "Media";
    case "Low":
      return "Baja";
    default:
      return "Emergente";
  }
}

/** Spanish band label for direct display (e.g. next to a name or metric). */
export function strengthBandLabelEs(
  score: number,
  scale: "unit" | "percent" = "unit",
): string {
  return strengthBandEs(strengthBand(score, scale));
}

export function recommendationStrength(
  score: number,
  scale: "unit" | "percent" = "unit",
): string {
  return `Fortaleza de la recomendación: ${strengthBandEs(strengthBand(score, scale))}`;
}

export function understandingLevel(score0to100: number): string {
  const band = strengthBand(score0to100, "percent");
  switch (band) {
    case "High":
      return "Sólida";
    case "Medium":
      return "En progreso";
    case "Low":
      return "Inicial";
    default:
      return "En formación";
  }
}

export function understandingSentence(score0to100: number): string {
  const level = understandingLevel(score0to100);
  const honesty = " Estimación basada en la entrevista.";
  switch (level) {
    case "Sólida":
      return `Tenemos una imagen clara y respaldada de cómo opera el negocio.${honesty}`;
    case "En progreso":
      return `Las operaciones centrales se entienden; algunas áreas aún requieren validación.${honesty}`;
    case "Inicial":
      return `Ya se ven patrones iniciales; un descubrimiento más profundo afinará el panorama.${honesty}`;
    default:
      return `El descubrimiento está en marcha — la comprensión estructurada aún se está formando.${honesty}`;
  }
}

export function maturityLabel(score: number | null | undefined): string {
  if (score == null) return "Aún sin evaluar";
  const band = strengthBand(score, "unit");
  switch (band) {
    case "High":
      return "Madura";
    case "Medium":
      return "En desarrollo";
    case "Low":
      return "Fundacional";
    default:
      return "Emergente";
  }
}

export function healthLabel(score: number | null | undefined): string {
  if (score == null) return "Aún sin evaluar";
  const band = strengthBand(score, "unit");
  switch (band) {
    case "High":
      return "Saludable";
    case "Medium":
      return "Estable con brechas";
    case "Low":
      return "Bajo presión";
    default:
      return "Requiere atención";
  }
}

export function strengthHint(score: number, scale: "unit" | "percent" = "unit"): string {
  switch (strengthBand(score, scale)) {
    case "High":
      return "Bien respaldada por la evidencia del descubrimiento";
    case "Medium":
      return "Respaldada, con espacio para validar más";
    case "Low":
      return "Indicativa — conviene confirmar con el equipo";
    default:
      return "Señal temprana — tómese como orientación";
  }
}

const DEPENDENCY_PHRASES: Record<string, string> = {
  crm: "Requiere información de clientes",
  customers: "Requiere registros de clientes",
  customer: "Requiere registros de clientes",
  contacts: "Requiere información de contactos",
  accounts: "Requiere registros de cuentas",
  inventory: "Requiere datos de inventario",
  products: "Requiere catálogo de productos",
  product: "Requiere catálogo de productos",
  orders: "Requiere información de pedidos",
  order: "Requiere información de pedidos",
  invoices: "Requiere información de facturación",
  billing: "Requiere información de facturación",
  payments: "Requiere información de pagos",
  finance: "Requiere registros financieros",
  hr: "Requiere información de personas",
  employees: "Requiere registros de empleados",
  users: "Requiere cuentas de usuario",
  auth: "Requiere inicio de sesión seguro",
  authentication: "Requiere inicio de sesión seguro",
  permissions: "Requiere controles de acceso",
  reporting: "Requiere capacidad de reportes",
  analytics: "Requiere capacidad de analítica",
  documents: "Requiere gestión documental",
  files: "Requiere almacenamiento de documentos",
  notifications: "Requiere notificaciones",
  calendar: "Requiere agenda y programación",
  projects: "Requiere seguimiento de proyectos",
  tasks: "Requiere gestión de tareas",
  workflow: "Requiere orquestación de flujos",
  integrations: "Requiere integraciones entre sistemas",
  api: "Requiere conectividad entre sistemas",
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

  const cleaned = trimmed.replace(/^depends\s+on\s+/i, "").trim();
  return `Requiere que ${cleaned} esté en su lugar`;
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
  if (indexFromNewest === 0 && !superseded) return "Actual";
  if (superseded || indexFromNewest > 0) {
    return indexFromNewest === 0 ? "Anterior" : "Revisión anterior";
  }
  return "Actual";
}

const OWNERSHIP_KIND_LABELS_ES: Record<string, string> = {
  department_capability: "Capacidad departamental",
  workflow: "Flujo de trabajo",
  system: "Sistema",
  information: "Información",
  product: "Producto",
};

/** Company Model ownership kind → natural CEO Spanish. */
export function ownershipKindLabel(kind: string): string {
  return OWNERSHIP_KIND_LABELS_ES[kind] ?? kind.replace(/_/g, " ");
}

const DEPENDENCY_KIND_LABELS_ES: Record<string, string> = {
  workflow: "Flujo de trabajo",
  system: "Sistema",
  person: "Persona",
  information: "Información",
  external: "Externa",
};

/** Company Model dependency kind → natural CEO Spanish. */
export function dependencyKindLabel(kind: string): string {
  return DEPENDENCY_KIND_LABELS_ES[kind] ?? kind;
}

const CRITICALITY_LABELS_ES: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  moderate: "Moderada",
  low: "Baja",
};

/** Dependency criticality → natural CEO Spanish. */
export function criticalityLabel(level: string): string {
  return CRITICALITY_LABELS_ES[level] ?? level;
}

export function riskLevelLabel(level: string | null | undefined): string {
  if (!level || level === "unknown") return "";
  const normalized = level.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "Alta prioridad";
  if (normalized === "medium" || normalized === "moderate") return "Vigilar de cerca";
  if (normalized === "low") return "Contenido";
  return level;
}
