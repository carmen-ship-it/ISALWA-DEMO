import { createId } from "@/lib/utils";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeEntity,
  KnowledgeRelationKind,
  KnowledgeRelationship,
  TimelineEvent,
  WorkspaceKnowledge,
} from "@/types";
import { buildWorkspaceKnowledge, emptyWorkspaceKnowledge } from "./coverage";

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function asset(input: Omit<KnowledgeAsset, "id"> & { id?: string }): KnowledgeAsset {
  return {
    id: input.id ?? createId("asset"),
    ...input,
  };
}

function entity(
  input: Omit<KnowledgeEntity, "id" | "metadata"> & {
    id?: string;
    metadata?: Record<string, string>;
  },
): KnowledgeEntity {
  return {
    id: input.id ?? createId("entity"),
    metadata: input.metadata ?? {},
    ...input,
  };
}

function rel(input: {
  workspaceId: string;
  kind: KnowledgeRelationKind;
  fromEntityId: string;
  toEntityId: string;
  label: string;
  sourceAssetIds: string[];
  confidence: number;
}): KnowledgeRelationship {
  return {
    id: createId("rel"),
    ...input,
  };
}

/** Mock knowledge vaults — architecture demo, not live ingestion. */
export function createSeedKnowledge(workspaceId: string): WorkspaceKnowledge {
  switch (workspaceId) {
    case "ws_acme":
      return seedAcme(workspaceId);
    case "ws_isalwa":
      return seedLight(workspaceId, {
        summary:
          "Two strategy decks and a project handoff note were reviewed before the last session.",
        themes: [
          "Consulting knowledge lives in people",
          "Project handoffs lose context",
        ],
        days: 4,
      });
    case "ws_viaggio":
      return seedLight(workspaceId, {
        summary:
          "A customer list export and one logistics spreadsheet were staged for analysis.",
        themes: ["Orders tracked in chat", "Inventory visibility gaps"],
        days: 8,
      });
    case "ws_abc":
      return emptyWorkspaceKnowledge();
    default:
      return emptyWorkspaceKnowledge();
  }
}

