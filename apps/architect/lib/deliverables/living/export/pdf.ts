/**
 * Mission 26 — executive-quality PDF renderer.
 *
 * Generic text-flow engine over the shared `ExportDocument` model — cover
 * page, table of contents with real page numbers, numbered content pages
 * with running header/footer branding, and a revision-history page. Uses
 * `pdf-lib` (pure JS, no native binary, Node runtime only) because no PDF
 * generation path already existed anywhere in the monorepo (see
 * `MISSION26.md` "Existing Engines To Use").
 *
 * Layout runs in two passes over the same deterministic line-wrapping
 * function: pass 1 simulates page breaks to know which page each section
 * starts on (for the TOC); pass 2 draws the real pages using those numbers.
 */

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ExportDocument, ExportSection } from "./document-model";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const TOP = PAGE_HEIGHT - MARGIN;
const BOTTOM = MARGIN + 24;

const KILN = rgb(0.42, 0.24, 0.14);
const SLATE = rgb(0.32, 0.32, 0.34);
const MIST = rgb(0.6, 0.6, 0.62);
const INK = rgb(0.13, 0.13, 0.14);

type LineKind = "h1" | "h2" | "p" | "bullet" | "numbered";

interface Line {
  text: string;
  kind: LineKind;
  sectionIndex: number;
  isFirstOfSection: boolean;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function lineHeight(kind: LineKind): number {
  switch (kind) {
    case "h1":
      return 26;
    case "h2":
      return 20;
    default:
      return 15.5;
  }
}

function buildLines(sections: ExportSection[], fonts: { regular: PDFFont; bold: PDFFont }): Line[] {
  const lines: Line[] = [];
  sections.forEach((section, sectionIndex) => {
    const headingFont = section.level === 1 ? fonts.bold : fonts.bold;
    const headingSize = section.level === 1 ? 15 : 12.5;
    wrap(section.heading, headingFont, headingSize, CONTENT_WIDTH).forEach((text, i) => {
      lines.push({
        text,
        kind: section.level === 1 ? "h1" : "h2",
        sectionIndex,
        isFirstOfSection: i === 0,
      });
    });
    for (const p of section.paragraphs ?? []) {
      wrap(p, fonts.regular, 10.5, CONTENT_WIDTH).forEach((text) =>
        lines.push({ text, kind: "p", sectionIndex, isFirstOfSection: false }),
      );
    }
    for (const b of section.bullets ?? []) {
      wrap(`•  ${b}`, fonts.regular, 10.5, CONTENT_WIDTH - 12).forEach((text) =>
        lines.push({ text, kind: "bullet", sectionIndex, isFirstOfSection: false }),
      );
    }
    (section.numbered ?? []).forEach((n, i) => {
      wrap(`${i + 1}.  ${n}`, fonts.regular, 10.5, CONTENT_WIDTH - 14).forEach((text) =>
        lines.push({ text, kind: "numbered", sectionIndex, isFirstOfSection: false }),
      );
    });
  });
  return lines;
}

/** Greedy page-fill simulation — returns lines grouped per content page. */
function paginate(lines: Line[]): Line[][] {
  const usableHeight = TOP - BOTTOM;
  const pages: Line[][] = [];
  let current: Line[] = [];
  let height = 0;

  for (const line of lines) {
    const h = lineHeight(line.kind);
    const startsNewSection = line.kind === "h1" && line.isFirstOfSection;
    // Avoid an orphan heading at the very bottom of a page.
    const wouldOverflow = height + h > usableHeight;
    const orphanHeading = startsNewSection && usableHeight - height < h * 4 && current.length > 0;
    if (wouldOverflow || orphanHeading) {
      pages.push(current);
      current = [];
      height = 0;
    }
    current.push(line);
    height += h;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

function drawFooter(page: PDFPage, font: PDFFont, pageNum: number, totalPages: number, kicker: string) {
  page.drawText(kicker, { x: MARGIN, y: BOTTOM - 16, size: 8, font, color: MIST });
  const label = `Página ${pageNum} de ${totalPages} · Generado por Architect`;
  const width = font.widthOfTextAtSize(label, 8);
  page.drawText(label, { x: PAGE_WIDTH - MARGIN - width, y: BOTTOM - 16, size: 8, font, color: MIST });
}

export async function renderLivingDeliverablePdf(doc: ExportDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} — ${doc.companyName}`);
  pdf.setProducer("Architect by ISALWA");
  pdf.setCreator("Architect by ISALWA");

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const lines = buildLines(doc.sections, { regular, bold });
  const contentPages = paginate(lines);

  // Section -> which content page index (0-based) it starts on, for the TOC.
  const sectionStartPage = new Map<number, number>();
  contentPages.forEach((pageLines, pageIndex) => {
    for (const line of pageLines) {
      if (line.kind === "h1" && line.isFirstOfSection && !sectionStartPage.has(line.sectionIndex)) {
        sectionStartPage.set(line.sectionIndex, pageIndex);
      }
    }
  });

  const level1Sections = doc.sections
    .map((s, i) => ({ section: s, index: i }))
    .filter((s) => s.section.level === 1);
  const tocLinesNeeded = level1Sections.length;
  const tocPageCount = Math.max(1, Math.ceil(tocLinesNeeded / 32));

  const coverPageCount = 1;
  const revisionPageCount = doc.revisionHistory.length > 0 ? 1 : 0;
  const totalPages = coverPageCount + tocPageCount + contentPages.length + revisionPageCount;
  const contentPageOffset = coverPageCount + tocPageCount; // 0-based page index where content starts

  // ---- Cover page ----
  {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText(doc.kicker, { x: MARGIN, y: TOP - 90, size: 11, font: bold, color: KILN });
    const titleLines = wrap(doc.title, bold, 26, CONTENT_WIDTH);
    let y = TOP - 130;
    for (const t of titleLines) {
      page.drawText(t, { x: MARGIN, y, size: 26, font: bold, color: INK });
      y -= 32;
    }
    y -= 8;
    for (const s of wrap(doc.subtitle, italic, 12.5, CONTENT_WIDTH)) {
      page.drawText(s, { x: MARGIN, y, size: 12.5, font: italic, color: SLATE });
      y -= 18;
    }
    y -= 24;
    const meta = [
      `Empresa: ${doc.companyName}`,
      `Generado: ${doc.generatedAtLabel}`,
      doc.versionLabel,
      doc.readinessLabel,
      doc.confidenceLabel,
    ];
    for (const m of meta) {
      page.drawText(m, { x: MARGIN, y, size: 10.5, font: regular, color: SLATE });
      y -= 16;
    }
    const brand = "Generado por Architect — inteligencia de consultoría continua";
    page.drawText(brand, {
      x: MARGIN,
      y: BOTTOM - 4,
      size: 9,
      font: italic,
      color: MIST,
    });
  }

  // ---- Table of contents ----
  {
    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = TOP - 20;
    page.drawText("Índice", { x: MARGIN, y, size: 18, font: bold, color: KILN });
    y -= 34;
    let pageNum = coverPageCount + 1;
    for (const { section, index } of level1Sections) {
      if (y < BOTTOM + 16) {
        drawFooter(page, regular, pageNum, totalPages, doc.kicker);
        pageNum += 1;
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = TOP - 20;
      }
      const targetPage = contentPageOffset + (sectionStartPage.get(index) ?? 0) + 1;
      const label = section.heading;
      const pageLabel = String(targetPage);
      page.drawText(label, { x: MARGIN, y, size: 11, font: regular, color: INK });
      const pageLabelWidth = regular.widthOfTextAtSize(pageLabel, 11);
      page.drawText(pageLabel, {
        x: PAGE_WIDTH - MARGIN - pageLabelWidth,
        y,
        size: 11,
        font: regular,
        color: SLATE,
      });
      y -= 20;
    }
    drawFooter(page, regular, pageNum, totalPages, doc.kicker);
  }

  // ---- Content pages ----
  contentPages.forEach((pageLines, pageIndex) => {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawText(`${doc.companyName} · ${doc.kicker}`, {
      x: MARGIN,
      y: TOP + 4,
      size: 8.5,
      font: italic,
      color: MIST,
    });
    let y = TOP - 12;
    for (const line of pageLines) {
      const h = lineHeight(line.kind);
      switch (line.kind) {
        case "h1":
          page.drawText(line.text, { x: MARGIN, y, size: 15, font: bold, color: KILN });
          break;
        case "h2":
          page.drawText(line.text, { x: MARGIN, y, size: 12.5, font: bold, color: SLATE });
          break;
        case "bullet":
          page.drawText(line.text, { x: MARGIN + 4, y, size: 10.5, font: regular, color: INK });
          break;
        case "numbered":
          page.drawText(line.text, { x: MARGIN + 4, y, size: 10.5, font: regular, color: INK });
          break;
        default:
          page.drawText(line.text, { x: MARGIN, y, size: 10.5, font: regular, color: INK });
      }
      y -= h;
    }
    drawFooter(page, regular, contentPageOffset + pageIndex + 1, totalPages, doc.kicker);
  });

  // ---- Revision history ----
  if (doc.revisionHistory.length > 0) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = TOP - 20;
    page.drawText("Historial de versiones", { x: MARGIN, y, size: 16, font: bold, color: KILN });
    y -= 30;
    for (const rev of doc.revisionHistory) {
      page.drawText(`v${rev.version} — ${rev.date}`, { x: MARGIN, y, size: 10.5, font: bold, color: INK });
      y -= 15;
      for (const t of wrap(rev.note, regular, 10, CONTENT_WIDTH)) {
        page.drawText(t, { x: MARGIN + 10, y, size: 10, font: regular, color: SLATE });
        y -= 14;
      }
      y -= 6;
    }
    drawFooter(page, regular, totalPages, totalPages, doc.kicker);
  }

  return pdf.save();
}
