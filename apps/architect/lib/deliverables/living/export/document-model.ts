/**
 * Mission 26 — shared export document model.
 *
 * The single intermediate representation both the PDF (`pdf.ts`) and DOCX
 * (`docx.ts`) renderers consume. Nothing template-specific lives in React —
 * `compose.ts` turns a `LivingDeliverableVersion` into this shape once, and
 * both binary formats read it the same way.
 */

export interface ExportSection {
  heading: string;
  /** 1 = top-level chapter, 2 = sub-section. */
  level: 1 | 2;
  paragraphs?: string[];
  bullets?: string[];
  numbered?: string[];
}

export interface ExportRevision {
  version: number;
  date: string;
  note: string;
}

export interface ExportDocument {
  companyName: string;
  kicker: string;
  title: string;
  subtitle: string;
  generatedAtLabel: string;
  versionLabel: string;
  readinessLabel: string;
  confidenceLabel: string;
  sections: ExportSection[];
  revisionHistory: ExportRevision[];
}
