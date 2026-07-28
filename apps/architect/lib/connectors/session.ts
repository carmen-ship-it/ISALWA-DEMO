/**
 * Connector access-token session helper — server-only (Mission 23).
 *
 * Composes `store.ts` (credential persistence) with `google-drive.ts`
 * (token refresh) so every route handler that needs to call the Drive API
 * shares one refresh-on-expiry code path instead of duplicating it.
 */

import { getConnectorCredentials, updateConnectorAccessToken } from "./store";
import { refreshGoogleDriveAccessToken } from "./google-drive";

export type AccessTokenResult =
  | { accessToken: string }
  | { error: "not_connected" | "expired_no_refresh" | "refresh_failed" };

/** 60s safety margin before the token's real expiry. */
const EXPIRY_MARGIN_MS = 60_000;

export async function getValidGoogleDriveAccessToken(
  workspaceId: string,
): Promise<AccessTokenResult> {
  const credentials = await getConnectorCredentials(workspaceId, "google_drive");
  if (!credentials) return { error: "not_connected" };

  const expiresAtMs = credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : 0;
  if (expiresAtMs - Date.now() > EXPIRY_MARGIN_MS) {
    return { accessToken: credentials.accessToken };
  }

  if (!credentials.refreshToken) {
    return { error: "expired_no_refresh" };
  }

  try {
    const refreshed = await refreshGoogleDriveAccessToken(credentials.refreshToken);
    await updateConnectorAccessToken(
      workspaceId,
      "google_drive",
      refreshed.accessToken,
      refreshed.expiresAt,
    );
    return { accessToken: refreshed.accessToken };
  } catch {
    return { error: "refresh_failed" };
  }
}
