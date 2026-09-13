import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PdfProvider } from '../types/index';
import type { QuotePdfDocument, QuotePdfRenderInput } from './quote-pdf-document';

/** A4 points */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const KILN = rgb(0.42, 0.24, 0.14);
const INK = rgb(0.13, 0.13, 0.14);
const SLATE = rgb(0.32, 0.32, 0.34);
const RULE = rgb(0.82, 0.8, 0.78);
const MIST = rgb(0.55, 0.54, 0.52);

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [''];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';
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

function drawRight(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  rightX: number,
  y: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font, color });
}

/**
 * Live Quote PDF provider — pure JS via pdf-lib (no browser, no PDF SaaS).
 * Named `pdflib` in the registry; satisfies the Playwright/react-pdf port until those adapters ship.
 */
export class PdfLibPdfProvider implements PdfProvider {
  readonly info = { name: 'pdflib-pdf', mode: 'live' as const };

  async renderQuotePdf(input: QuotePdfRenderInput): Promise<Uint8Array> {
    if (input.document) {
      return this.renderDocument(input.document);
    }
    return this.renderHtmlFallback(input.quoteNumber, input.html ?? '');
  }

  async health() {
    return 'up' as const;
  }

  private async renderDocument(doc: QuotePdfDocument): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN_TOP;

    const ensureSpace = (needed: number) => {
      if (y - needed < MARGIN_BOTTOM) {
        this.drawFooter(page, regular, doc.quoteNumber);
        page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN_TOP;
      }
    };

