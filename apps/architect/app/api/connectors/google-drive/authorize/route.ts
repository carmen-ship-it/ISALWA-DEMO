import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buildGoogleDriveAuthorizeUrl, isGoogleDriveConfigured } from "@/lib/connectors/google-drive";

/**
 * Google Drive — start the OAuth handshake (Mission 23).
 *
 * Consultant-only, workspace-scoped. Never called from a Client Component
 * directly with fetch — this is a plain link the browser navigates to
 * (`<a href="/api/connectors/google-drive/authorize?workspaceId=...">`), so
 * it can 302 straight to Google.
 */
export const runtime = "nodejs";

const STATE_COOKIE = "architect.connector_oauth_state";

function redirectUriFor(request: Request): string {
  const configured = process.env.GOOGLE_DRIVE_REDIRECT_URI;
  if (configured) return configured;
  const origin = new URL(request.url).origin;
  return `${origin}/api/connectors/google-drive/callback`;
}

export async function GET(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const { canAccessWorkspace } = await import("@/lib/auth/permissions");
  const session = await getServerSession();
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!session || session.role !== "consultant" || !workspaceId || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isGoogleDriveConfigured()) {
    const target = new URL(`/workspace/${workspaceId}`, request.url);
    target.searchParams.set("tab", "assessment");
    target.searchParams.set("connector", "google_drive");
    target.searchParams.set("connector_status", "not_configured");
    return NextResponse.redirect(target);
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri = redirectUriFor(request);
  const authorizeUrl = buildGoogleDriveAuthorizeUrl({ redirectUri, state });

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(
    STATE_COOKIE,
    JSON.stringify({ state, workspaceId, redirectUri }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    },
  );
  return response;
}
