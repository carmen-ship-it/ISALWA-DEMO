'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CorrectionCandidateEvent, CorrectionRequestView } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  loadCorrectionCandidatesAction,
  lookupCorrectionCandidateAction,
  resolveCorrectionAction,
} from '@/components/issue/correction-actions';
import { CORRECTION_FIELD_LABELS, CORRECTION_STATE_LABELS } from '@/components/issue/correction-request';
import { formatTimestamp } from '@/lib/commercial/labels';
import { NO_RECORDED_DATE } from '@/lib/party/customer-self-service';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CorrectionSummary({ correction }: { correction: CorrectionRequestView }) {
  return (
    <div className="space-y-1 text-sm text-[var(--isalwa-kiln)]" data-correction-state={correction.state}>
      <p>
        Corrección · {CORRECTION_STATE_LABELS[correction.state]} · {CORRECTION_FIELD_LABELS[correction.field]}
      </p>
      {correction.proposedValue ? <p>Valor propuesto: {correction.proposedValue}</p> : null}
      <p className="text-xs text-[var(--isalwa-slate)]">
        Resuelta requiere que el cambio ya se haya hecho en la ficha del cliente. Resolver no edita los datos.
      </p>
    </div>
  );
}

export function CorrectionResolveForm({
  issueId,
  expectedVersion,
  initialEvents,
  initialCursor,
}: {
  issueId: string;
  expectedVersion: number;
  initialEvents: CorrectionCandidateEvent[];
  initialCursor: string | null;
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);
  const [cursor, setCursor] = useState(initialCursor);
  const [needsDifference, setNeedsDifference] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onlyReject = events.length === 0;

  return (
    <form
      className="mt-4 space-y-3"
      action={async (formData) => {
        setError(null);
        const result = await resolveCorrectionAction(formData);
        if (!result.ok) {
          setError(result.error);
          setNeedsDifference(result.code === 'CORRECTION_VALUE_DIFFERS');
          return;
        }
        setNeedsDifference(false);
        router.refresh();
      }}
    >
      <FormFeedback error={error} success={message} />
      <input type="hidden" name="issueId" value={issueId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <fieldset className="space-y-2">
        <legend className="isalwa-section-label">Decisión</legend>
        {onlyReject ? null : (
          <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
            <input type="radio" name="decision" value="applied" required={!onlyReject} />
            Resuelta
          </label>
        )}
        <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
          <input type="radio" name="decision" value="rejected" required defaultChecked={onlyReject} />
          Rechazada
        </label>
      </fieldset>
      {events.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="isalwa-section-label">Cambio ya registrado</legend>
          {events.map((event) => (
            <label key={event.eventId} className="block text-sm text-[var(--isalwa-slate)]">
              <input type="radio" name="eventId" value={event.eventId} className="mr-2" />
              {formatTimestamp(event.occurredAt) ?? NO_RECORDED_DATE} · {event.fields.map((field) => CORRECTION_FIELD_LABELS[field] ?? field).join(', ')}
            </label>
          ))}
          {cursor ? (
            <button
              type="button"
              className="text-sm font-medium text-[var(--isalwa-glaze)]"
              onClick={async () => {
                const page = await loadCorrectionCandidatesAction(issueId, cursor);
                if (!page.ok) {
                  setError(page.error);
                  return;
                }
                setEvents((current) => [...current, ...page.page.events]);
                setCursor(page.page.nextCursor);
              }}
            >
              Más
            </button>
          ) : null}
        </fieldset>
      ) : (
        <p className="text-sm text-[var(--isalwa-slate)]">No hay cambios citables. Solo se puede rechazar.</p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label htmlFor={`lookup-${issueId}`} className="isalwa-section-label">
          Identificador de un cambio
        </label>
        <input id={`lookup-${issueId}`} className={fieldClass} />
        <button
          type="button"
          className="text-sm font-medium text-[var(--isalwa-glaze)]"
          onClick={async (event) => {
            const input = (event.currentTarget.previousElementSibling as HTMLInputElement | null)?.value ?? '';
            const found = await lookupCorrectionCandidateAction(issueId, input);
            if (!found.ok) {
              setError(found.error);
              return;
            }
            setEvents((current) => (current.some((item) => item.eventId === found.event.eventId) ? current : [found.event, ...current]));
            setMessage('Cambio encontrado.');
          }}
        >
          Buscar
        </button>
      </div>
      <label htmlFor={`correction-reason-${issueId}`} className="isalwa-section-label">
        Motivo
      </label>
      <textarea id={`correction-reason-${issueId}`} name="reason" required minLength={10} maxLength={500} rows={3} className={fieldClass} />
      {needsDifference ? (
        <>
          <label htmlFor={`correction-diff-${issueId}`} className="isalwa-section-label">
            Por qué el valor difiere
          </label>
          <textarea id={`correction-diff-${issueId}`} name="differenceExplanation" required minLength={10} maxLength={500} rows={2} className={fieldClass} />
        </>
      ) : null}
      <CommandSubmitButton label="Registrar decisión" variant="secondary" />
    </form>
  );
}