function seedAcme(workspaceId: string): WorkspaceKnowledge {
  const uploaded = daysAgo(5);
  const processed = daysAgo(4);

  const customerDb = asset({
    id: "asset_acme_customers",
    workspaceId,
    title: "Customer Database Export",
    type: "customer_list",
    category: "Customer Lists",
    source: "excel · mock",
    status: "processed",
    uploadedAt: uploaded,
    processedAt: processed,
    summary: "≈500 active customers; history fields sparse; WhatsApp noted as channel.",
    tags: ["customers", "crm", "whatsapp"],
    confidence: 0.88,
    entities: [],
    relationships: [],
    coverageAreas: ["Customers", "Sales"],
  });

  const salesHistory = asset({
    id: "asset_acme_sales",
    workspaceId,
    title: "Sales History 2024–2025",
    type: "sales_data",
    category: "Sales Data",
    source: "excel · mock",
    status: "processed",
    uploadedAt: daysAgo(5),
    processedAt: daysAgo(4),
    summary: "Three advisors drive most volume; deal stages inconsistent.",
    tags: ["sales", "advisors", "pipeline"],
    confidence: 0.82,
    entities: [],
    relationships: [],
    coverageAreas: ["Sales", "Customers"],
  });

  const purchasingPolicy = asset({
    id: "asset_acme_purchasing",
    workspaceId,
    title: "Purchasing Policy v2",
    type: "policy",
    category: "Policies",
    source: "pdf · mock",
    status: "processed",
    uploadedAt: daysAgo(3),
    processedAt: daysAgo(3),
    summary: "Approvals are multi-step and mostly manual; no system of record named.",
    tags: ["purchasing", "approvals", "policy"],
    confidence: 0.79,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations", "Finance"],
  });

  const transcript = asset({
    id: "asset_acme_transcript",
    workspaceId,
    title: "Discovery Session 1 Transcript",
    type: "meeting_transcript",
    category: "Meeting Transcripts",
    source: "interview · mock",
    status: "processed",
    uploadedAt: daysAgo(1),
    processedAt: daysAgo(1),
    summary: "Confirmed Excel/WhatsApp pain; Production still open.",
    tags: ["discovery", "transcript"],
    confidence: 0.9,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations", "Sales"],
  });

  const futureCrm = asset({
    id: "asset_acme_future_crm",
    workspaceId,
    title: "CRM Full Export",
    type: "future_import",
    category: "Future Imports",
    source: "hubspot · designed",
    status: "designed",
    uploadedAt: daysAgo(0),
    processedAt: null,
    summary: null,
    tags: ["crm", "future"],
    confidence: 0,
    entities: [],
    relationships: [],
    coverageAreas: ["Customers", "Sales"],
  });

  const assets = [
    customerDb,
    salesHistory,
    purchasingPolicy,
    transcript,
    futureCrm,
  ];

  const company = entity({
    id: "ent_acme_company",
    workspaceId,
    kind: "Company",
    name: "Acme",
    summary: "Manufacturing company with commercial motion in WhatsApp + Excel.",
    sourceAssetIds: [customerDb.id, salesHistory.id, transcript.id],
    confidence: 0.92,
  });
  const alvaro = entity({
    id: "ent_acme_alvaro",
    workspaceId,
    kind: "Person",
    name: "Álvaro",
    summary: "Primary discovery contact / founder.",
    sourceAssetIds: [transcript.id],
    confidence: 0.95,
  });
  const salesDept = entity({
    id: "ent_acme_sales",
    workspaceId,
    kind: "Department",
    name: "Sales",
    summary: "Three advisors; pipeline visibility weak.",
    sourceAssetIds: [salesHistory.id],
    confidence: 0.84,
  });
  const purchasing = entity({
    id: "ent_acme_purchasing_wf",
    workspaceId,
    kind: "Workflow",
    name: "Purchasing approvals",
    summary: "Manual multi-step approvals with no durable system.",
    sourceAssetIds: [purchasingPolicy.id],
    confidence: 0.8,
  });
  const excel = entity({
    id: "ent_acme_excel",
    workspaceId,
    kind: "System",
    name: "Excel",
    summary: "Primary operational store across teams.",
    sourceAssetIds: [salesHistory.id, transcript.id],
    confidence: 0.9,
  });
  const whatsapp = entity({
    id: "ent_acme_wa",
    workspaceId,
    kind: "System",
    name: "WhatsApp",
    summary: "Customer history and deal context live in chat.",
    sourceAssetIds: [customerDb.id, transcript.id],
    confidence: 0.88,
  });
  const painExcel = entity({
    id: "ent_acme_pain_excel",
    workspaceId,
    kind: "PainPoint",
    name: "Excel everywhere",
    summary: "Recurring theme across sales and ops documents.",
    sourceAssetIds: [salesHistory.id, transcript.id],
    confidence: 0.86,
  });

  const entities = [
    company,
    alvaro,
    salesDept,
    purchasing,
    excel,
    whatsapp,
    painExcel,
  ];

  const relationships = [
    rel({
      workspaceId,
      kind: "Owns",
      fromEntityId: alvaro.id,
      toEntityId: company.id,
      label: "Founder owns company context",
      sourceAssetIds: [transcript.id],
      confidence: 0.9,
    }),
    rel({
      workspaceId,
      kind: "Uses",
      fromEntityId: salesDept.id,
      toEntityId: excel.id,
      label: "Sales relies on spreadsheets",
      sourceAssetIds: [salesHistory.id],
      confidence: 0.85,
    }),
    rel({
      workspaceId,
      kind: "CommunicatesWith",
      fromEntityId: salesDept.id,
      toEntityId: whatsapp.id,
      label: "Customer conversations on WhatsApp",
      sourceAssetIds: [customerDb.id],
      confidence: 0.87,
    }),
    rel({
      workspaceId,
      kind: "Approves",
      fromEntityId: purchasing.id,
      toEntityId: company.id,
      label: "Purchasing approvals gate spend",
      sourceAssetIds: [purchasingPolicy.id],
      confidence: 0.78,
    }),
    rel({
      workspaceId,
      kind: "DependsOn",
      fromEntityId: salesDept.id,
      toEntityId: whatsapp.id,
      label: "Commercial history depends on chat",
      sourceAssetIds: [customerDb.id, transcript.id],
      confidence: 0.84,
    }),
  ];

  customerDb.entities = [company.id, whatsapp.id];
  salesHistory.entities = [salesDept.id, excel.id, painExcel.id];
  purchasingPolicy.entities = [purchasing.id];
  transcript.entities = [alvaro.id, company.id, painExcel.id];
  customerDb.relationships = [relationships[2]?.id ?? ""].filter(Boolean);
  salesHistory.relationships = [relationships[1]?.id ?? ""].filter(Boolean);

  return buildWorkspaceKnowledge({
    assets,
    entities,
    relationships,
    summary:
      "Three documents and one transcript were analyzed before the latest session. Recurring themes: Excel sprawl, WhatsApp as CRM, and manual purchasing.",
    themes: [
      "Excel everywhere",
      "Lost WhatsApp history",
      "No purchasing workflow",
      "Advisor-driven sales with weak pipeline structure",
    ],
    lastAnalysisAt: processed,
  });
}

