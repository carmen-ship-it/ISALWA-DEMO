import type { KnowledgeConnector } from "@/types";

/**
 * Future connector hooks — the client-facing "upcoming data sources" chip
 * list (`KnowledgeCenter`'s "Próximas fuentes de datos"). This type's
 * `status` union ("designed" | "planned") predates Mission 23 and has no
 * "live" value; Google Drive's *real* connect/disconnect/import admin now
 * lives in `lib/connectors` (`CONNECTOR_CATALOG`, `ConnectorsPanel`) — this
 * entry is kept in sync (`status: "designed"`, since it is no longer just a
 * future idea) but is display-only and never drives that panel.
 */
export const KNOWLEDGE_CONNECTORS: readonly KnowledgeConnector[] = [
  {
    id: "google_drive",
    title: "Google Drive",
    description: "Conectar la cuenta e importar los archivos que elija — ya disponible en el panel de Conectores.",
    status: "designed",
    feedsInto: "knowledge_center",
  },
  {
    id: "dropbox",
    title: "Dropbox",
    description: "Sincronizar documentos compartidos de Dropbox como evidencia.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "onedrive",
    title: "OneDrive",
    description: "Traer archivos de OneDrive al conocimiento de la empresa.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "sharepoint",
    title: "SharePoint",
    description: "Ingerir bibliotecas de SharePoint y paquetes de procesos.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "zoho",
    title: "Zoho",
    description: "Conectores de CRM y documentos para espacios de Zoho.",
    status: "designed",
    feedsInto: "knowledge_center",
  },
  {
    id: "hubspot",
    title: "HubSpot",
    description: "Evidencia de pipeline comercial y contactos.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "salesforce",
    title: "Salesforce",
    description: "Cuentas, oportunidades e historial de actividad.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "sap",
    title: "SAP",
    description: "Datos maestros de ERP y exportaciones operativas.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "quickbooks",
    title: "QuickBooks",
    description: "Facturas, cuentas por cobrar/pagar y estructura financiera.",
    status: "designed",
    feedsInto: "knowledge_center",
  },
  {
    id: "xero",
    title: "Xero",
    description: "Evidencia contable para cobertura financiera.",
    status: "designed",
    feedsInto: "knowledge_center",
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    description: "Ingesta de exportaciones de chat para procesos informales.",
    status: "designed",
    feedsInto: "knowledge_center",
  },
  {
    id: "google_workspace",
    title: "Google Workspace",
    description: "Artefactos de Docs, Sheets y Meet.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
  {
    id: "microsoft_365",
    title: "Microsoft 365",
    description: "Artefactos de Word, Excel, Outlook y Teams.",
    status: "planned",
    feedsInto: "knowledge_center",
  },
] as const;
