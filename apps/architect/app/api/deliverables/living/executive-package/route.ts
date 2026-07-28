import { NextResponse } from "next/server";
import {
  renderLivingDeliverableDocx,
  renderLivingDeliverablePdf,
} from "@/lib/deliverables/living/export";
import type { ExportDocument } from "@/lib/deliverables/living/export";
import { buildStoreZip } from "@/lib/deliverables/living/export/zip";

/**
 * Mission 28 — Executive Package ZIP.
 *
 * Client composes ExportDocuments for already-built living versions (same
 * law as the single-file export route). Server renders binaries + README
 * and returns an uncompressed ZIP. Never invents missing kinds.
 */

export const runtime = "nodejs";

interface PackageFileBody {
  fileName?: string;
  format?: "pdf" | "docx";
  document?: ExportDocument;
}

interface PackageRequestBody {
  folderName?: string;
  zipFileName?: string;
  readme?: string;
  files?: PackageFileBody[];
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._ -]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}

export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PackageRequestBody;
  const files = body.files ?? [];
  if (files.length === 0) {
    return NextResponse.json(
      {
        error:
          "No hay salidas construidas todavía. Construya al menos una parte del sistema operativo.",
      },
      { status: 400 },
    );
  }

  const folder = slugify(body.folderName ?? "ISALWA Executive Package") || "ISALWA-Executive-Package";
  const zipName = slugify(body.zipFileName ?? `${folder}.zip`) || `${folder}.zip`;
  const readme =
    body.readme ??
    "ISALWA Executive Package\n\nSee Architect for missing Operating System outputs.\n";

  try {
    const entries: Array<{ path: string; bytes: Uint8Array }> = [
      {
        path: `${folder}/00 README.txt`,
        bytes: new TextEncoder().encode(readme),
      },
    ];

    for (const file of files) {
      if (!file.document || !file.fileName) continue;
      if (file.format !== "pdf" && file.format !== "docx") continue;

      const bytes =
        file.format === "pdf"
          ? await renderLivingDeliverablePdf(file.document)
          : await renderLivingDeliverableDocx(file.document);

      entries.push({
        path: `${folder}/${file.fileName}`,
        bytes,
      });
    }

    if (entries.length <= 1) {
      return NextResponse.json(
        { error: "No se pudo incluir ningún archivo en el paquete." },
        { status: 400 },
      );
    }

    const zipBytes = buildStoreZip(entries);
    return new NextResponse(Buffer.from(zipBytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${zipName.endsWith(".zip") ? zipName : `${zipName}.zip`}"`,
      },
    });
  } catch (error) {
    console.error("Executive package export failed:", error);
    return NextResponse.json(
      { error: "No se pudo generar el paquete ejecutivo en este momento." },
      { status: 500 },
    );
  }
}
