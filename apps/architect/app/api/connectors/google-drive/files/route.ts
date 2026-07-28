import { NextResponse } from "next/server";
import {
  isImportableGoogleDriveFile,
  listGoogleDriveFiles,
} from "@/lib/connectors/google-drive";
import { getValidGoogleDriveAccessToken } from "@/lib/connectors/session";
import type { ConnectorRemoteFile } from "@/lib/connectors/types";

/**
 * Google Drive — list files (Mission 23). Consultant-only, workspace-scoped.
 * Returns `ConnectorRemoteFile[]` — filenames/metadata only, never a token.
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
  const pageToken = searchParams.get("pageToken");
  if (!workspaceId || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = await getValidGoogleDriveAccessToken(workspaceId);
  if ("error" in token) {
    return NextResponse.json({ connected: false, reason: token.error, files: [] });
  }

  try {
    const result = await listGoogleDriveFiles({ accessToken: token.accessToken, pageToken });
    const files: ConnectorRemoteFile[] = result.files.map((file) => {
      const importable = isImportableGoogleDriveFile(file.mimeType);
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.size,
        modifiedAt: file.modifiedTime,
        webViewLink: file.webViewLink,
        importable,
        reasonIfNotImportable: importable
          ? null
          : "Architect aún no puede leer este tipo de archivo (necesita un lector adicional, igual que en la carga manual).",
      };
    });
    return NextResponse.json({ connected: true, files, nextPageToken: result.nextPageToken });
  } catch (error) {
    return NextResponse.json({
      connected: true,
      files: [],
      nextPageToken: null,
      error: error instanceof Error ? error.message : "No se pudo listar Google Drive.",
    });
  }
}
