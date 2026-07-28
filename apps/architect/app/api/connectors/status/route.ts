import { NextResponse } from "next/server";
import { CONNECTOR_CATALOG, emptyConnectorAccountSummary } from "@/lib/connectors";
import { getConnectorAccountSummary } from "@/lib/connectors/store";

/**
 * Real Integrations — connection status probe (Mission 23).
 *
 * Consultant-only (matches `docs/SECURITY_POSTURE.md` / Engineering
 * Guidelines §10 — connector admin is not something Client Mode exposes).
 * Never returns a token — only `ConnectorAccountSummary` shapes.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const { canAccessWorkspace } = await import("@/lib/auth/permissions");
  const session = await getServerSession();
  if (!session || session.role !== "consultant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const summaries = await Promise.all(
    CONNECTOR_CATALOG.map((connector) =>
      connector.readiness === "live"
        ? getConnectorAccountSummary(workspaceId, connector.id)
        : Promise.resolve(emptyConnectorAccountSummary(connector.id, "not_connected")),
    ),
  );

  return NextResponse.json({ summaries });
}
