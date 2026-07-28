import { NextResponse } from "next/server";
import { revokeGoogleDriveToken } from "@/lib/connectors/google-drive";
import { deleteConnectorCredentials, getConnectorCredentials } from "@/lib/connectors/store";

/** Google Drive — disconnect (Mission 23). Consultant-only, workspace-scoped. */
export const runtime = "nodejs";

interface DisconnectBody {
  workspaceId?: string;
}

export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const { canAccessWorkspace } = await import("@/lib/auth/permissions");
  const session = await getServerSession();
  if (!session || session.role !== "consultant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as DisconnectBody;
  const workspaceId = body.workspaceId;
  if (!workspaceId || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await getConnectorCredentials(workspaceId, "google_drive");
  if (existing?.accessToken) {
    await revokeGoogleDriveToken(existing.accessToken);
  }
  const result = await deleteConnectorCredentials(workspaceId, "google_drive");
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
