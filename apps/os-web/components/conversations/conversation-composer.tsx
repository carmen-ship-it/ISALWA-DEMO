'use client';

import { useId } from 'react';
import { Button, Chip, StatusPill } from '@isalwa/ui';
import { CONVERSATIONS_COPY } from '@/lib/conversations/copy';
import {
  COMPOSER_COPY,
  COMPOSER_MODES,
  COMPOSER_MODE_LABELS,
  composerPath,
  type ComposerDraft,
  type ComposerMode,
} from '@/lib/conversations/composer';
import { INTERNAL_NOTE_MAX_LENGTH } from '@isalwa/os-contracts';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] disabled:cursor-not-allowed disabled:bg-[var(--isalwa-porcelain)] disabled:text-[var(--isalwa-slate)]';

export type ConversationComposerProps = {
  draft: ComposerDraft;
  /** A stored conversation and a company session: notes can be saved. */
  canNote: boolean;
  saving: boolean;
  /** Last save failure for this conversation. The draft is kept as typed. */
  error: string | null;
  /** The last note was saved (cleared on the next edit). */
  saved: boolean;
  onModeChange: (mode: ComposerMode) => void;
  onNoteChange: (text: string) => void;
  onSaveNote: () => void;
  /** Opens "Registrar atención", the way to add to a thread while WhatsApp is not connected. */
  onRegister?: () => void;
};

/**
 * Mensaje: blocked. It has no handler, no server action and no state of its own, so it cannot
 * report a send. The disabled "Enviar" only states what is not available and why.
 */
function MessagePane({ onRegister }: { onRegister?: () => void }) {
  const hintId = useId();
  const path = composerPath('message');
  return (
    <div className="space-y-2" data-composer-path={path.kind} data-available={String(path.available)}>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="demo">{COMPOSER_COPY.messageBlockedPill}</StatusPill>
      </div>
      <textarea
        rows={2}
        disabled
        value=""
        readOnly
        aria-label={COMPOSER_MODE_LABELS.message}
        aria-describedby={hintId}
        placeholder={COMPOSER_COPY.messagePlaceholder}
        className={fieldClass}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled aria-describedby={hintId}>
          {COMPOSER_COPY.messageSend}
        </Button>
        {onRegister ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRegister}>
            {CONVERSATIONS_COPY.register}
          </Button>
        ) : null}
      </div>
      <p id={hintId} className="text-xs text-[var(--isalwa-slate)]">
        {COMPOSER_COPY.messageBlocked}
      </p>
    </div>
  );
}

/** Nota interna: its own save path (team only). It never reaches a channel. */
function NotePane({
  draft,
  canNote,
  saving,
  error,
  saved,
  onNoteChange,
  onSaveNote,
}: Pick<
  ConversationComposerProps,
  'draft' | 'canNote' | 'saving' | 'error' | 'saved' | 'onNoteChange' | 'onSaveNote'
>) {
  const fieldId = useId();
  const hintId = useId();
  const path = composerPath('internal_note');
  if (!canNote) {
    return (
      <p className="text-xs text-[var(--isalwa-slate)]" data-composer-path={path.kind}>
        {COMPOSER_COPY.noteUnavailable}
      </p>
    );
  }
  const empty = draft.note.trim().length === 0;
  return (
    <form
      className="space-y-2"
      data-composer-path={path.kind}
      onSubmit={(event) => {
        event.preventDefault();
        if (!saving && !empty) onSaveNote();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone="neutral-sky">{COMPOSER_COPY.noteTeamOnly}</StatusPill>
      </div>
      <label htmlFor={fieldId} className="sr-only">
        {COMPOSER_COPY.noteFieldLabel}
      </label>
      <textarea
        id={fieldId}
        rows={3}
        value={draft.note}
        maxLength={INTERNAL_NOTE_MAX_LENGTH}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder={COMPOSER_COPY.notePlaceholder}
        aria-describedby={hintId}
        aria-invalid={error ? true : undefined}
        className={fieldClass}
      />
      <p id={hintId} className="text-xs text-[var(--isalwa-slate)]">
        {COMPOSER_COPY.noteHint}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-[var(--isalwa-kiln)]">
          {error} {COMPOSER_COPY.noteDraftKept}
        </p>
      ) : null}
      {saved && !error ? (
        <p role="status" className="text-sm text-[var(--isalwa-kiln)]">
          {COMPOSER_COPY.noteSaved}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={saving || empty}>
        {saving ? COMPOSER_COPY.noteSaving : COMPOSER_COPY.noteSave}
      </Button>
    </form>
  );
}

export function ConversationComposer(props: ConversationComposerProps) {
  const { draft, onModeChange } = props;
  return (
    <div className="space-y-2" aria-label={COMPOSER_COPY.label}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={COMPOSER_COPY.modesLabel}>
        {COMPOSER_MODES.map((mode) => (
          <Chip key={mode} active={draft.mode === mode} onClick={() => onModeChange(mode)}>
            {COMPOSER_MODE_LABELS[mode]}
          </Chip>
        ))}
      </div>
      {draft.mode === 'message' ? (
        <MessagePane onRegister={props.onRegister} />
      ) : (
        <NotePane
          draft={draft}
          canNote={props.canNote}
          saving={props.saving}
          error={props.error}
          saved={props.saved}
          onNoteChange={props.onNoteChange}
          onSaveNote={props.onSaveNote}
        />
      )}
    </div>
  );
}
