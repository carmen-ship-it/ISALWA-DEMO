import { createId } from "@/lib/utils";
import type { Document, FutureIntakeHook } from "@/types";

/**
 * Document Center — architecture only for Mission 2.
 * No upload implementation beyond designed/planned placeholders.
 */
export function placeholderTranscriptDocument(
  workspaceId: string,
  title: string,
  createdAt: string,
): Document {
  return {
    id: createId("doc"),
    workspaceId,
    kind: "Interview Transcript",
    title,
    createdAt,
    source: "interview",
    status: "designed",
    metadata: {
      note: "Transcript capture designed — not ingested in Mission 2",
    },
  };
}

export const DOCUMENT_KIND_LABELS = [
  "Interview Transcript",
  "Proposal",
  "PDF",
  "Excel",
  "Photo",
  "Diagram",
  "Process Map",
  "WhatsApp Export",
  "CRM Export",
  "ERP Export",
] as const;

/** Future intake channels — design only. Feed Company Memory the same way interviews do. */
export const FUTURE_INTAKE_HOOKS: readonly FutureIntakeHook[] = [
  {
    id: "voice_recording",
    title: "Voice recordings",
    description: "Capture spoken discovery and attach as evidence.",
    status: "designed",
    feedsInto: "company_memory",
  },
  {
    id: "zoom",
    title: "Zoom",
    description: "Import meeting transcripts into workspace memory.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "teams",
    title: "Microsoft Teams",
    description: "Import meeting transcripts into workspace memory.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "google_meet",
    title: "Google Meet",
    description: "Import meeting transcripts into workspace memory.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "otter",
    title: "Otter",
    description: "Attach Otter transcripts as meeting evidence.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "whatsapp_export",
    title: "WhatsApp exports",
    description: "Privacy-first chat history for customer and ops context.",
    status: "designed",
    feedsInto: "company_memory",
  },
  {
    id: "email_import",
    title: "Email imports",
    description: "Thread evidence into pain points and workflows.",
    status: "designed",
    feedsInto: "company_memory",
  },
  {
    id: "crm_import",
    title: "CRM imports",
    description: "Seed commercial structure from existing CRM data.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "erp_import",
    title: "ERP imports",
    description: "Seed operations structure from existing ERP data.",
    status: "planned",
    feedsInto: "company_memory",
  },
  {
    id: "pdf_upload",
    title: "PDF uploads",
    description: "Proposals, policies, and process docs as evidence.",
    status: "designed",
    feedsInto: "company_memory",
  },
  {
    id: "process_diagram",
    title: "Process diagrams",
    description: "Process diagrams and knowledge-backed workflow maps.",
    status: "designed",
    feedsInto: "company_memory",
  },
] as const;
