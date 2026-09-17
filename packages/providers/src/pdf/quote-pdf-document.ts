/** Structured input for a printable ISALWA Cotización PDF. Omit unavailable fields. */

export type QuotePdfLine = {
  quantity: number;
  description: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
};

export type QuotePdfDocument = {
  quoteNumber: string;
  /** Always "COTIZACIÓN" for this document type. */
  documentTitle: 'COTIZACIÓN';
  brandName: string;
  organizationLegalName?: string | null;
  issuedAtLabel: string;
  customerName: string;
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  currency: string;
  notes?: string | null;
  lines: QuotePdfLine[];
  subtotalLabel: string;
  totalLabel: string;
  /** Shown only when the quote is still a draft. */
  draftLabel?: string | null;
};

export type QuotePdfRenderInput = {
  quoteNumber: string;
  /** Legacy HTML payload (mock / pending HTML engines). */
  html?: string;
  /** Preferred structured document for live PDF rendering. */
  document?: QuotePdfDocument;
};

/** Format BOB centavos (integer string) as "Bs. 1.234,56". */
export function formatBobCentavos(centavos: string): string {
  if (!/^-?\d+$/.test(centavos)) return 'Bs. —';
  const negative = centavos.startsWith('-');
  const digits = negative ? centavos.slice(1) : centavos;
  const value = BigInt(digits);
  const whole = value / BigInt(100);
  const frac = value % BigInt(100);
  const fracStr = frac.toString().padStart(2, '0');
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Bs. ${negative ? '-' : ''}${wholeStr},${fracStr}`;
}

/** Format an ISO timestamp for Spanish Bolivia document display. */
export function formatQuotePdfDate(iso: string, timeZone = 'America/La_Paz'): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-BO', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function sanitizeQuotePdfFilename(quoteNumber: string): string {
  const safe = quoteNumber
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/^_+|_+$/g, '');
  return `Cotizacion-${safe || 'documento'}.pdf`;
}
