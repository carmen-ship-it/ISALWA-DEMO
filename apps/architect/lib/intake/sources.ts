/**
 * Unified Business Knowledge Intake — source catalog.
 *
 * "Every source is another form of evidence." This is the full list the
 * product promises today (designed) and tomorrow (planned) — deliberately
 * broader than file uploads. Status mirrors the honesty convention already
 * used by `KNOWLEDGE_EXTRACTION_PROVIDERS`: "designed" sources run a real,
 * deterministic metadata/keyword extractor; "planned" sources are received
 * and filed, but their content is not read yet.
 */

import type { IntakeConnectorContract, IntakeSourceDefinition } from "./contracts";

export const INTAKE_SOURCES: readonly IntakeSourceDefinition[] = [
  {
    id: "interview",
    category: "conversation",
    title: "Guided Interview",
    titleEs: "Entrevista guiada",
    description: "The primary source today — structured conversation with the Architect.",
    descriptionEs: "La fuente principal hoy — conversación estructurada con el Architect.",
    status: "designed",
  },
  {
    id: "pdf",
    category: "document",
    title: "PDF",
    titleEs: "PDF",
    description: "Policies, proposals, and process packs.",
    descriptionEs: "Políticas, propuestas y paquetes de procesos.",
    status: "designed",
    extensions: ["pdf"],
  },
  {
    id: "word",
    category: "document",
    title: "Word",
    titleEs: "Word",
    description: "Handbooks, SOPs, and meeting notes.",
    descriptionEs: "Manuales, procedimientos y notas de reunión.",
    status: "designed",
    extensions: ["doc", "docx"],
  },
  {
    id: "excel",
    category: "document",
    title: "Excel",
    titleEs: "Excel",
    description: "Customer lists, sales history, and operational spreadsheets.",
    descriptionEs: "Listas de clientes, historial de ventas y hojas operativas.",
    status: "designed",
    extensions: ["xls", "xlsx"],
  },
  {
    id: "powerpoint",
    category: "document",
    title: "PowerPoint",
    titleEs: "PowerPoint",
    description: "Strategy decks and operating overviews.",
    descriptionEs: "Presentaciones de estrategia y resúmenes operativos.",
    status: "designed",
    extensions: ["ppt", "pptx"],
  },
  {
    id: "csv",
    category: "structured_export",
    title: "CSV",
    titleEs: "CSV",
    description: "Raw tabular exports from any system.",
    descriptionEs: "Exportaciones tabulares de cualquier sistema.",
    status: "designed",
    extensions: ["csv"],
  },
  {
    id: "image",
    category: "document",
    title: "Image",
    titleEs: "Imagen",
    description: "Photos, org charts, and whiteboard snapshots — needs OCR.",
    descriptionEs: "Fotos, organigramas y pizarras — requiere lectura óptica (OCR).",
    status: "planned",
    extensions: ["png", "jpg", "jpeg", "webp", "gif", "heic"],
  },
  {
    id: "meeting_transcript",
    category: "conversation",
    title: "Meeting Transcript",
    titleEs: "Transcripción de reunión",
    description: "Pasted or uploaded transcript text from any meeting tool.",
    descriptionEs: "Texto de transcripción de cualquier herramienta de reuniones.",
    status: "designed",
  },
  {
    id: "audio_transcript",
    category: "conversation",
    title: "Audio Transcript",
    titleEs: "Transcripción de audio",
    description: "Raw audio recordings — needs speech-to-text.",
    descriptionEs: "Grabaciones de audio — requiere conversión de voz a texto.",
    status: "planned",
  },
  {
    id: "crm_export",
    category: "structured_export",
    title: "CRM Export",
    titleEs: "Exportación de CRM",
    description: "Accounts, contacts, and pipeline history.",
    descriptionEs: "Cuentas, contactos e historial comercial.",
    status: "planned",
  },
  {
    id: "erp_export",
    category: "structured_export",
    title: "ERP Export",
    titleEs: "Exportación de ERP",
    description: "Master data and operational records.",
    descriptionEs: "Datos maestros y registros operativos.",
    status: "planned",
  },
  {
    id: "accounting_export",
    category: "structured_export",
    title: "Accounting Export",
    titleEs: "Exportación contable",
    description: "Invoices, AR/AP, and chart of accounts.",
    descriptionEs: "Facturas, cuentas por cobrar/pagar y catálogo de cuentas.",
    status: "planned",
  },
  {
    id: "email_archive",
    category: "structured_export",
    title: "Email Archive",
    titleEs: "Archivo de correo",
    description: "Mined for approvals and bottlenecks.",
    descriptionEs: "Analizado para encontrar aprobaciones y cuellos de botella.",
    status: "planned",
  },
  {
    id: "folder",
    category: "connector",
    title: "Folder (Drive/SharePoint/OneDrive)",
    titleEs: "Carpeta (Drive/SharePoint/OneDrive)",
    description: "A whole shared folder, synced continuously.",
    descriptionEs: "Una carpeta compartida completa, sincronizada de forma continua.",
    status: "planned",
  },
  {
    id: "api_connector",
    category: "connector",
    title: "API Connector",
    titleEs: "Conector API",
    description: "Direct system connection — QuickBooks, HubSpot, etc.",
    descriptionEs: "Conexión directa a un sistema — QuickBooks, HubSpot, etc.",
    status: "planned",
  },
  {
    id: "manual_notes",
    category: "manual",
    title: "Manual Notes",
    titleEs: "Notas manuales",
    description: "Plain text typed directly by the client or consultant.",
    descriptionEs: "Texto simple escrito directamente por el cliente o el consultor.",
    status: "designed",
  },
] as const;

