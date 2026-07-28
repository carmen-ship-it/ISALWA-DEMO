import { NextResponse } from "next/server";
import { renderLivingDeliverableDocx, renderLivingDeliverablePdf } from "@/lib/deliverables/living/export";
import type { ExportDocument } from "@/lib/deliverables/living/export";

/**
 * Mission 26 — binary export endpoint.
 *
 * `pdf-lib` / `docx` are Node-only and reasonably heavy; keeping them behind
 * a server route (rather than importing them in a client component) matches
 * the existing pattern of `app/api/documents/ocr/route.ts` and
 * `app/api/interview/route.ts` — the client already holds the full
 * `ExportDocument` (composed client-side, pure data), and posts it here for
 * binary rendering only.
 */

export const runtime = "nodejs";

interface ExportRequestBody {
  format?: "pdf" | "docx";
  document?: ExportDocument;
  fileNameHint?: string;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ExportRequestBody;
  if (!body.document) {
    return NextResponse.json({ error: "document is required" }, { status: 400 });
  }
  if (body.format !== "pdf" && body.format !== "docx") {
    return NextResponse.json({ error: "format must be pdf or docx" }, { status: 400 });
  }

  const fileBase = slugify(body.fileNameHint ?? body.document.title ?? "documento-architect");

  try {
    if (body.format === "pdf") {
      const bytes = await renderLivingDeliverablePdf(body.document);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileBase}.pdf"`,
        },
      });
    }

    const bytes = await renderLivingDeliverableDocx(body.document);
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileBase}.docx"`,
      },
    });
  } catch (error) {
    console.error("Living deliverable export failed:", error);
    return NextResponse.json(
      { error: "No se pudo generar el documento en este momento." },
      { status: 500 },
    );
  }
}