    // Brand
    page.drawText(doc.brandName || 'ISALWA', {
      x: MARGIN_X,
      y,
      size: 18,
      font: bold,
      color: KILN,
    });
    y -= 16;
    if (doc.organizationLegalName?.trim()) {
      page.drawText(doc.organizationLegalName.trim(), {
        x: MARGIN_X,
        y,
        size: 9,
        font: regular,
        color: SLATE,
      });
      y -= 14;
    }
    y -= 8;
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: PAGE_WIDTH - MARGIN_X, y },
      thickness: 1,
      color: RULE,
    });
    y -= 28;

    // Title
    page.drawText(doc.documentTitle, {
      x: MARGIN_X,
      y,
      size: 16,
      font: bold,
      color: INK,
    });
    drawRight(page, `N° ${doc.quoteNumber}`, bold, 11, PAGE_WIDTH - MARGIN_X, y, KILN);
    y -= 18;
    page.drawText(`Fecha: ${doc.issuedAtLabel}`, {
      x: MARGIN_X,
      y,
      size: 10,
      font: regular,
      color: SLATE,
    });
    if (doc.draftLabel?.trim()) {
      drawRight(
        page,
        doc.draftLabel.trim(),
        bold,
        9,
        PAGE_WIDTH - MARGIN_X,
        y,
        MIST,
      );
    }
    y -= 22;

    // Customer block
    page.drawText('Cliente', {
      x: MARGIN_X,
      y,
      size: 8,
      font: bold,
      color: MIST,
    });
    y -= 14;
    for (const line of wrap(doc.customerName, bold, 11, CONTENT_WIDTH)) {
      ensureSpace(14);
      page.drawText(line, { x: MARGIN_X, y, size: 11, font: bold, color: INK });
      y -= 14;
    }

    const contactBits: string[] = [];
    if (doc.contactName?.trim()) contactBits.push(doc.contactName.trim());
    if (doc.contactPhone?.trim()) contactBits.push(doc.contactPhone.trim());
    if (doc.contactEmail?.trim()) contactBits.push(doc.contactEmail.trim());
    if (contactBits.length > 0) {
      y -= 2;
      page.drawText('Contacto', {
        x: MARGIN_X,
        y,
        size: 8,
        font: bold,
        color: MIST,
      });
      y -= 13;
      for (const line of wrap(contactBits.join(' · '), regular, 10, CONTENT_WIDTH)) {
        ensureSpace(13);
        page.drawText(line, { x: MARGIN_X, y, size: 10, font: regular, color: SLATE });
        y -= 13;
      }
    }

    y -= 16;

    // Table header
    const colQty = MARGIN_X;
    const colDetail = MARGIN_X + 52;
    const colUnit = PAGE_WIDTH - MARGIN_X - 170;
    const colSub = PAGE_WIDTH - MARGIN_X;
    const detailWidth = colUnit - colDetail - 8;

    ensureSpace(40);
    page.drawRectangle({
      x: MARGIN_X,
      y: y - 6,
      width: CONTENT_WIDTH,
      height: 20,
      color: rgb(0.96, 0.94, 0.92),
    });
    page.drawText('Cant.', { x: colQty + 4, y, size: 8, font: bold, color: SLATE });
    page.drawText('Detalle', { x: colDetail, y, size: 8, font: bold, color: SLATE });
    page.drawText('P. unitario', { x: colUnit, y, size: 8, font: bold, color: SLATE });
    drawRight(page, 'Subtotal', bold, 8, colSub - 4, y, SLATE);
    y -= 22;

    if (doc.lines.length === 0) {
      ensureSpace(18);
      page.drawText('Sin líneas', {
        x: colDetail,
        y,
        size: 9,
        font: regular,
        color: MIST,
      });
      y -= 18;
    } else {
      for (const line of doc.lines) {
        const detailLines = wrap(line.description, regular, 9, detailWidth);
        const rowHeight = Math.max(14, detailLines.length * 12);
        ensureSpace(rowHeight + 8);

        page.drawText(String(line.quantity), {
          x: colQty + 4,
          y: y - (detailLines.length - 1) * 12,
          size: 9,
          font: regular,
          color: INK,
        });

        detailLines.forEach((text, i) => {
          page.drawText(text, {
            x: colDetail,
            y: y - i * 12,
            size: 9,
            font: regular,
            color: INK,
          });
        });

        page.drawText(line.unitPriceLabel, {
          x: colUnit,
          y: y - (detailLines.length - 1) * 12,
          size: 9,
          font: regular,
          color: INK,
        });
        drawRight(
          page,
          line.lineTotalLabel,
          regular,
          9,
          colSub - 4,
          y - (detailLines.length - 1) * 12,
        );

        y -= rowHeight + 6;
        page.drawLine({
          start: { x: MARGIN_X, y: y + 4 },
          end: { x: PAGE_WIDTH - MARGIN_X, y: y + 4 },
          thickness: 0.5,
          color: RULE,
        });
      }
    }

    y -= 12;
    ensureSpace(48);
    page.drawLine({
      start: { x: colUnit - 20, y: y + 10 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y + 10 },
      thickness: 1,
      color: RULE,
    });
    page.drawText('Subtotal', { x: colUnit - 20, y, size: 10, font: regular, color: SLATE });
    drawRight(page, doc.subtotalLabel, regular, 10, colSub - 4, y);
    y -= 16;
    page.drawText('Total', { x: colUnit - 20, y, size: 11, font: bold, color: INK });
    drawRight(page, doc.totalLabel, bold, 11, colSub - 4, y, KILN);
    y -= 12;
    page.drawText(doc.currency === 'BOB' ? 'Moneda: Bolivianos (BOB)' : `Moneda: ${doc.currency}`, {
      x: colUnit - 20,
      y,
      size: 8,
      font: regular,
      color: MIST,
    });

    if (doc.notes?.trim()) {
      y -= 28;
      ensureSpace(40);
      page.drawText('Notas', {
        x: MARGIN_X,
        y,
        size: 8,
        font: bold,
        color: MIST,
      });
      y -= 13;
      for (const noteLine of wrap(doc.notes.trim(), regular, 9, CONTENT_WIDTH)) {
        ensureSpace(12);
        page.drawText(noteLine, { x: MARGIN_X, y, size: 9, font: regular, color: SLATE });
        y -= 12;
      }
    }

    this.drawFooter(page, regular, doc.quoteNumber);

    return pdf.save();
  }

  private drawFooter(page: PDFPage, font: PDFFont, quoteNumber: string) {
    page.drawText(`ISALWA · Cotización ${quoteNumber}`, {
      x: MARGIN_X,
      y: MARGIN_BOTTOM - 16,
      size: 7,
      font,
      color: MIST,
    });
  }

  private async renderHtmlFallback(quoteNumber: string, html: string): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1800);
    let y = PAGE_HEIGHT - MARGIN_TOP;
    page.drawText('ISALWA', { x: MARGIN_X, y, size: 16, font, color: KILN });
    y -= 24;
    page.drawText('COTIZACIÓN', { x: MARGIN_X, y, size: 14, font, color: INK });
    y -= 18;
    page.drawText(`N° ${quoteNumber}`, { x: MARGIN_X, y, size: 11, font, color: SLATE });
    y -= 24;
    for (const line of wrap(text || 'Documento sin contenido estructurado.', font, 10, CONTENT_WIDTH)) {
      if (y < MARGIN_BOTTOM) break;
      page.drawText(line, { x: MARGIN_X, y, size: 10, font, color: INK });
      y -= 13;
    }
    return pdf.save();
  }
}
