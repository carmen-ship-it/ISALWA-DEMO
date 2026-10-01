/**
 * Planificación ISALWA — static Spanish client-facing content.
 * Demo planning bands from Implementation Readiness Audit (2026-08-23).
 * Not contractual prices or delivery dates.
 */

import type {
  PlanificacionEffortBand,
  PlanificacionItemStatus,
} from "@/types";

export interface PlanificacionCommercialFeature {
  id: string;
  name: string;
  description: string;
  status: PlanificacionItemStatus;
  statusNote: string;
}

export interface PlanificacionPhase {
  id: string;
  phase: number;
  name: string;
  summary: string;
  status: PlanificacionItemStatus;
  effortBand: PlanificacionEffortBand;
  dependencies: string[];
  includes: string[];
}

export interface PlanificacionCostItem {
  id: string;
  title: string;
  purpose: string;
  recommended: string;
  alternative: string;
  costBand: string;
  whenNeeded: string;
}

export interface PlanificacionSecurityItem {
  id: string;
  label: string;
  status: PlanificacionItemStatus;
  note: string;
}

export interface PlanificacionFutureDepartment {
  name: string;
  summary: string;
}

export const PLANIFICACION_PRINCIPLE =
  "Trabajamos por prioridades, dependencias y validaciones, no por fechas prometidas.";

export const PLANIFICACION_DEMO_DATA_NOTICE =
  "Estamos utilizando información de demostración mientras terminamos las capas necesarias para operar con información real. La información real de clientes se incorporará de forma gradual y controlada.";

export const PLANIFICACION_COST_DISCLAIMER =
  "Estimación preliminar — se actualizará antes de contratación.";

export const COMMERCIAL_FOCUS_LABEL = "Área Comercial";

export const COMMERCIAL_FEATURES: PlanificacionCommercialFeature[] = [
  {
    id: "pulso",
    name: "Pulso",
    description:
      "Vista ejecutiva para conocer rápidamente el estado comercial: ventas, cobranzas, visitas y WhatsApp en un solo lugar.",
    status: "completado",
    statusNote: "Versión demo con datos de demostración — no datos reales de ISALWA.",
  },
  {
    id: "radar",
    name: "Radar",
    description:
      "Lista priorizada de clientes y situaciones que requieren atención hoy: visitas vencidas, cartera en riesgo, mensajes sin responder.",
    status: "completado",
    statusNote: "Versión demo con datos de demostración.",
  },
  {
    id: "personas",
    name: "Personas",
    description:
      "Información consolidada de cada cliente: historial, cotizaciones, visitas, conversaciones y saldos en un solo perfil.",
    status: "completado",
    statusNote: "Versión demo con datos de demostración.",
  },
  {
    id: "territorio",
    name: "Territorio",
    description:
      "Mapa y cobertura de clientes para asesores de campo: zonas, salud comercial y actividad por territorio.",
    status: "completado",
    statusNote: "Versión demo con datos de demostración.",
  },
  {
    id: "senal",
    name: "Señal",
    description:
      "Gestión de conversaciones de WhatsApp corporativo: bandeja, historial vinculado al cliente y seguimiento.",
    status: "completado",
    statusNote: "Bandeja demo — integración Meta/WhatsApp Business pendiente para producción.",
  },
  {
    id: "cierre",
    name: "Cierre",
    description:
      "Ciclo comercial completo: cotización → pedido → factura → pago, con memoria del último precio por cliente.",
    status: "completado",
    statusNote: "Versión demo — facturación SIN y PDF formal pendientes.",
  },
];

