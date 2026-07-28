/**
 * Mission 26 — editable DOCX renderer.
 *
 * Same shared `ExportDocument` model as `pdf.ts`. Uses the `docx` npm
 * package (pure JS, Node runtime) — chosen because no PDF/DOCX generation
 * path already existed anywhere in the monorepo (see `MISSION26.md`
 * "Existing Engines To Use") and it maps directly onto Word's native
 * heading styles, automatic table of contents field, and page-number
 * fields, instead of hand-laying-out text like the PDF renderer must.
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { ExportDocument } from "./document-model";

const KILN = "6C3D24";
const SLATE = "52525B";

function sectionParagraphs(doc: ExportDocument): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  for (const section of doc.sections) {
    paragraphs.push(
      new Paragraph({
        text: section.heading,
        heading: section.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      }),
    );
    for (const p of section.paragraphs ?? []) {
      paragraphs.push(new Paragraph({ text: p, spacing: { after: 120 } }));
    }
    for (const b of section.bullets ?? []) {
      paragraphs.push(new Paragraph({ text: b, bullet: { level: 0 } }));
    }
    (section.numbered ?? []).forEach((n, i) => {
      paragraphs.push(
        new Paragraph({ text: `${i + 1}. ${n}`, spacing: { after: 60 } }),
      );
    });
  }
  return paragraphs;
}

function revisionHistoryTable(doc: ExportDocument): (Paragraph | Table)[] {
  if (doc.revisionHistory.length === 0) return [];
  const headerRow = new TableRow({
    children: ["Versión", "Fecha", "Nota"].map(
      (text) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
        }),
    ),
  });
  const rows = doc.revisionHistory.map(
    (rev) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(`v${rev.version}`)] }),
          new TableCell({ children: [new Paragraph(rev.date)] }),
          new TableCell({ children: [new Paragraph(rev.note)] }),
        ],
      }),
  );

  return [
    new Paragraph({ text: "Historial de versiones", heading: HeadingLevel.HEADING_1, pageBreakBefore: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...rows],
    }),
  ];
}

export async function renderLivingDeliverableDocx(doc: ExportDocument): Promise<Uint8Array> {
  const coverParagraphs = [
    new Paragraph({
      children: [new TextRun({ text: doc.kicker, bold: true, color: KILN, size: 20 })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: doc.title, bold: true, size: 56 })],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: doc.subtitle, italics: true, color: SLATE, size: 24 })],
      spacing: { after: 320 },
    }),
    new Paragraph({ text: `Empresa: ${doc.companyName}` }),
    new Paragraph({ text: `Generado: ${doc.generatedAtLabel}` }),
    new Paragraph({ text: doc.versionLabel }),
    new Paragraph({ text: doc.readinessLabel }),
    new Paragraph({ text: doc.confidenceLabel, spacing: { after: 320 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Generado por Architect — inteligencia de consultoría continua.",
          italics: true,
          color: SLATE,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      text: "Índice",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Los títulos de este documento están marcados con estilos de encabezado de Word — use \"Referencias > Tabla de contenido\" o haga clic derecho aquí y elija \"Actualizar campo\" para generar un índice navegable con números de página.",
          italics: true,
          color: SLATE,
        }),
      ],
      spacing: { after: 200 },
    }),
    ...doc.sections
      .filter((s) => s.level === 1)
      .map((s) => new Paragraph({ text: `· ${s.heading}`, spacing: { after: 60 } })),
  ];

  const body = new Document({
    creator: "Architect by ISALWA",
    title: `${doc.title} — ${doc.companyName}`,
    sections: [
      {
        properties: {},
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                border: { top: { style: BorderStyle.SINGLE, size: 2, color: "D4D4D8" } },
                children: [
                  new TextRun({ text: "Generado por Architect · Página ", size: 16, color: SLATE }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 16, color: SLATE }),
                  new TextRun({ text: " de ", size: 16, color: SLATE }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: SLATE }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverParagraphs,
          new Paragraph({ text: "", pageBreakBefore: true }),
          ...sectionParagraphs(doc),
          ...revisionHistoryTable(doc),
        ],
      },
    ],
  });

  return Packer.toBuffer(body);
}
