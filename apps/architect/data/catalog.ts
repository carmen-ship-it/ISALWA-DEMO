import type {
  Choice,
  FutureCapability,
  IndustryProfile,
  ParticipantRole,
} from "@/types";

export const ROLE_CHOICES: Choice[] = [
  { id: "founder", label: "Founder", value: "founder" },
  { id: "owner", label: "Owner", value: "owner" },
  { id: "sales", label: "Sales", value: "sales" },
  { id: "operations", label: "Operations", value: "operations" },
  { id: "finance", label: "Finance", value: "finance" },
  { id: "production", label: "Production", value: "production" },
  { id: "support", label: "Support", value: "support" },
  { id: "other", label: "Other", value: "other" },
];

export const ROLE_LABELS: Record<ParticipantRole, string> = {
  founder: "Founder",
  owner: "Owner",
  sales: "Sales",
  operations: "Operations",
  finance: "Finance",
  production: "Production",
  support: "Support",
  other: "Other",
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
    label: "Services",
    keywords: [
      "services",
      "agency",
      "consulting",
      "professional services",
      "clients",
      "retainer",
      "engagement",
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
      "How do new engagements begin?",
      "How is work assigned and tracked?",
      "Where does client context live between people?",
      "What causes missed handoffs or scope creep?",
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

export const WELCOME_MESSAGE = `Hello.

I'm the ISALWA Architect.

I'll help design your future operating system.

Before we discuss software, I need to understand how your business actually works.

This usually takes about 20–30 minutes.

Ready?`;
