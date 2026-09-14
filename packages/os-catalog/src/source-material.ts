/**
 * Governed V1 source material. Carmen decided the Vitri catalogs are that source.
 * SOURCE_EXISTS is not the same claim as a successful structured extraction.
 * Page findings below are the PyPDF2 extract_text result observed on 2026-09-14.
 * The PDF binaries are not copied into git. OCR was not applied. Missing glyphs are not guessed.
 */

import { createHash } from 'node:crypto';
import { CATALOG_PDF, SEASON_PDF } from './reviewed-extraction';

export const SOURCE_EXISTS = 'SOURCE_EXISTS' as const;
export const EXTRACTION_NOT_SUCCEEDED = 'NOT_SUCCEEDED' as const;

export const GOVERNED_V1_SOURCES = [CATALOG_PDF, SEASON_PDF] as const;

export type PageTextFinding = {
  filename: string;
  page: number;
  charCount: number;
  currencyAmountCount: 0;
  contextLabelCount: 0;
  priceTokenWithoutAmount: boolean;
};

function pages(
  filename: string,
  rows: ReadonlyArray<readonly [number, number, boolean?]>,
): PageTextFinding[] {
  return rows.map(([page, charCount, priceTokenWithoutAmount]) => ({
    filename,
    page,
    charCount,
    currencyAmountCount: 0,
    contextLabelCount: 0,
    priceTokenWithoutAmount: priceTokenWithoutAmount === true,
  }));
}

/**
 * Character counts and price-token flags from extract_text.
 * currencyAmountCount stays 0: no Bs or BOB amount was in the extracted text.
 * contextLabelCount stays 0: Showroom, Más de 10 unidades, Calidad Segunda, and Viajes were not printed as text.
 */
export const VITRI_TEXT_FINDINGS: readonly PageTextFinding[] = [
  ...pages(CATALOG_PDF.filename, [
    [1, 14],
    [2, 1519],
    [3, 2297],
    [4, 119],
    [5, 721],
    [6, 204],
    [7, 823],
    [8, 9],
    [9, 448],
    [10, 277],
    [11, 451],
    [12, 281],
    [13, 447],
    [14, 283],
    [15, 454],
    [16, 299],
    [17, 366],
    [18, 9],
    [19, 306],
    [20, 36],
    [21, 0],
  ]),
  ...pages(SEASON_PDF.filename, [
    [1, 54],
    [2, 268],
    [3, 267],
    [4, 231],
    [5, 452],
    [6, 462],
    [7, 446],
    [8, 444, true],
    [9, 379, true],
    [10, 220],
  ]),
];

export const TEXT_EXTRACTION = {
  tool: 'PyPDF2.extract_text',
  observedOn: '2026-09-14',
  ocrApplied: false,
} as const;

export function sourceFingerprint(
  sources: readonly { filename: string; sha256: string; byteSize: number; pageCount: number }[] = GOVERNED_V1_SOURCES,
): string {
  const canonical = [...sources]
    .map((source) => `${source.filename}|${source.sha256}|${source.byteSize}|${source.pageCount}`)
    .sort((left, right) => left.localeCompare(right))
    .join('\n');
  return createHash('sha256').update(`isalwa-price-source:v1:\n${canonical}`).digest('hex');
}

export function extractionFingerprint(
  findings: readonly PageTextFinding[] = VITRI_TEXT_FINDINGS,
): string {
  const canonical = findings
    .map(
      (finding) =>
        `${finding.filename}|${finding.page}|${finding.charCount}|${finding.currencyAmountCount}|${finding.contextLabelCount}|${finding.priceTokenWithoutAmount}`,
    )
    .join('\n');
  return createHash('sha256').update(`isalwa-price-extraction:v1:\n${canonical}`).digest('hex');
}
