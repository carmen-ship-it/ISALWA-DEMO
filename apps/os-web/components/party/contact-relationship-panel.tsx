'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import type { ContactRelationshipEndPreview } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { endContactRelationshipAction } from '@/lib/party/actions';
import { CONTACT_RELATION_END_LABELS, formerContactLine } from '@/lib/party/customer-self-service';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function ContactRelationshipPanel({
  partyId,
  contactId,
  status,
  expectedVersion,
  canEnd,
  preview,
  endedOn,
  reason,
  reasonNote,
}: {
  partyId: string;
  contactId: string;
  status: string;
  expectedVersion: number;
  canEnd: boolean;
  preview: ContactRelationshipEndPreview | null;
  endedOn?: string | null;
  reason?: string | null;
  reasonNote?: string | null;
}) {
  const former = formerContactLine({ status, endedOn, reason, reasonNote });
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
    const result = await endContactRelationshipAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'La relación de este contacto quedó finalizada.' };
  }, null);

  if (!former && !(canEnd && preview && preview.relationStatus === 'current')) return null;

  return (
    <div className="mt-2 space-y-2 text-sm">
      {former ? <p className="text-[var(--isalwa-slate)]">{former}</p> : null}
      {canEnd && preview && preview.relationStatus === 'current' ? (
        <form action={action} className="space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
          <p className="font-medium text-[var(--isalwa-kiln)]">Finalizar relación con la empresa</p>
          <p className="text-[var(--isalwa-slate)]">Compromisos abiertos del cliente</p>
          {preview.customerOpenCommitments.length === 0 ? (
            <p className="text-xs text-[var(--isalwa-slate)]">Sin compromisos abiertos del cliente.</p>
          ) : (
            <ul className="m-0 list-none p-0 text-xs text-[var(--isalwa-slate)]">
              {preview.customerOpenCommitments.map((item) => (
                <li key={item.id}>
                  {item.state}
                  {item.dueAt ? ` · ${item.dueAt}` : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[var(--isalwa-slate)]">{preview.automaticSends.label}</p>
          <FormFeedback error={state?.error} success={state?.success} />
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
          <label htmlFor={`end-${contactId}-reason`} className="isalwa-section-label">
            Motivo
          </label>
          <select id={`end-${contactId}-reason`} name="reason" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Elija el motivo
            </option>
            {Object.entries(CONTACT_RELATION_END_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor={`end-${contactId}-note`} className="isalwa-section-label">
            Detalle
          </label>
          <input id={`end-${contactId}-note`} name="reasonNote" maxLength={500} placeholder="Obligatorio si elige Otro" className={fieldClass} />
          <label htmlFor={`end-${contactId}-day`} className="isalwa-section-label">
            Fecha (opcional)
          </label>
          <input id={`end-${contactId}-day`} name="endedOn" type="date" className={fieldClass} />
          <CommandSubmitButton label="Finalizar relación" variant="secondary" />
        </form>
      ) : null}
    </div>
  );
}
