import {
  EXISTING_STATUS_PILL_TONES,
  GUIDANCE_KIND_LABEL,
  GUIDANCE_KIND_TONE,
  guidanceRole,
  isGuidanceKind,
  type GuidanceKind,
  type GuidanceRole,
  type GuidanceTone,
} from './kinds';

export type GuidanceNoteModel = {
  id: string;
  kind: GuidanceKind;
  title: string;
  items: readonly string[];
};

export type GuidanceNoteView = {
  id: string;
  kind: GuidanceKind;
  role: GuidanceRole;
  label: string;
  tone: GuidanceTone;
  title: string;
  items: readonly string[];
  tour: string;
};

const AFFIRMATIVE_FALSEHOODS: readonly { id: string; pattern: RegExp }[] = [
  { id: 'pago-confirmado', pattern: /pago confirmado/i },
  { id: 'cobrado', pattern: /\bcobrado\b/i },
  { id: 'pagado', pattern: /\bpagado\b/i },
  { id: 'ingreso', pattern: /\bingreso\b/i },
  { id: 'factura-emitida', pattern: /factura emitida|se emiti[oó] factura/i },
  { id: 'nota-emitida', pattern: /nota de entrega emitida|se emiti[oó] nota de entrega/i },
  { id: 'aprobar-crea-pedido', pattern: /aprobar crea un pedido/i },
  { id: 'mensaje-confirma-pago', pattern: /mensaje confirma (un |el )?pago/i },
  { id: 'mapa-navigation', pattern: /\/mapa\b|abrir (el )?mapa/i },
];

export function guidanceViolations(note: GuidanceNoteModel): string[] {
  const violations: string[] = [];
  if (!isGuidanceKind(note.kind)) violations.push('unknown-kind');
  if (note.id.trim().length === 0) violations.push('missing-id');
  if (note.title.trim().length === 0) violations.push('missing-title');
  if (note.items.length === 0) violations.push('missing-items');
  if (note.kind === 'consejo' && guidanceRole(note.kind) !== 'checklist') violations.push('consejo-not-checklist');
  if (note.kind === 'regla' && guidanceRole(note.kind) !== 'consequence') violations.push('regla-not-consequence');
  if (note.kind === 'sugerencia' && guidanceRole(note.kind) !== 'suggestion') violations.push('sugerencia-not-suggestion');
  if (!EXISTING_STATUS_PILL_TONES.includes(GUIDANCE_KIND_TONE[note.kind])) violations.push('unknown-tone');

  const text = [note.title, ...note.items].join('\n');
  if (claimsCargoAuthority(text)) violations.push('cargo-is-authority');
  for (const rule of AFFIRMATIVE_FALSEHOODS) {
    if (rule.pattern.test(text)) violations.push(rule.id);
  }
  return violations;
}

/** Cargo never assigns the account or authorizes convert. Negated sentences are allowed. */
export function claimsCargoAuthority(text: string): boolean {
  return /el cargo (?!no\b)(asigna|autoriza)/i.test(text);
}

export function guidanceNote(input: GuidanceNoteModel): GuidanceNoteModel {
  const violations = guidanceViolations(input);
  if (violations.length > 0) {
    throw new Error(`Guidance ${input.id || '(missing id)'} is not allowed: ${violations.join(', ')}`);
  }
  return {
    id: input.id,
    kind: input.kind,
    title: input.title,
    items: input.items,
  };
}

export function guidanceNoteView(note: GuidanceNoteModel): GuidanceNoteView {
  return {
    id: note.id,
    kind: note.kind,
    role: guidanceRole(note.kind),
    label: GUIDANCE_KIND_LABEL[note.kind],
    tone: GUIDANCE_KIND_TONE[note.kind],
    title: note.title,
    items: note.items,
    tour: `guidance-${note.id}`,
  };
}

export function guidanceText(notes: readonly GuidanceNoteModel[]): string {
  return notes.map((note) => [note.title, ...note.items].join('\n')).join('\n');
}
