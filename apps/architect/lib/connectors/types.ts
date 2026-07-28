/**
 * Real Integrations — connector engine (Mission 23).
 *
 * A connector is a system a company already uses (Google Drive, Microsoft
 * 365 / SharePoint, QuickBooks, HubSpot) that can hand Architect real
 * evidence instead of asking Álvaro to export and re-upload it by hand.
 *
 * These shapes are shared between the server (OAuth token exchange,
 * credential storage — see `store.ts` / `google-drive.ts`, never imported
 * by a Client Component) and the client (the consultant-only connectors
 * admin panel, which only ever sees a `ConnectorAccountSummary` — never a
 * token). No parallel knowledge store: a connector's only job is to hand
 * text to the existing `ingestFileThroughIntake` / `processUploadedDocument`
 * pipeline (`lib/documents`, `lib/intake`) exactly like a manual upload.
 */

export type ConnectorProviderId =
  | "google_drive"
  | "microsoft_365"
  | "quickbooks"
  | "hubspot";

/**
 * "live" — OAuth + at least one real read/import path is wired and network
 * calls actually happen. "scaffolded" — catalog entry + honest
 * not-connected UI only; no network call exists yet, and the UI never
 * claims otherwise.
 */
export type ConnectorReadiness = "live" | "scaffolded";

export interface ConnectorDefinition {
  id: ConnectorProviderId;
  titleEs: string;
  descriptionEs: string;
  /** What kind of evidence this connector eventually hands the intake pipeline — matches `IntakeSourceType`. */
  intakeSourceType: "folder" | "api_connector";
  readiness: ConnectorReadiness;
  /** Environment variable names this connector reads — names only, see `.env.example`. Never a value. */
  requiredEnvVars: readonly string[];
}

export type ConnectorConnectionStatus =
  | "not_connected"
  | "connected"
  | "needs_setup"
  | "error";

/**
 * Client-safe — never carries a token. This is the only shape the browser
 * (or a route handler JSON response) ever sees for a connected account.
 */
export interface ConnectorAccountSummary {
  provider: ConnectorProviderId;
  status: ConnectorConnectionStatus;
  /** e.g. the connected Google account's email — never a token. */
  accountLabel: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncSummary: string | null;
  errorMessage: string | null;
}

export function emptyConnectorAccountSummary(
  provider: ConnectorProviderId,
  status: ConnectorConnectionStatus = "not_connected",
): ConnectorAccountSummary {
  return {
    provider,
    status,
    accountLabel: null,
    connectedAt: null,
    lastSyncAt: null,
    lastSyncSummary: null,
    errorMessage: null,
  };
}

/** One file as listed from the remote provider — client-safe, no token. */
export interface ConnectorRemoteFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number | null;
  modifiedAt: string | null;
  webViewLink: string | null;
  /** Whether Architect can read this file's content today — same honesty boundary `lib/documents/extraction.ts` already draws for manual uploads. */
  importable: boolean;
  reasonIfNotImportable: string | null;
}

export type ConnectorImportStatus = "read" | "empty" | "unsupported" | "error";

/** Result of reading one remote file's content — text only, never raw bytes/binary. */
export interface ConnectorImportedFile {
  id: string;
  name: string;
  mimeType: string;
  textContent: string | null;
  status: ConnectorImportStatus;
  reason: string | null;
}
