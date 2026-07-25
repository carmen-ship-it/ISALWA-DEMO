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
    label: "Manufacturing",
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
      "order intake",
      "production planning",
      "quality",
      "inventory",
      "shipping",
    ],
    starterQuestions: [
      "How do sales currently work?",
      "How do production orders get created?",
      "Where is bill-of-materials information kept?",
      "What causes delays on the shop floor?",
    ],
  },
  {
    id: "construction",
    label: "Construction",
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
      "estimating",
      "project delivery",
      "change orders",
      "field communication",
      "billing",
    ],
    starterQuestions: [
      "How do you win and start a new job?",
      "How do change orders get approved today?",
      "How does the field communicate with the office?",
      "Where do project documents live?",
    ],
  },
  {
    id: "distribution",
    label: "Distribution",
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
      "order entry",
      "inventory accuracy",
      "picking",
      "routing",
      "purchasing",
    ],
    starterQuestions: [
      "How do customers place orders?",
      "How accurate is inventory today?",
      "What slows down picking and shipping?",
      "How do purchase decisions get made?",
    ],
  },
  {
    id: "healthcare",
    label: "Healthcare",
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
      "scheduling",
      "intake",
      "documentation",
      "billing",
      "follow-up",
    ],
    starterQuestions: [
      "How do patients currently schedule and arrive?",
      "Where is clinical and administrative information stored?",
      "What causes bottlenecks in daily operations?",
      "How do handoffs between roles work?",
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
      "sales floor",
      "inventory",
      "customer history",
      "returns",
      "omnichannel",
    ],
    starterQuestions: [
      "How do sales currently happen across channels?",
      "Where is customer history kept?",
      "What inventory problems appear most often?",
      "What creates friction for staff during a busy day?",
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
    title: "Voice interviews",
    description: "Spoken discovery sessions with the same Architect depth.",
    status: "designed",
  },
  {
    id: "document_upload",
    title: "Document upload",
    description: "Ingest process docs, SOPs, and org materials as evidence.",
    status: "designed",
  },
  {
    id: "org_charts",
    title: "Org charts",
    description: "Capture reporting lines and decision ownership.",
    status: "designed",
  },
  {
    id: "photo_analysis",
    title: "Photo analysis",
    description: "Read whiteboards, shop floors, and workspace photos.",
    status: "designed",
  },
  {
    id: "process_diagrams",
    title: "Process diagrams",
    description: "Turn conversation into living workflow maps.",
    status: "designed",
  },
  {
    id: "erp_imports",
    title: "ERP imports",
    description: "Import current ERP structure as discovery context.",
    status: "designed",
  },
  {
    id: "crm_imports",
    title: "CRM imports",
    description: "Import CRM objects to understand commercial reality.",
    status: "designed",
  },
  {
    id: "whatsapp_imports",
    title: "WhatsApp imports",
    description: "Detect shadow processes living in messaging apps.",
    status: "designed",
  },
  {
    id: "email_analysis",
    title: "Email analysis",
    description: "Find approvals, bottlenecks, and missing systems in mail.",
    status: "designed",
  },
  {
    id: "meeting_transcript_analysis",
    title: "Meeting transcript analysis",
    description: "Mine workshops and leadership meetings for signal.",
    status: "designed",
  },
];

export const WELCOME_MESSAGE = `Hola.

Soy el Arquitecto de ISALWA.

Le ayudaré a diseñar el sistema operativo de su empresa.

Antes de hablar de software, necesito entender cómo funciona realmente el negocio.

Esto suele tomar entre 20 y 30 minutos.

¿Listo?`;
