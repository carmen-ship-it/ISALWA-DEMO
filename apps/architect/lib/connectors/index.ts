/**
 * Real Integrations — client-safe barrel (Mission 23).
 *
 * Deliberately excludes `store.ts` and `google-drive.ts` — those two hold
 * OAuth tokens and a server-only client secret and must only ever be
 * imported from a route handler, never from this barrel or from a Client
 * Component. Import them directly (`@/lib/connectors/store`,
 * `@/lib/connectors/google-drive`) from server code only.
 */

export type {
  ConnectorProviderId,
  ConnectorReadiness,
  ConnectorDefinition,
  ConnectorConnectionStatus,
  ConnectorAccountSummary,
  ConnectorRemoteFile,
  ConnectorImportStatus,
  ConnectorImportedFile,
} from "./types";
export { emptyConnectorAccountSummary } from "./types";

export { CONNECTOR_CATALOG, connectorDefinition } from "./catalog";
