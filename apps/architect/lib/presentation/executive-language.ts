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
      return "En desarrollo";
    case "Low":
      return "Necesita más conocimiento";
    default:
      return "Inicial";
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

/** @param scale — most engine `maturity.overall` / dimension scores are already 0–100 ("percent"); pass "unit" only for genuine 0–1 fractions. */
export function maturityLabel(
  score: number | null | undefined,
  scale: "unit" | "percent" = "unit",
): string {
  if (score == null) return "Aún sin evaluar";
  const band = strengthBand(score, scale);
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

/** @param scale — most engine `health.overall` / gauge scores are already 0–100 ("percent"); pass "unit" only for genuine 0–1 fractions (e.g. `processHealth`). */
export function healthLabel(
  score: number | null | undefined,
  scale: "unit" | "percent" = "unit",
): string {
  if (score == null) return "Aún sin evaluar";
  const band = strengthBand(score, scale);
  switch (band) {
    case "High":
      return "Saludable";
    case "Medium":
      return "Estable con oportunidades";
    case "Low":
      return "Principalmente manual";
    default:
      return "Necesita más conocimiento";
  }
}

/**
 * Mission 11 — canonical 3-tier health status for standalone health gauges
 * that today show a raw number with no qualitative word at all (e.g. the
 * executive cockpit's "Indicadores de salud"). Same thresholds as
 * `strengthBand` — no new health engine, just a coarser, always-present label.
 */
export function healthStatusLabel(
  score: number | null | undefined,
  scale: "unit" | "percent" = "percent",
): string {
  if (score == null) return "Sin evaluar";
  const band = strengthBand(score, scale);
  if (band === "High") return "Saludable";
  if (band === "Medium") return "En desarrollo";
  return "Oportunidad de estandarización";
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

const SEVERITY_LABELS_ES: Record<string, string> = {
  critical: "Prioridad alta",
  high: "Alta",
  moderate: "Moderado",
  low: "Bajo",
  attention: "Atención",
};

/** Risk/finding severity token → Spanish. */
export function severityLabel(s: string): string {
  return SEVERITY_LABELS_ES[s] ?? s;
}

export function riskLevelLabel(level: string | null | undefined): string {
  if (!level || level === "unknown") return "";
  const normalized = level.toLowerCase();
  if (normalized === "critical" || normalized === "high") return "Alta prioridad";
  if (normalized === "medium" || normalized === "moderate") return "Vigilar de cerca";
  if (normalized === "low") return "Contenido";
  return level;
}

/**
 * Canonical Spanish display names for domain nouns that stay in English inside
 * the engines (enum-typed department/module/role/entity/area names used for
 * matching and dependency wiring). These functions never touch the underlying
 * stored value — they only translate what is shown to the client.
 */
const COVERAGE_AREA_LABELS_ES: Record<string, string> = {
  Customers: "Clientes",
  Sales: "Ventas",
  Operations: "Operaciones",
  Finance: "Finanzas",
  HR: "Equipo y RR. HH.",
  "Follow-up interview topics": "Temas de seguimiento en la entrevista",
};

/** Knowledge coverage area (Customers/Sales/Operations/Finance/HR) → Spanish. */
export function coverageAreaLabel(area: string): string {
  return COVERAGE_AREA_LABELS_ES[area] ?? area;
}

const DEPARTMENT_LABELS_ES: Record<string, string> = {
  Sales: "Ventas",
  Purchasing: "Compras",
  Finance: "Finanzas",
  Production: "Producción",
  Warehouse: "Almacén",
  Maintenance: "Mantenimiento",
  Operations: "Operaciones",
  Management: "Dirección",
  Support: "Soporte",
  Technology: "Tecnología",
  People: "Personas",
};

/** Business Blueprint / Solution Architecture department name → Spanish. */
export function departmentLabel(name: string): string {
  return DEPARTMENT_LABELS_ES[name] ?? name;
}

const MODULE_LABELS_ES: Record<string, string> = {
  CRM: "CRM",
  Sales: "Ventas",
  Purchasing: "Compras",
  Inventory: "Inventario",
  Production: "Producción",
  Maintenance: "Mantenimiento",
  Finance: "Finanzas",
  Collections: "Cobranza",
  HR: "Personas / RR. HH.",
  Projects: "Proyectos",
  "Customer Service": "Atención al cliente",
  Compliance: "Cumplimiento",
  Analytics: "Analítica",
  Documents: "Documentos",
  Assets: "Activos",
  Fleet: "Flotilla",
  Scheduling: "Programación",
  "Field Service": "Servicio en campo",
  Approvals: "Aprobaciones",
  Notifications: "Notificaciones",
  Knowledge: "Conocimiento",
  "AI Assistant": "Asistente de IA",
  // Business Blueprint capability names not already covered above.
  "Lead Management": "Gestión de prospectos",
  "Customer Management": "Gestión de clientes",
  Quoting: "Cotización",
  Orders: "Pedidos",
  Accounting: "Contabilidad",
  Reporting: "Reportes",
  "Field Visits": "Visitas de campo",
  Quality: "Calidad",
  Support: "Soporte",
  Security: "Seguridad",
};

/** Solution module / Blueprint capability name → Spanish. */
export function moduleLabel(name: string): string {
  return MODULE_LABELS_ES[name] ?? name;
}

const ROLE_LABELS_ES: Record<string, string> = {
  Owner: "Dueño(a)",
  Manager: "Gerente",
  Operator: "Operador(a)",
  Sales: "Ventas",
  Purchasing: "Compras",
  Production: "Producción",
  Accounting: "Contabilidad",
  Operations: "Operaciones",
  Warehouse: "Almacén",
  HR: "Personas / RR. HH.",
  Technician: "Técnico",
  "Field Rep": "Representante de campo",
  Administrator: "Administrador(a)",
};

/** Solution role name → Spanish. */
export function roleLabel(name: string): string {
  return ROLE_LABELS_ES[name] ?? name;
}

const SCREEN_LABELS_ES: Record<string, string> = {
  Dashboard: "Panel principal",
  Reports: "Reportes",
  Settings: "Configuración",
};

/** Role "primary screens" token → Spanish (falls back to module labels). */
export function screenLabel(name: string): string {
  return SCREEN_LABELS_ES[name] ?? moduleLabel(name);
}

const ENTITY_LABELS_ES: Record<string, string> = {
  Customer: "Cliente",
  Contact: "Contacto",
  Location: "Ubicación",
  Quote: "Cotización",
  Order: "Pedido",
  Invoice: "Factura",
  Payment: "Pago",
  Visit: "Visita",
  Task: "Tarea",
  Message: "Mensaje",
  "Purchase Request": "Solicitud de compra",
  "Purchase Order": "Orden de compra",
  Supplier: "Proveedor",
  "Inventory Item": "Artículo de inventario",
  Machine: "Máquina",
  "Maintenance Plan": "Plan de mantenimiento",
  Employee: "Empleado",
  Role: "Rol",
  Permission: "Permiso",
  Document: "Documento",
  Asset: "Activo",
  Risk: "Riesgo",
  Workflow: "Flujo de trabajo",
  Approval: "Aprobación",
  Product: "Producto",
  "Work Order": "Orden de trabajo",
  "Bill of Materials": "Lista de materiales",
};

/** Business entity name (Customer, Quote, Invoice, …) → Spanish. */
export function entityLabel(name: string): string {
  return ENTITY_LABELS_ES[name] ?? name;
}

const PAIN_CATEGORY_LABELS_ES: Record<string, string> = {
  Operational: "Operativo",
  Commercial: "Comercial",
  Financial: "Financiero",
  Communication: "Comunicación",
  Data: "Datos",
  Compliance: "Cumplimiento",
  Technology: "Tecnología",
  Management: "Dirección",
};

/** Pain point matrix category → Spanish. */
export function painCategoryLabel(category: string): string {
  return PAIN_CATEGORY_LABELS_ES[category] ?? category;
}

const OPPORTUNITY_HORIZON_LABELS_ES: Record<string, string> = {
  "Quick Wins": "Victorias rápidas",
  "30-day": "30 días",
  "30-day Projects": "30 días",
  "90-day": "90 días",
  "90-day Projects": "90 días",
  "6-month": "6 meses",
  "1-year": "1 año",
  strategic: "Estratégico",
  "Strategic Initiatives": "Estratégico",
  Innovation: "Innovación",
};

/** Opportunity/blueprint horizon label → Spanish. */
export function opportunityHorizonLabel(horizon: string): string {
  return OPPORTUNITY_HORIZON_LABELS_ES[horizon] ?? horizon;
}

const EVOLUTION_KIND_LABELS_ES: Record<string, string> = {
  baseline: "Punto de partida",
  maturity_up: "Madurez en aumento",
  maturity_down: "Madurez en descenso",
  module_added: "Módulo agregado",
  module_removed: "Módulo retirado",
  process_added: "Proceso agregado",
  recommendation_added: "Recomendación agregada",
  roadmap_advanced: "Hoja de ruta avanzó",
  work_completed: "Trabajo completado",
  risk_resolved: "Riesgo resuelto",
  risk_emerged: "Nuevo riesgo",
  stage_changed: "Etapa cambiada",
  understanding_up: "Comprensión en aumento",
  understanding_down: "Comprensión en descenso",
  visit: "Visita",
  snapshot: "Instantánea",
};

/** Company evolution timeline entry kind → Spanish. */
export function evolutionKindLabel(kind: string): string {
  return EVOLUTION_KIND_LABELS_ES[kind] ?? kind.replace(/_/g, " ");
}

const PHASE_LABELS_ES: Record<string, string> = {
  Foundation: "Cimientos",
  "Core Sales": "Ventas centrales",
  "Core operations": "Operaciones centrales",
  Operations: "Operaciones",
  Automation: "Automatización",
  "Automation & insight": "Automatización e inteligencia",
  AI: "IA",
  "AI assistance": "Asistencia de IA",
  Control: "Control",
  Leverage: "Apalancamiento",
};

/** Solution/roadmap implementation phase name → Spanish. */
export function phaseLabel(name: string): string {
  return PHASE_LABELS_ES[name] ?? name;
}

const COMPLEXITY_LABELS_ES: Record<string, string> = {
  low: "baja",
  moderate: "moderada",
  high: "alta",
  very_high: "muy alta",
};

/** Implementation phase estimated complexity token → Spanish. */
export function complexityLabel(level: string): string {
  return COMPLEXITY_LABELS_ES[level] ?? level.replace(/_/g, " ");
}

const TIMELINE_ESTIMATE_LABELS_ES: Record<string, string> = {
  "4–8 weeks": "4–8 semanas",
  "2–4 months": "2–4 meses",
  "4–6 months": "4–6 meses",
  "6–12 months": "6–12 meses",
  "12+ months": "12+ meses",
};

/** Discovery report `estimatedTimeline` token → Spanish. */
export function timelineEstimateLabel(estimate: string): string {
  return TIMELINE_ESTIMATE_LABELS_ES[estimate] ?? estimate;
}

const INTEGRATION_STATUS_LABELS_ES: Record<string, string> = {
  current: "Vigente",
  retire: "Por retirar",
  planned: "Planeado",
};

/** Solution integration status token → Spanish. */
export function integrationStatusLabel(status: string): string {
  return INTEGRATION_STATUS_LABELS_ES[status] ?? status;
}

const FUTURE_OUTPUT_STATUS_LABELS_ES: Record<string, string> = {
  designed: "Diseñado",
  planned: "Planeado",
};

/** Future-output ("Documentación futura") status token → Spanish. */
export function futureOutputStatusLabel(status: string): string {
  return FUTURE_OUTPUT_STATUS_LABELS_ES[status] ?? status;
}

const THEME_MODE_LABELS_ES: Record<string, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Según el sistema",
  unknown: "Sin definir",
};

/** Brand theme mode token → Spanish. */
export function themeModeLabel(mode: string): string {
  return THEME_MODE_LABELS_ES[mode] ?? mode;
}

const LOGO_KIND_LABELS_ES: Record<string, string> = {
  primary: "Principal",
  mark: "Isotipo",
  wordmark: "Logotipo tipográfico",
  favicon: "Favicon",
};

/** Brand logo asset kind token → Spanish. */
export function logoKindLabel(kind: string): string {
  return LOGO_KIND_LABELS_ES[kind] ?? kind;
}

const LOGO_STATUS_LABELS_ES: Record<string, string> = {
  unknown: "Sin definir",
  inferred: "Inferido",
  uploaded: "Cargado",
};

/** Brand logo asset status token → Spanish. */
export function logoStatusLabel(status: string): string {
  return LOGO_STATUS_LABELS_ES[status] ?? status;
}

const COLOR_TOKEN_ROLE_LABELS_ES: Record<string, string> = {
  primary: "Primario",
  secondary: "Secundario",
  accent: "Acento",
  neutral: "Neutro",
};

/** Design-token color role → Spanish. */
export function colorTokenRoleLabel(role: string): string {
  return COLOR_TOKEN_ROLE_LABELS_ES[role] ?? role;
}

const TYPOGRAPHY_ROLE_LABELS_ES: Record<string, string> = {
  display: "Display",
  heading: "Encabezado",
  body: "Cuerpo",
  mono: "Monoespaciada",
  label: "Etiqueta",
};

/** Design-token typography role → Spanish. */
export function typographyRoleLabel(role: string): string {
  return TYPOGRAPHY_ROLE_LABELS_ES[role] ?? role;
}

const NAVIGATION_PATTERN_LABELS_ES: Record<string, string> = {
  sidebar: "Barra lateral",
  top_nav: "Navegación superior",
  hub: "Centro (hub)",
  role_based: "Basada en rol",
};

/** Brand navigation pattern token → Spanish. */
export function navigationPatternLabel(pattern: string): string {
  return NAVIGATION_PATTERN_LABELS_ES[pattern] ?? pattern;
}

const MOTION_PREFERENCE_LABELS_ES: Record<string, string> = {
  reduce: "Reducido",
  standard: "Estándar",
  unknown: "Sin definir",
};

/** Accessibility motion preference token → Spanish. */
export function motionPreferenceLabel(pref: string): string {
  return MOTION_PREFERENCE_LABELS_ES[pref] ?? pref;
}

const FONT_SCALE_LABELS_ES: Record<string, string> = {
  standard: "Estándar",
  large: "Grande",
  unknown: "Sin definir",
};

/** Accessibility font scale token → Spanish. */
export function fontScaleLabel(scale: string): string {
  return FONT_SCALE_LABELS_ES[scale] ?? scale;
}

/**
 * Deterministic literals generated by `lib/blueprint/derive.ts` /
 * `lib/blueprint/seed.ts` — display-only lookups, shared by the blueprint
 * panel and the blueprint deliverable preview.
 */
const WORKFLOW_NAME_ES: Record<string, string> = {
  "Sales to Order": "De venta a pedido",
  "Purchasing Approvals": "Aprobaciones de compras",
};

/** Blueprint/process workflow name → Spanish. */
export function workflowNameLabel(name: string): string {
  return WORKFLOW_NAME_ES[name] ?? name;
}

const STEP_NAME_ES: Record<string, string> = {
  "Request raised": "Solicitud levantada",
  "Quotes collected": "Cotizaciones recolectadas",
  Approval: "Aprobación",
  "Order placed": "Pedido colocado",
  "Lead / inquiry": "Prospecto / consulta",
  Quote: "Cotización",
  Close: "Cierre",
};

/** Blueprint/process workflow step name → Spanish. */
export function stepNameLabel(name: string): string {
  return STEP_NAME_ES[name] ?? name;
}

const ACTOR_NAME_ES: Record<string, string> = {
  Requester: "Solicitante",
  Purchasing: "Compras",
  Manager: "Gerente",
  Advisor: "Asesor",
};

/** Blueprint/process workflow actor name → Spanish. */
export function actorNameLabel(name: string): string {
  return ACTOR_NAME_ES[name] ?? name;
}

const TRIGGER_LABELS_ES: Record<string, string> = {
  "Customer inquiry": "Consulta de un cliente",
  "Material or service need": "Necesidad de material o servicio",
};

/** Blueprint/process workflow trigger → Spanish. */
export function triggerLabel(trigger: string): string {
  return TRIGGER_LABELS_ES[trigger] ?? trigger;
}

const REPLACEMENT_STRATEGY_LABELS_ES: Record<string, string> = {
  "Absorb into ISALWA modules while retaining familiar habits during transition.":
    "Absorber en los módulos de ISALWA conservando los hábitos familiares durante la transición.",
  "Integrate or phase out based on capability coverage.":
    "Integrar o retirar gradualmente según la cobertura de las nuevas capacidades.",
};

/** System replacement strategy sentence → Spanish. */
export function replacementStrategyLabel(statement: string): string {
  return REPLACEMENT_STRATEGY_LABELS_ES[statement] ?? statement;
}

const OPPORTUNITY_TITLE_LABELS_ES: Record<string, string> = {
  "Centralize customer history": "Centralizar el historial de clientes",
  "Business OS foundation": "Cimientos del sistema operativo del negocio",
};

/** Blueprint opportunity title → Spanish. */
export function opportunityTitleLabel(title: string): string {
  return OPPORTUNITY_TITLE_LABELS_ES[title] ?? title;
}

const OPPORTUNITY_DESCRIPTION_LABELS_ES: Record<string, string> = {
  "Move critical commercial context out of personal chat into a shared system.":
    "Sacar el contexto comercial crítico del chat personal y llevarlo a un sistema compartido.",
  "Establish core modules that replace spreadsheet-and-chat operating modes.":
    "Establecer los módulos centrales que reemplazan la operación por hojas de cálculo y chat.",
};

/** Blueprint opportunity description → Spanish. */
export function opportunityDescriptionLabel(description: string): string {
  return OPPORTUNITY_DESCRIPTION_LABELS_ES[description] ?? description;
}

const RULE_STATEMENT_LABELS_ES: Record<string, string> = {
  "Purchases above a materiality threshold require multiple quotations and managerial approval.":
    "Las compras por encima de un umbral relevante requieren varias cotizaciones y aprobación gerencial.",
  "Collections follow-up begins after invoice aging thresholds.":
    "El seguimiento de cobranza inicia al superar los umbrales de antigüedad de la factura.",
  "Operating rules will be captured as discovery and knowledge deepen.":
    "Las reglas de operación se irán registrando a medida que avancen el descubrimiento y el conocimiento.",
};

/** Operating rule statement → Spanish. */
export function ruleStatementLabel(statement: string): string {
  return RULE_STATEMENT_LABELS_ES[statement] ?? statement;
}

/** `lib/blueprint/derive.ts` always phrases capability purpose this way. */
export function capabilityPurposeLabel(name: string, purpose: string): string {
  if (purpose === `Enable ${name.toLowerCase()} as a durable operating capability.`) {
    return `Habilita ${moduleLabel(name).toLowerCase()} como una capacidad operativa duradera.`;
  }
  return purpose;
}

/** `lib/blueprint/derive.ts` always phrases system purpose this way. */
export function systemPurposeLabel(name: string, purpose: string): string {
  if (purpose === `Currently supports day-to-day work via ${name}.`) {
    return `Hoy el trabajo diario se apoya en ${name}.`;
  }
  return purpose;
}