function seedLight(
  workspaceId: string,
  opts: { summary: string; themes: string[]; days: number },
): WorkspaceKnowledge {
  const processed = daysAgo(opts.days);
  const deck = asset({
    workspaceId,
    title: "Operating Overview Deck",
    type: "presentation",
    category: "Presentations",
    source: "powerpoint · mock",
    status: "processed",
    uploadedAt: daysAgo(opts.days + 1),
    processedAt: processed,
    summary: opts.summary,
    tags: ["overview"],
    confidence: 0.7,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations", "Sales"],
  });
  const processDoc = asset({
    workspaceId,
    title: "Process Notes",
    type: "process_document",
    category: "Process Documents",
    source: "word · mock",
    status: "processed",
    uploadedAt: daysAgo(opts.days + 1),
    processedAt: processed,
    summary: "Partial process notes with several unknown owners.",
    tags: ["process"],
    confidence: 0.62,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations"],
  });

  const company = entity({
    workspaceId,
    kind: "Company",
    name: workspaceId.replace("ws_", "").toUpperCase(),
    summary: opts.summary,
    sourceAssetIds: [deck.id, processDoc.id],
    confidence: 0.75,
  });

  return buildWorkspaceKnowledge({
    assets: [deck, processDoc],
    entities: [company],
    relationships: [],
    summary: opts.summary,
    themes: opts.themes,
    lastAnalysisAt: processed,
  });
}

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  "Company Documents",
  "Meeting Transcripts",
  "Customer Lists",
  "Sales Data",
  "Invoices",
  "Presentations",
  "Images",
  "Process Documents",
  "Policies",
  "Future Imports",
] as const;

/** Timeline events derived from processed knowledge assets. */
export function knowledgeTimelineEvents(
  workspaceId: string,
  knowledge: WorkspaceKnowledge,
): TimelineEvent[] {
  return knowledge.assets
    .filter((a) => a.status === "processed" && a.processedAt)
    .map((a) => ({
      id: createId("timeline"),
      workspaceId,
      date: a.processedAt as string,
      title: timelineTitleForAsset(a),
      description: a.summary ?? `${a.title} added to company knowledge.`,
      category: "knowledge" as const,
    }));
}

function timelineTitleForAsset(asset: KnowledgeAsset): string {
  switch (asset.type) {
    case "customer_list":
      return "Customer Database Imported";
    case "sales_data":
      return "Sales History Imported";
    case "policy":
      return `${asset.title.replace(/\s+v\d+$/i, "")} Added`;
    case "meeting_transcript":
      return "Meeting Transcript Processed";
    case "presentation":
      return "Presentation Analyzed";
    case "process_document":
      return "Process Document Added";
    default:
      return `${asset.title} Processed`;
  }
}
