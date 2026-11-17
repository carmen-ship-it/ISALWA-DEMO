'use client';

import { Button, StatusPill } from '@isalwa/ui';
import type { ConversationInternalNote } from '@isalwa/os-contracts';
import { COMPOSER_COPY } from '@/lib/conversations/composer';

export type ConversationNotesState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: readonly ConversationInternalNote[] };

type ConversationNotesProps = {
  notes: ConversationNotesState;
  onRetry: () => void;
};

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/**
 * Internal notes are listed apart from the messages, never as a bubble, and each one is marked
 * "Solo equipo". They are never part of a conversation's messages or any outbound path.
 */
export function ConversationNotes({ notes, onRetry }: ConversationNotesProps) {
  return (
    <section
      className="max-h-48 shrink-0 space-y-2 overflow-y-auto border-t border-[var(--isalwa-mist)] pt-3"
      aria-label={COMPOSER_COPY.notesTitle}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="isalwa-section-label">{COMPOSER_COPY.notesTitle}</span>
        <StatusPill tone="neutral-sky">{COMPOSER_COPY.noteTeamOnly}</StatusPill>
      </div>
      {notes.status === 'loading' ? (
        <p className="text-xs text-[var(--isalwa-slate)]" role="status">
          {COMPOSER_COPY.notesLoading}
        </p>
      ) : null}
      {notes.status === 'error' ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-sm text-[var(--isalwa-kiln)]">
            {COMPOSER_COPY.notesLoadError}
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
            {COMPOSER_COPY.notesRetry}
          </Button>
        </div>
      ) : null}
      {notes.status === 'ready' && notes.items.length === 0 ? (
        <p className="text-xs text-[var(--isalwa-slate)]">{COMPOSER_COPY.notesEmpty}</p>
      ) : null}
      {notes.status === 'ready' && notes.items.length > 0 ? (
        <ul className="space-y-2">
          {notes.items.map((note) => (
            <li
              key={note.id}
              className="rounded-[var(--isalwa-radius-control)] border border-dashed border-[var(--isalwa-slate)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
            >
              <p className="whitespace-pre-wrap break-words">{note.body}</p>
              <p className="mt-1 text-[var(--isalwa-text-2xs)] text-[var(--isalwa-slate)]">
                {COMPOSER_COPY.noteTeamOnly} · {note.authorLabel} · {formatWhen(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
