import { GuidanceNote } from '@/components/guidance/guidance-note';
import type { GuidanceNoteModel } from '@/lib/guidance/model';

type GuidanceCompactDisclosureProps = {
  title?: string;
  notes: readonly GuidanceNoteModel[];
  /** Shown outside the disclosure (warnings that must stay visible). */
  criticalIds?: readonly string[];
};

export function GuidanceCompactDisclosure({
  title = 'Información · Cómo funciona',
  notes,
  criticalIds = [],
}: GuidanceCompactDisclosureProps) {
  if (notes.length === 0) return null;
  const criticalSet = new Set(criticalIds);
  const critical = notes.filter((note) => criticalSet.has(note.id));
  const collapsible = notes.filter((note) => !criticalSet.has(note.id));
  return (
    <div className="space-y-3">
      {critical.map((note) => (
        <GuidanceNote key={note.id} note={note} />
      ))}
      {collapsible.length > 0 ? (
        <details className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-200)_28%,white)] px-4 py-3">
          <summary className="cursor-pointer list-none text-sm font-medium text-[var(--isalwa-kiln)] [&::-webkit-details-marker]:hidden">
            {title}
          </summary>
          <div className="mt-3 space-y-3">
            {collapsible.map((note) => (
              <GuidanceNote key={note.id} note={note} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