export const IMPLEMENTATION_PHASES: PlanificacionPhase[] = [
  {
    id: "fase-0",
    phase: 0,
    name: "Definición y preparación",
    summary:
      "Consolidar lo descubierto en Architect, validar alcance comercial y preparar la planificación con ISALWA.",
    status: "en_progreso",
    effortBand: "medio",
    dependencies: ["Participación de dirección y área comercial"],
    includes: [
      "Planificación ISALWA visible para dirección",
      "Lista de datos y decisiones pendientes",
      "Documentos y procesos de referencia",
    ],
  },
  {
    id: "fase-1",
    phase: 1,
    name: "Base comercial",
    summary:
      "Seguridad, roles y estructura base del sistema operativo comercial antes de datos reales.",
    status: "en_progreso",
    effortBand: "alto",
    dependencies: ["Fase 0 validada", "Decisiones de alcance aprobadas"],
    includes: [
      "Inicio de sesión y permisos por rol",
      "Protección de API y separación de datos",
      "Preparación para importación controlada",
    ],
  },
  {
    id: "fase-2",
    phase: 2,
    name: "Operación comercial piloto",
    summary:
      "Pilotos con usuarios reales en el área comercial: clientes, catálogo y cotización con datos de ISALWA.",
    status: "pendiente",
    effortBand: "alto",
    dependencies: [
      "Fase 1 completada",
      "Lista de clientes y productos recibida",
      "Usuarios piloto definidos",
    ],
    includes: [
      "Datos reales en entorno seguro",
      "Pulso, Personas, Territorio, Cierre operativos",
      "Capacitación del equipo piloto",
    ],
  },
  {
    id: "fase-3",
    phase: 3,
    name: "WhatsApp y cobranzas",
    summary:
      "Líneas corporativas de WhatsApp en producción y flujos de cobranza integrados.",
    status: "pendiente",
    effortBand: "dependiente_terceros",
    dependencies: [
      "Fase 2 en operación",
      "Cuenta WhatsApp Business / Meta aprobada",
    ],
    includes: [
      "Señal con mensajes reales",
      "Cobranzas y promesas de pago",
      "Enlaces desde chat a cotización y cliente",
    ],
  },
  {
    id: "fase-4",
    phase: 4,
    name: "Expansión a otras áreas",
    summary:
      "Extender el mismo sistema a finanzas, almacén, operaciones, producción y compras.",
    status: "fase_futura",
    effortBand: "alto",
    dependencies: ["Área comercial estabilizada en producción"],
    includes: [
      "Finanzas y cobranzas profunda",
      "Almacén e inventario en cotización",
      "Operaciones, producción y compras",
    ],
  },
];

export const FUTURE_DEPARTMENTS: PlanificacionFutureDepartment[] = [
  {
    name: "Finanzas",
    summary: "Cobranzas, facturación y reportes financieros vinculados al ciclo comercial.",
  },
  {
    name: "Almacén",
    summary: "Stock, despacho y disponibilidad en cotización.",
  },
  {
    name: "Operaciones",
    summary: "Pedidos, entregas y coordinación logística.",
  },
  {
    name: "Producción",
    summary: "Fabricación y calidad conectada al timeline del cliente.",
  },
  {
    name: "Compras",
    summary: "Aprobaciones y órdenes de compra.",
  },
];

export const COST_ITEMS: PlanificacionCostItem[] = [
  {
    id: "domain",
    title: "Dominio",
    purpose: "Nombre web profesional (ej. app.isalwa.com).",
    recommended: "Registrador del cliente + DNS en Vercel o Cloudflare",
    alternative: "Subdominio temporal en hosting",
    costBand: "Aprox. USD 10–20 / año",
    whenNeeded: "Antes del piloto externo",
  },
  {
    id: "hosting",
    title: "Hosting",
    purpose: "Ejecutar Architect (planificación) y ISALWA OS (operación).",
    recommended: "Vercel (web) + servicio para API",
    alternative: "AWS / Railway / Fly.io",
    costBand: "Demo: USD 0–20 / mes · Piloto: USD 55–190 / mes · Producción: USD 200–500+ / mes",
    whenNeeded: "Piloto y producción",
  },
  {
    id: "database",
    title: "Base de datos",
    purpose: "Almacenar clientes, cotizaciones, facturas y usuarios.",
    recommended: "Postgres administrado (Neon, Supabase o servidor dedicado)",
    alternative: "Postgres en servidor propio",
    costBand: "Piloto: USD 25–50 / mes · Producción: USD 50–150 / mes",
    whenNeeded: "Piloto con datos reales",
  },
  {
    id: "storage",
    title: "Almacenamiento de archivos",
    purpose: "PDFs, cotizaciones y documentos adjuntos.",
    recommended: "S3 / Supabase Storage / Cloudflare R2",
    alternative: "MinIO en servidor",
    costBand: "USD 5–30 / mes según volumen",
    whenNeeded: "Cuando se envían PDF y archivos",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business (Meta)",
    purpose: "Mensajes corporativos en Señal.",
    recommended: "Meta Cloud API directa",
    alternative: "Proveedor BSP autorizado",
    costBand: "Variable por conversación — depende del volumen de mensajes",
    whenNeeded: "Fase 3 — dependiente de aprobación Meta",
  },
  {
    id: "maps",
    title: "Mapas",
    purpose: "Territorio y ubicación de clientes.",
    recommended: "Mapbox (plan gratuito inicial)",
    alternative: "OpenStreetMap / MapLibre sin proveedor",
    costBand: "USD 0–50 / mes según uso",
    whenNeeded: "Piloto con mapa en campo",
  },
  {
    id: "email",
    title: "Email transaccional",
    purpose: "Envío de cotizaciones y alertas.",
    recommended: "Resend o Postmark",
    alternative: "Amazon SES",
    costBand: "USD 10–50 / mes según volumen",
    whenNeeded: "Cuando se envían cotizaciones por email",
  },
  {
    id: "ai",
    title: "Inteligencia artificial (opcional)",
    purpose: "OCR de documentos, resúmenes y asistencia en WhatsApp.",
    recommended: "OpenAI o Gemini vía configuración",
    alternative: "Sin IA — funciones determinísticas",
    costBand: "USD 0–500+ / mes según uso — opcional",
    whenNeeded: "Solo si ISALWA aprueba uso de IA",
  },
  {
    id: "monitoring",
    title: "Monitoreo y errores",
    purpose: "Detectar fallas antes que los usuarios.",
    recommended: "Sentry + monitoreo de disponibilidad",
    alternative: "Logs del proveedor de hosting",
    costBand: "USD 0–30 / mes",
    whenNeeded: "Producción",
  },
  {
    id: "backups",
    title: "Respaldos",
    purpose: "Recuperación ante fallas o errores humanos.",
    recommended: "Backups automáticos del proveedor de base de datos",
    alternative: "Respaldos programados en servidor",
    costBand: "Incluido o USD 10–20 / mes",
    whenNeeded: "Antes de datos reales en producción",
  },
];

