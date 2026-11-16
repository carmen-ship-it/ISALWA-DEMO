/**
 * Bounded text → ValidateClientImport rows for the documented DATOS CLIENTES customer section (B).
 * Header line optional: commercialName,givenName,familyName,celular,telefono
 * Separators: comma, semicolon or tab. No invented spreadsheet binary parser.
 */

export type ParsedImportCustomerRow = {
  section: 'B';
  rowIndex: number;
  commercialName: string;
  givenName: string;
  familyName: string;
  celular?: string;
  telefono?: string;
};

export function parseClientImportCustomerText(
  text: string,
): { ok: true; rows: ParsedImportCustomerRow[] } | { ok: false; error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
  if (lines.length === 0) return { ok: false, error: 'Pegue al menos una fila de cliente.' };

  let start = 0;
  const firstCells = splitRow(lines[0]!);
  if (looksLikeHeader(firstCells)) start = 1;
  if (start >= lines.length) return { ok: false, error: 'Después del encabezado no hay filas.' };

  const rows: ParsedImportCustomerRow[] = [];
  for (let i = start; i < lines.length; i += 1) {
    const cells = splitRow(lines[i]!);
    const commercialName = (cells[0] ?? '').trim();
    const givenName = (cells[1] ?? '').trim();
    const familyName = (cells[2] ?? '').trim();
    const celular = (cells[3] ?? '').trim();
    const telefono = (cells[4] ?? '').trim();
    if (!commercialName || !givenName || !familyName) {
      return {
        ok: false,
        error: `Fila ${i + 1}: indique nombre comercial, nombre y apellido (celular y teléfono son opcionales).`,
      };
    }
    rows.push({
      section: 'B',
      rowIndex: rows.length + 1,
      commercialName,
      givenName,
      familyName,
      ...(celular ? { celular } : {}),
      ...(telefono ? { telefono } : {}),
    });
  }
  return { ok: true, rows };
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.split(',');
}

function looksLikeHeader(cells: string[]): boolean {
  const joined = cells.map((c) => c.trim().toLowerCase()).join(' ');
  return joined.includes('commercial') || joined.includes('nombre comercial') || joined.includes('givenname');
}
