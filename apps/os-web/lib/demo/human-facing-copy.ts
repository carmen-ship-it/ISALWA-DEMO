/**
 * Display cleanup only. Does not rewrite stored identifiers, member ids, or notes.
 * Demo banner already says DEMO · DATOS FICTICIOS.
 */

const FIXTURE_PEOPLE: ReadonlyArray<{ pattern: RegExp; name: string; cargo: string }> = [
  { pattern: /\bSynth\s+Asesor\b/gi, name: 'Lucía Demo', cargo: 'Asesora Comercial' },
  { pattern: /\bWaveA\s+ContCommercial\b/gi, name: 'Lucía Demo', cargo: 'Asesora Comercial' },
  { pattern: /\bWaveB\s+IssueReporter\b/gi, name: 'Lucía Demo', cargo: 'Asesora Comercial' },
  { pattern: /\bWaveB\s+IssueManager\b/gi, name: 'Carlos Demo', cargo: 'Jefe Comercial' },
  { pattern: /\bWaveA\s+ContManager\b/gi, name: 'Carlos Demo', cargo: 'Jefe Comercial' },
  { pattern: /\bSynth\s+Gerente\b/gi, name: 'Diego Demo', cargo: 'Gerencia' },
  { pattern: /\bWaveB\s+IssueWork\b/gi, name: 'José Demo', cargo: 'Producción' },
  { pattern: /\bSynth\s+Almac[eé]n\b/gi, name: 'María Demo', cargo: 'Almacén' },
];

/** Remaining fixture tokens that did not match a named person. */
const REMAINING_SYNTH = /\bSynth\b[^,·\n]*/gi;
const REMAINING_WAVEB = /\bWaveB\b[^,·\n]*/gi;

export function presentHumanCopy(value: string | null | undefined): string {
  if (!value) return '';
  let text = value.replace(/\[\s*is_demo\s*\]/gi, ' ');
  for (const row of FIXTURE_PEOPLE) {
    text = text.replace(row.pattern, row.name);
  }
  text = text.replace(REMAINING_SYNTH, 'Equipo Demo');
  text = text.replace(REMAINING_WAVEB, 'Equipo Demo');
  return text.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,·])/g, '$1').trim();
}

/** Cargo for a known fixture display name. Null for real people. */
export function demoPersonCargo(rawName: string | null | undefined): string | null {
  const text = rawName?.trim() ?? '';
  if (!text) return null;
  for (const row of FIXTURE_PEOPLE) {
    if (new RegExp(row.pattern.source, 'i').test(text)) return row.cargo;
  }
  return null;
}
