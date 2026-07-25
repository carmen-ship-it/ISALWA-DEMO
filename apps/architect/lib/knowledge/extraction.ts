import type {
  KnowledgeAsset,
  KnowledgeExtractionProvider,
  KnowledgeExtractionProviderId,
} from "@/types";

function notImplemented(
  id: KnowledgeExtractionProviderId,
): KnowledgeExtractionProvider["extract"] {
  return async (_asset: KnowledgeAsset): Promise<never> => {
    void _asset;
    throw new Error(
      `Knowledge extraction provider "${id}" is not implemented in Mission 3.`,
    );
  };
}

function provider(
  id: KnowledgeExtractionProviderId,
  title: string,
  description: string,
  status: "designed" | "planned",
): KnowledgeExtractionProvider {
  return {
    id,
    title,
    description,
    status,
    extract: notImplemented(id),
  };
}

/** AI / parser extraction providers — contracts only. */
export const KNOWLEDGE_EXTRACTION_PROVIDERS: readonly KnowledgeExtractionProvider[] =
  [
    provider(
      "pdf_reader",
      "PDF Reader",
      "Parse PDF policies, proposals, and process packs into evidence.",
      "designed",
    ),
    provider(
      "excel_reader",
      "Excel Reader",
      "Read customer lists, sales history, and operational spreadsheets.",
      "designed",
    ),
    provider(
      "image_reader",
      "Image Reader",
      "Interpret photos, org charts, and whiteboard snapshots.",
      "planned",
    ),
    provider(
      "ocr",
      "OCR",
      "Extract text from scanned documents and photos.",
      "planned",
    ),
    provider(
      "transcript_reader",
      "Transcript Reader",
      "Structure meeting transcripts into entities and themes.",
      "designed",
    ),
    provider(
      "crm_import",
      "CRM Import",
      "Ingest CRM exports as commercial evidence.",
      "planned",
    ),
    provider(
      "erp_import",
      "ERP Import",
      "Ingest ERP exports as operations evidence.",
      "planned",
    ),
    provider(
      "email_import",
      "Email Import",
      "Mine email threads for approvals and bottlenecks.",
      "planned",
    ),
    provider(
      "whatsapp_import",
      "WhatsApp Import",
      "Privacy-first chat exports as customer and ops evidence.",
      "designed",
    ),
  ] as const;