export const SECURITY_ITEMS: PlanificacionSecurityItem[] = [
  {
    id: "architect",
    label: "Architect (planificación)",
    status: "completado",
    note: "Completado para piloto de planificación — login, roles y almacenamiento de documentos.",
  },
  {
    id: "os",
    label: "ISALWA OS (operación)",
    status: "en_progreso",
    note: "En preparación — versión demo operativa; producción pendiente.",
  },
  {
    id: "auth",
    label: "Autenticación (inicio de sesión)",
    status: "en_progreso",
    note: "Planificado — requisito antes de datos reales.",
  },
  {
    id: "rbac",
    label: "Roles y permisos",
    status: "en_progreso",
    note: "Modelo definido — aplicación en sistema operativo en curso.",
  },
  {
    id: "api",
    label: "Protección de API",
    status: "pendiente",
    note: "Requisito antes de piloto con datos reales.",
  },
  {
    id: "tenant",
    label: "Separación de datos por empresa",
    status: "pendiente",
    note: "Requisito antes de piloto con datos reales.",
  },
  {
    id: "backups",
    label: "Respaldos y recuperación",
    status: "pendiente",
    note: "Requisito antes de producción.",
  },
  {
    id: "whatsapp_prod",
    label: "WhatsApp en producción",
    status: "pendiente",
    note: "Dependiente de Meta y credenciales corporativas.",
  },
  {
    id: "real_data",
    label: "Datos reales de clientes en OS",
    status: "bloqueado",
    note: "NO CARGAR TODAVÍA — requiere autenticación, permisos, API protegida y respaldos.",
  },
];

export const STATUS_LABELS: Record<PlanificacionItemStatus, string> = {
  completado: "Completado",
  en_progreso: "En progreso",
  pendiente: "Pendiente",
  bloqueado: "Bloqueado",
  decision_isalwa: "Decisión de ISALWA",
  fase_futura: "Fase futura",
};

export const GOVERNANCE_STATUS_LABELS: Record<
  import("@/types").PlanificacionGovernanceStatus,
  string
> = {
  propuesta: "Propuesta de Architect",
  requiere_confirmacion: "Requiere confirmación",
  decision_isalwa: "Decisión de ISALWA",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
};

export const QUESTION_STATUS_LABELS: Record<
  import("@/types").PlanificacionQuestionStatus,
  string
> = {
  pendiente: "Pendiente",
  respondido: "Respondido",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  revisar_mas_adelante: "Revisar más adelante",
};

export const DATA_REQ_STATUS_LABELS: Record<
  import("@/types").PlanificacionDataReqStatus,
  string
> = {
  pendiente: "Pendiente",
  recibido: "Recibido",
  en_revision: "En revisión",
  aprobado: "Aprobado",
};

export const DECISION_STATUS_LABELS: Record<
  import("@/types").PlanificacionDecisionStatus,
  string
> = {
  pendiente: "Pendiente",
  respondido: "Respondido",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  revisar_mas_adelante: "Revisar más adelante",
};

export const EFFORT_BAND_LABELS: Record<PlanificacionEffortBand, string> = {
  pequeno: "Pequeño",
  medio: "Medio",
  alto: "Alto",
  requiere_validacion: "Requiere validación",
  dependiente_terceros: "Dependiente de terceros",
};
