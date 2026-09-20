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
const REMAINING_WAVE2 = /\bWave\s*2\b[^,·\n]*/gi;
const REMAINING_WAVEA = /\bWaveA\b[^,·\n]*/gi;

const INTERNAL_MARKER = /\[\[[^\]]+\]\]/g;
const PAREN_ULID = /\s*\(\s*[0-9A-HJKMNP-TV-Z]{26}\s*\)/gi;
const BARE_ULID = /\b[0-9A-HJKMNP-TV-Z]{26}\b/gi;
const BARE_UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

/** Drop linkage tokens from human copy. Stored text is unchanged. */
export function stripInternalPresentationTokens(value: string): string {
  return value
    .replace(INTERNAL_MARKER, ' ')
    .replace(PAREN_ULID, '')
    .replace(BARE_ULID, '')
    .replace(BARE_UUID, '');
}

export function presentHumanCopy(value: string | null | undefined): string {
  if (!value) return '';
  let text = stripInternalPresentationTokens(value).replace(/\[\s*is_demo\s*\]/gi, ' ');
  for (const row of FIXTURE_PEOPLE) {
    text = text.replace(row.pattern, row.name);
  }
  text = text.replace(REMAINING_SYNTH, 'Equipo Demo');
  text = text.replace(REMAINING_WAVEB, 'Equipo Demo');
  text = text.replace(REMAINING_WAVE2, 'Equipo Demo');
  text = text.replace(REMAINING_WAVEA, 'Equipo Demo');
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
