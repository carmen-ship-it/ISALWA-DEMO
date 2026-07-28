/**
 * Real Integrations — connector catalog (Mission 23).
 *
 * The four connectors in the locked pilot sequence (Google Drive →
 * SharePoint/Microsoft 365 → QuickBooks → HubSpot). This is a distinct,
 * small catalog from `lib/knowledge/connectors.ts` (`KNOWLEDGE_CONNECTORS`,
 * the broader "future data sources" chip list a client sees) and
 * `lib/intake/contracts.ts` (`INTAKE_CONNECTORS`, the intake-source-type
 * mapping) — this one exists specifically to drive the consultant-only
 * connector admin panel (connect/disconnect, required env vars, live vs
 * scaffolded state), which those two catalogs were never shaped to answer.
 * IDs line up with `KnowledgeConnectorId` so the two stay legible together.
 */

import type { ConnectorDefinition, ConnectorProviderId } from "./types";

export const CONNECTOR_CATALOG: readonly ConnectorDefinition[] = [
  {
    id: "google_drive",
    titleEs: "Google Drive",
    descriptionEs:
      "Conecte su cuenta de Google Drive e importe los archivos que elija — se leen igual que una subida manual, sin exportar nada a mano.",
    intakeSourceType: "folder",
    readiness: "live",
    requiredEnvVars: ["GOOGLE_DRIVE_CLIENT_ID", "GOOGLE_DRIVE_CLIENT_SECRET"],
  },
  {
    id: "microsoft_365",
    titleEs: "SharePoint / Microsoft 365",
    descriptionEs:
      "Bibliotecas de SharePoint y archivos de Word, Excel y Outlook. En diseño — todavía no es posible conectar una cuenta.",
    intakeSourceType: "folder",
    readiness: "scaffolded",
    requiredEnvVars: [
      "MICROSOFT_365_CLIENT_ID",
      "MICROSOFT_365_CLIENT_SECRET",
      "MICROSOFT_365_TENANT_ID",
    ],
  },
  {
    id: "quickbooks",
    titleEs: "QuickBooks",
    descriptionEs:
      "Facturas, cuentas por cobrar/pagar y estructura financiera. En diseño — todavía no es posible conectar una cuenta.",
    intakeSourceType: "api_connector",
    readiness: "scaffolded",
    requiredEnvVars: ["QUICKBOOKS_CLIENT_ID", "QUICKBOOKS_CLIENT_SECRET"],
  },
  {
    id: "hubspot",
    titleEs: "HubSpot",
    descriptionEs:
      "Evidencia de pipeline comercial y contactos. En diseño — todavía no es posible conectar una cuenta.",
    intakeSourceType: "api_connector",
    readiness: "scaffolded",
    requiredEnvVars: ["HUBSPOT_CLIENT_ID", "HUBSPOT_CLIENT_SECRET"],
  },
] as const;

export function connectorDefinition(
  id: ConnectorProviderId,
): ConnectorDefinition | null {
  return CONNECTOR_CATALOG.find((connector) => connector.id === id) ?? null;
}
