import type {
  Choice,
  FutureCapability,
  IndustryProfile,
  ParticipantRole,
} from "@/types";

export const ROLE_CHOICES: Choice[] = [
  { id: "founder", label: "Fundador", value: "founder" },
  { id: "owner", label: "Dueño", value: "owner" },
  { id: "sales", label: "Ventas", value: "sales" },
  { id: "operations", label: "Operaciones", value: "operations" },
  { id: "finance", label: "Finanzas", value: "finance" },
  { id: "production", label: "Producción", value: "production" },
  { id: "support", label: "Soporte", value: "support" },
  { id: "other", label: "Otro", value: "other" },
];

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  founder: "Fundador",
  owner: "Dueño",
  sales: "Ventas",
  operations: "Operaciones",
  finance: "Finanzas",
  production: "Producción",
  support: "Soporte",
  other: "Otro",
};

export const ESTIMATED_INTERVIEW_MINUTES = 25;

export const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    id: "manufacturing",
    label: "Manufactura",
    keywords: [
      "manufacturing",
      "factory",
      "production line",
      "plant",
      "machining",
      "assembly",
      "bom",
      "work order",
      "shop floor",
    ],
    focusAreas: [
      "captura de pedidos",
      "planificación de producción",
      "calidad",
      "inventario",
      "envíos",
    ],
    starterQuestions: [
      "¿Cómo funcionan las ventas actualmente?",
      "¿Cómo se crean las órdenes de producción?",
      "¿Dónde se guarda la información de lista de materiales?",
      "¿Qué causa retrasos en el piso de producción?",
    ],
  },
  {
    id: "construction",
    label: "Construcción",
    keywords: [
      "construction",
      "contractor",
      "job site",
      "bid",
      "estimate",
      "subcontractor",
      "project manager",
      "change order",
      "field crew",
    ],
    focusAreas: [
      "estimación",
      "entrega de proyectos",
      "órdenes de cambio",
      "comunicación de campo",
      "facturación",
    ],
    starterQuestions: [
      "¿Cómo ganan y arrancan un proyecto nuevo?",
      "¿Cómo se aprueban hoy las órdenes de cambio?",
      "¿Cómo se comunica el campo con la oficina?",
      "¿Dónde viven los documentos del proyecto?",
    ],
  },
  {
    id: "distribution",
    label: "Distribución",
    keywords: [
      "distribution",
      "wholesale",
      "warehouse",
      "fulfillment",
      "logistics",
      "inventory",
      "shipping",
      "purchase order",
      "route",
    ],
    focusAreas: [
      "captura de pedidos",
      "exactitud de inventario",
      "picking",
      "ruteo",
      "compras",
    ],
    starterQuestions: [
      "¿Cómo hacen los clientes sus pedidos?",
      "¿Qué tan exacto es el inventario hoy?",
      "¿Qué hace más lento el picking y el envío?",
      "¿Cómo se toman las decisiones de compra?",
    ],
  },
  {
    id: "healthcare",
    label: "Salud",
    keywords: [
      "healthcare",
      "clinic",
      "patient",
      "medical",
      "hospital",
      "practice",
      "appointment",
      "insurance",
      "care",
    ],
    focusAreas: [
      "agendamiento",
      "admisión",
      "documentación",
      "facturación",
      "seguimiento",
    ],
    starterQuestions: [
      "¿Cómo agendan y llegan hoy los pacientes?",
      "¿Dónde se guarda la información clínica y administrativa?",
      "¿Qué causa cuellos de botella en la operación diaria?",
      "¿Cómo funcionan los traspasos entre roles?",
    ],
  },
  {
    id: "retail",
    label: "Retail",
    keywords: [
      "retail",
      "store",
      "shop",
      "pos",
      "point of sale",
      "ecommerce",
      "e-commerce",
      "customers",
      "merchandising",
    ],
    focusAreas: [
      "piso de venta",
      "inventario",
      "historial de clientes",
      "devoluciones",
      "omnicanalidad",
    ],
    starterQuestions: [
      "¿Cómo ocurren hoy las ventas entre canales?",
      "¿Dónde se guarda el historial de clientes?",
      "¿Qué problemas de inventario aparecen con más frecuencia?",
      "¿Qué genera fricción para el personal en un día de mucho movimiento?",
    ],
  },
  {
    id: "services",
    label: "Servicios",
    keywords: [
      "services",
      "servicios",
      "agency",
      "agencia",
      "consulting",
      "consultoría",
      "consultoria",
      "professional services",
      "servicios profesionales",
      "clients",
      "clientes",
      "retainer",
      "engagement",
      "entregables",
      "deliverables",
    ],
    focusAreas: [
      "intake",
      "delivery",
      "utilization",
      "billing",
      "knowledge",
    ],
    starterQuestions: [
      "¿Cómo comienzan los nuevos encargos o proyectos?",
      "¿Cómo se asigna y se da seguimiento al trabajo?",
      "¿Dónde vive el contexto del cliente entre personas?",
      "¿Qué causa traspasos fallidos o aumento de alcance?",
    ],
  },
];

export const UNIVERSAL_INTERVIEW_TOPICS = [
  "sales_motion",
  "order_intake",
  "customer_contact",
  "information_storage",
  "bottlenecks",
  "mistakes",
  "current_software",
  "disappearance_test",
  "one_fix",
] as const;

export const FUTURE_CAPABILITIES: FutureCapability[] = [
  {
    id: "voice_interviews",
    title: "Entrevistas por voz",
    description: "Sesiones de descubrimiento habladas con la misma profundidad de Architect.",
    status: "designed",
  },
  {
    id: "document_upload",
    title: "Carga de documentos",
    description: "Ingerir documentos de proceso, procedimientos y materiales de la empresa como evidencia.",
    status: "designed",
  },
  {
    id: "org_charts",
    title: "Organigramas",
    description: "Capturar líneas de reporte y propiedad de decisiones.",
    status: "designed",
  },
  {
    id: "photo_analysis",
    title: "Análisis de fotos",
    description: "Leer pizarrones, pisos de producción y fotos del espacio de trabajo.",
    status: "designed",
  },
  {
    id: "process_diagrams",
    title: "Diagramas de proceso",
    description: "Convertir la conversación en mapas de flujo de trabajo vivos.",
    status: "designed",
  },
  {
    id: "erp_imports",
    title: "Importación de ERP",
    description: "Importar la estructura del ERP actual como contexto de descubrimiento.",
    status: "designed",
  },
  {
    id: "crm_imports",
    title: "Importación de CRM",
    description: "Importar objetos del CRM para entender la realidad comercial.",
    status: "designed",
  },
  {
    id: "whatsapp_imports",
    title: "Importación de WhatsApp",
    description: "Detectar procesos informales que viven en aplicaciones de mensajería.",
    status: "designed",
  },
  {
    id: "email_analysis",
    title: "Análisis de correo",
    description: "Encontrar aprobaciones, cuellos de botella y sistemas faltantes en el correo.",
    status: "designed",
  },
  {
    id: "meeting_transcript_analysis",
    title: "Análisis de transcripciones de reuniones",
    description: "Extraer señales de talleres y reuniones de liderazgo.",
    status: "designed",
  },
];

export const WELCOME_MESSAGE = `Hola.

Soy el Arquitecto de ISALWA.

Le ayudaré a diseñar el sistema operativo de su empresa.

Antes de hablar de software, necesito entender cómo funciona realmente el negocio.

Esto suele tomar entre 20 y 30 minutos.

¿Listo?`;
