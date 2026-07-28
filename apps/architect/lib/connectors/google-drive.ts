/**
 * Google Drive — the one live OAuth connector in Mission 23.
 *
 * Server-only: reads `GOOGLE_DRIVE_CLIENT_SECRET` and handles access/refresh
 * tokens. Never imported by a Client Component — only by the route handlers
 * under `app/api/connectors/google-drive/*` and by `lib/connectors/session.ts`.
 *
 * Plain `fetch` against Google's OAuth2 and Drive v3 REST endpoints — no
 * `googleapis` SDK added, so this stays a zero-new-dependency integration
 * (AI Constitution: justify any new dependency). Every function here makes
 * a real network call; nothing here fabricates a response.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v3/userinfo";
const DRIVE_FILES_ENDPOINT = "https://www.googleapis.com/drive/v3/files";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

/** Read-only Drive access + the connected account's email for display only. */
export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  );
}

export function buildGoogleDriveAuthorizeUrl(params: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", process.env.GOOGLE_DRIVE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  // access_type=offline + prompt=consent guarantee a refresh_token on every
  // connect, not only the very first one — needed since a consultant may
  // reconnect after a revoke without Google resending it otherwise.
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", GOOGLE_DRIVE_SCOPES.join(" "));
  url.searchParams.set("state", params.state);
  return url.toString();
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export interface GoogleDriveTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
  scope: string;
}

function tokensFromResponse(payload: GoogleTokenResponse): GoogleDriveTokens {
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: new Date(Date.now() + payload.expires_in * 1000).toISOString(),
    scope: payload.scope,
  };
}

export async function exchangeGoogleDriveCode(params: {
  code: string;
  redirectUri: string;
}): Promise<GoogleDriveTokens> {
  const body = new URLSearchParams({
    code: params.code,
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Google no aceptó el código de autorización (${response.status}).`);
  }
  const payload = (await response.json()) as GoogleTokenResponse;
  return tokensFromResponse(payload);
}

export async function refreshGoogleDriveAccessToken(
  refreshToken: string,
): Promise<GoogleDriveTokens> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID ?? "",
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "",
    grant_type: "refresh_token",
  });
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`No se pudo renovar el acceso a Google Drive (${response.status}).`);
  }
  const payload = (await response.json()) as GoogleTokenResponse;
  // Google does not always resend refresh_token on a refresh call — keep
  // the one we already have when it doesn't.
  return { ...tokensFromResponse(payload), refreshToken: payload.refresh_token ?? refreshToken };
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

/** Best-effort — a failed revoke never blocks the local disconnect. */
export async function revokeGoogleDriveToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // Local credential row is deleted regardless — see `store.ts`.
  }
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
}

export interface GoogleDriveFileListResult {
  files: GoogleDriveFile[];
  nextPageToken: string | null;
}

/** Google-native document types this connector can read today (via `/export`). */
const EXPORTABLE_GOOGLE_MIME_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};

/** Native file types read directly (`alt=media`) — the same set `lib/documents/extraction.ts` already reads for a manual upload. */
const DIRECT_READABLE_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);

/**
 * Honest today/not-yet-today boundary, mirroring
 * `lib/documents/extraction.ts` exactly: PDFs, Word/Excel/PowerPoint
 * binaries, and images are not readable here either — they need the same
 * parser/OCR dependency a manual upload of those formats needs, which this
 * mission does not add. Folders are excluded upstream (`listGoogleDriveFiles`).
 */
export function isImportableGoogleDriveFile(mimeType: string): boolean {
  return (
    Boolean(EXPORTABLE_GOOGLE_MIME_TYPES[mimeType]) || DIRECT_READABLE_MIME_TYPES.has(mimeType)
  );
}

/**
 * Lists files at the root of "My Drive" plus anything shared with the
 * connected account — flat, newest-first, no nested folder browsing yet
 * (see MISSION23.md "deliberately out of scope"). Folders themselves are
 * excluded; they carry no readable content of their own.
 */
export async function listGoogleDriveFiles(params: {
  accessToken: string;
  pageToken?: string | null;
  query?: string;
}): Promise<GoogleDriveFileListResult> {
  const url = new URL(DRIVE_FILES_ENDPOINT);
  url.searchParams.set(
    "q",
    params.query ?? "trashed = false and mimeType != 'application/vnd.google-apps.folder'",
  );
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set(
    "fields",
    "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)",
  );
  url.searchParams.set("spaces", "drive");
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google Drive respondió con un error (${response.status}).`);
  }
  const data = (await response.json()) as {
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      size?: string;
      modifiedTime?: string;
      webViewLink?: string;
    }>;
    nextPageToken?: string;
  };

  return {
    files: (data.files ?? []).map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? Number(file.size) : null,
      modifiedTime: file.modifiedTime ?? null,
      webViewLink: file.webViewLink ?? null,
    })),
    nextPageToken: data.nextPageToken ?? null,
  };
}

export interface GoogleDriveFileContent {
  bytes: ArrayBuffer;
  mimeType: string;
}

/**
 * Reads one file's bytes. Google-native docs/sheets are exported to plain
 * text/CSV first (Drive has no other way to read their content); everything
 * else this connector can read is downloaded as-is via `alt=media`. Returns
 * `null` for a mime type `isImportableGoogleDriveFile` already said no to —
 * callers should check that first rather than relying on this fallback.
 */
export async function downloadGoogleDriveFile(params: {
  accessToken: string;
  fileId: string;
  mimeType: string;
}): Promise<GoogleDriveFileContent | null> {
  const exportMimeType = EXPORTABLE_GOOGLE_MIME_TYPES[params.mimeType];
  const url = exportMimeType
    ? `${DRIVE_FILES_ENDPOINT}/${params.fileId}/export?mimeType=${encodeURIComponent(exportMimeType)}`
    : DIRECT_READABLE_MIME_TYPES.has(params.mimeType)
      ? `${DRIVE_FILES_ENDPOINT}/${params.fileId}?alt=media`
      : null;
  if (!url) return null;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${params.accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo de Google Drive (${response.status}).`);
  }
  const bytes = await response.arrayBuffer();
  return { bytes, mimeType: exportMimeType ?? params.mimeType };
}
