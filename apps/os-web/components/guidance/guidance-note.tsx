import { StatusPill } from '@isalwa/ui';
import { guidanceNoteView, type GuidanceNoteModel } from '@/lib/guidance/model';

type GuidanceNoteProps = {
  note: GuidanceNoteModel;
};

export function GuidanceNote({ note }: GuidanceNoteProps) {
  const view = guidanceNoteView(note);
  return (
    <aside
      data-guidance-id={view.id}
      data-guidance-kind={view.kind}
      data-guidance-role={view.role}
      data-tour={view.tour}
      className="max-w-xl rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white px-4 py-3 shadow-[var(--isalwa-shadow-soft)]"
    >
      <StatusPill tone={view.tone}>{view.label}</StatusPill>
      <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">{view.title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {view.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

export function GuidanceNotes({ notes }: { notes: readonly GuidanceNoteModel[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <GuidanceNote key={note.id} note={note} />
      ))}
    </div>
  );
}