export function intakeSourceDefinition(
  id: string,
): IntakeSourceDefinition | null {
  return INTAKE_SOURCES.find((source) => source.id === id) ?? null;
}

export function intakeSourceForExtension(ext: string): IntakeSourceDefinition | null {
  const normalized = ext.trim().toLowerCase().replace(/^\./, "");
  return (
    INTAKE_SOURCES.find((source) => source.extensions?.includes(normalized)) ??
    null
  );
}

/**
 * Future connector hooks — design only, no OAuth/sync. Distinct from
 * `KNOWLEDGE_CONNECTORS` (file-storage connectors already designed in
 * Mission 3); these map specifically onto the broader intake source types
 * this mission adds (structured exports, folders, generic APIs).
 */
export const INTAKE_CONNECTORS: readonly IntakeConnectorContract[] = [
  {
    id: "google_drive_folder",
    title: "Google Drive Folder",
    description: "Continuous folder sync into the Knowledge Center.",
    status: "planned",
    feedsSourceTypes: ["folder"],
  },
  {
    id: "sharepoint_folder",
    title: "SharePoint Folder",
    description: "Ingest SharePoint libraries and process packs.",
    status: "planned",
    feedsSourceTypes: ["folder"],
  },
  {
    id: "onedrive_folder",
    title: "OneDrive Folder",
    description: "Pull OneDrive files into company knowledge.",
    status: "planned",
    feedsSourceTypes: ["folder"],
  },
  {
    id: "quickbooks_api",
    title: "QuickBooks",
    description: "Invoices, AR/AP, and finance structure via API.",
    status: "planned",
    feedsSourceTypes: ["accounting_export", "api_connector"],
  },
  {
    id: "hubspot_api",
    title: "HubSpot",
    description: "Commercial pipeline and contact evidence via API.",
    status: "planned",
    feedsSourceTypes: ["crm_export", "api_connector"],
  },
  {
    id: "salesforce_api",
    title: "Salesforce",
    description: "Accounts, opportunities, and activity history via API.",
    status: "planned",
    feedsSourceTypes: ["crm_export", "api_connector"],
  },
  {
    id: "sap_api",
    title: "SAP",
    description: "ERP master data and operational exports via API.",
    status: "planned",
    feedsSourceTypes: ["erp_export", "api_connector"],
  },
  {
    id: "outlook_email",
    title: "Outlook / Gmail Archive",
    description: "Mailbox export for approvals and bottleneck mining.",
    status: "planned",
    feedsSourceTypes: ["email_archive"],
  },
  {
    id: "zoom_transcripts",
    title: "Zoom / Teams / Meet Transcripts",
    description: "Auto-import meeting transcripts as they are recorded.",
    status: "planned",
    feedsSourceTypes: ["meeting_transcript", "audio_transcript"],
  },
] as const;
