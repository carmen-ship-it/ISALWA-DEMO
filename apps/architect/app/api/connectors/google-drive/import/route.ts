import { NextResponse } from "next/server";
import { downloadGoogleDriveFile } from "@/lib/connectors/google-drive";
import { getValidGoogleDriveAccessToken } from "@/lib/connectors/session";
import { recordConnectorSync } from "@/lib/connectors/store";
import type { ConnectorImportedFile } from "@/lib/connectors/types";
import { extractDocumentText } from "@/lib/documents/extraction";

/**
 * Google Drive — read selected files (Mission 23). Consultant-only,
 * workspace-scoped.
 *
 * Downloads/exports each file's bytes server-side (the OAuth token never
 * leaves this route) and reads its text through the exact same
 * `extractDocumentText` a manual upload already uses — reused verbatim via
 * Node's global `File`, not reimplemented — so a Drive import gets the
 * identical honest "read" / "empty" / "unsupported" outcome a manual
 * upload of the same content would get. Returns text content only, never
 * a token, and never writes to the knowledge graph itself: the caller
 * (`lib/connectors/import.ts`, client-side) feeds the result into the
 * existing `processUploadedDocument` pipeline exactly like a manual
 * upload, so there is exactly one write path into `CompanyWorkspace`.
 */
export const runtime = "nodejs";

const MAX_FILES_PER_REQUEST = 10;

interface ImportRequestFile {
  id?: string;
  name?: string;
  mimeType?: string;
}

interface ImportRequestBody {
  workspaceId?: string;
  files?: ImportRequestFile[];
}

export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const { canAccessWorkspace } = await import("@/lib/auth/permissions");
  const session = await getServerSession();
  if (!session || session.role !== "consultant") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ImportRequestBody | null;
  const workspaceId = body?.workspaceId;
  const requestedFiles = Array.isArray(body?.files) ? body!.files : [];
  if (!workspaceId || !canAccessWorkspace(session, workspaceId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const files = requestedFiles.filter(
    (file): file is Required<ImportRequestFile> =>
      Boolean(file.id && file.name && file.mimeType),
  );
  if (files.length === 0) {
    return NextResponse.json({ error: "files is required" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Se pueden importar hasta ${MAX_FILES_PER_REQUEST} archivos por vez.` },
      { status: 400 },
    );
  }

  const token = await getValidGoogleDriveAccessToken(workspaceId);
  if ("error" in token) {
    return NextResponse.json({ error: "not_connected" }, { status: 409 });
  }

  const results: ConnectorImportedFile[] = [];
  for (const file of files) {
    try {
      const content = await downloadGoogleDriveFile({
        accessToken: token.accessToken,
        fileId: file.id,
        mimeType: file.mimeType,
      });
      if (!content) {
        results.push({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          textContent: null,
          status: "unsupported",
          reason: "Architect aún no puede leer este tipo de archivo.",
        });
        continue;
      }

      const wasExported = content.mimeType !== file.mimeType;
      const readableName = wasExported
        ? `${file.name}.${content.mimeType === "text/csv" ? "csv" : "txt"}`
        : file.name;
      const nodeFile = new File([content.bytes], readableName, { type: content.mimeType });
      const extraction = await extractDocumentText(nodeFile);

      if (extraction.status === "extracted") {
        results.push({
          id: file.id,
          name: readableName,
          mimeType: content.mimeType,
          textContent: extraction.text,
          status: "read",
          reason: null,
        });
      } else {
        results.push({
          id: file.id,
          name: readableName,
          mimeType: content.mimeType,
          textContent: null,
          status: extraction.status === "empty" ? "empty" : "unsupported",
          reason: extraction.reason,
        });
      }
    } catch (error) {
      results.push({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        textContent: null,
        status: "error",
        reason: error instanceof Error ? error.message : "Error al leer el archivo.",
      });
    }
  }

  const readCount = results.filter((result) => result.status === "read").length;
  await recordConnectorSync(
    workspaceId,
    "google_drive",
    readCount > 0
      ? `Se leyeron ${readCount} de ${results.length} archivo(s) el ${new Date().toLocaleDateString("es-MX")}.`
      : `Se intentó leer ${results.length} archivo(s), pero ninguno tenía contenido legible todavía.`,
  );

  return NextResponse.json({ results });
}
