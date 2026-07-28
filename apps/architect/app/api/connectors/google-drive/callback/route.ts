import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  exchangeGoogleDriveCode,
  fetchGoogleAccountEmail,
} from "@/lib/connectors/google-drive";
import { saveConnectorCredentials } from "@/lib/connectors/store";

/**
 * Google Drive — OAuth callback (Mission 23).
 *
 * Validates the `state` cookie set by `authorize/route.ts` (CSRF
 * protection for the redirect), exchanges the code for tokens server-side
 * only, then stores them via the same RLS-gated Supabase write path every
 * other approved write in this app uses (`docs/SECURITY_POSTURE.md` §1) —
 * never the service-role key, never sent to the browser.
 */
export const runtime = "nodejs";

const STATE_COOKIE = "architect.connector_oauth_state";

interface OAuthState {
  state: string;
  workspaceId: string;
  redirectUri: string;
}

function workspaceRedirect(request: Request, workspaceId: string, status: string): NextResponse {
  const target = new URL(`/workspace/${workspaceId}`, request.url);
  target.searchParams.set("tab", "assessment");
  target.searchParams.set("connector", "google_drive");
  target.searchParams.set("connector_status", status);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const rawState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  let parsedState: OAuthState | null = null;
  try {
    parsedState = rawState ? (JSON.parse(rawState) as OAuthState) : null;
  } catch {
    parsedState = null;
  }

  if (!parsedState) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  const { workspaceId, redirectUri } = parsedState;

  if (oauthError || !code || !stateParam || stateParam !== parsedState.state) {
    return workspaceRedirect(request, workspaceId, "error");
  }

  const { getServerSession } = await import("@/lib/auth");
  const { canAccessWorkspace } = await import("@/lib/auth/permissions");
  const session = await getServerSession();
  if (!session || session.role !== "consultant" || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const tokens = await exchangeGoogleDriveCode({ code, redirectUri });
    const email = await fetchGoogleAccountEmail(tokens.accessToken);
    const saved = await saveConnectorCredentials(workspaceId, "google_drive", {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      accountLabel: email,
      scopes: tokens.scope,
    });
    if (!saved.ok) {
      console.error("Google Drive connect failed to save credentials:", saved.reason);
      return workspaceRedirect(request, workspaceId, "not_configured");
    }
    return workspaceRedirect(request, workspaceId, "connected");
  } catch (error) {
    console.error("Google Drive OAuth callback failed:", error);
    return workspaceRedirect(request, workspaceId, "error");
  }
}
