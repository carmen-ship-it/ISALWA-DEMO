'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CORRECTION_FIELDS } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { reportCorrectionAction } from '@/components/issue/correction-actions';
import { CORRECTION_FIELD_LABELS } from '@/components/issue/correction-request';
import { issueHref } from '@/lib/issue/navigation';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CorrectionRequestForm({
  partyId,
  contacts,
  locations,
}: {
  partyId: string;
  contacts: Array<{ id: string; label: string }>;
  locations: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: { error?: string } | null, formData: FormData) => {
    const result = await reportCorrectionAction(formData);
    if (!result.ok) return { error: result.error };
    router.push(issueHref(result.issueId));
    return null;
  }, null);

  return (
    <form action={action} className="mt-4 space-y-3">
      <p className="text-sm text-[var(--isalwa-slate)]">
        La solicitud no cambia los datos. El cambio se hace después, en las pantallas habituales del cliente.
      </p>
      <FormFeedback error={state?.error} />
      <input type="hidden" name="partyId" value={partyId} />
      <label htmlFor="correction-field" className="isalwa-section-label">
        Dato
      </label>
      <select id="correction-field" name="field" required defaultValue="" className={fieldClass}>
        <option value="" disabled>
          Elija el dato
        </option>
        {CORRECTION_FIELDS.map((field) => (
          <option key={field} value={field}>
            {CORRECTION_FIELD_LABELS[field]}
          </option>
        ))}
      </select>
      {contacts.length > 0 ? (
        <select name="contactId" defaultValue="" className={fieldClass} aria-label="Contacto">
          <option value="">Contacto, si el dato es de un contacto</option>
          {contacts.map((contact) => (
            <option key={contact.id} value={contact.id}>
              {contact.label}
            </option>
          ))}
        </select>
      ) : null}
      {locations.length > 0 ? (
        <select name="locationId" defaultValue="" className={fieldClass} aria-label="Ubicación">
          <option value="">Ubicación, si el dato es de una ubicación</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label}
            </option>
          ))}
        </select>
      ) : null}
      <label htmlFor="correction-value" className="isalwa-section-label">
        Valor propuesto
      </label>
      <textarea id="correction-value" name="proposedValue" required maxLength={500} rows={2} className={fieldClass} />
      <label htmlFor="correction-source" className="isalwa-section-label">
        Origen
      </label>
      <select id="correction-source" name="source" required defaultValue="staff" className={fieldClass}>
        <option value="customer">El cliente</option>
        <option value="staff">El personal</option>
        <option value="document">Un documento</option>
      </select>
      <label htmlFor="correction-description" className="isalwa-section-label">
        Descripción
      </label>
      <textarea id="correction-description" name="description" required rows={3} className={fieldClass} />
      <CommandSubmitButton label="Solicitar corrección" variant="secondary" />
    </form>
  );
}
