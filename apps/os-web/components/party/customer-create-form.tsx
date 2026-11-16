'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { createCustomerAction } from '@/lib/party/actions';
import { hrefWithClientDataMode } from '@/lib/demo/preserve-data-mode';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForCreateCustomer } from '@/lib/guidance/select';
import {
  CONTACT_PHONE_COUNTRY_OPTIONS,
  DEFAULT_CONTACT_PHONE_COUNTRY,
} from '@/lib/party/contact-phone';
import { submittedValues, usePreservedForm, type PreservedFormState } from '@/lib/commercial/use-preserved-form';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CustomerCreateFormProps = {
  searchedQuery: string;
  hasMoreMatches: boolean;
  matchCount: number;
  /** Steward may set razón social at create; advisors cannot (API refuses). */
  canSetLegalName?: boolean;
};

type State = PreservedFormState;

export function CustomerCreateForm({
  searchedQuery,
  hasMoreMatches,
  matchCount,
  canSetLegalName = false,
}: CustomerCreateFormProps) {
  const router = useRouter();
  const [noPhone, setNoPhone] = useState(false);
  const [state, formAction] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await createCustomerAction(formData);
    if (result.ok) {
      router.push(hrefWithClientDataMode(result.redirectTo));
      router.refresh();
      return null;
    }
    return {
      error: result.error,
      fieldErrors: 'fieldErrors' in result ? result.fieldErrors : undefined,
      values: submittedValues(formData),
    };
  }, null);
  const formRef = usePreservedForm(state);

  if (hasMoreMatches) {
    return <GuidanceNotes notes={guidanceForCreateCustomer({ matchCount, hasMoreMatches: true })} />;
  }

  const value = (name: string) => state?.values?.find(([n]) => n === name)?.[1];

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <GuidanceNotes notes={guidanceForCreateCustomer({ matchCount, hasMoreMatches: false })} />
      <FormFeedback error={state?.error} />
      <input type="hidden" name="searchedQuery" value={searchedQuery} />
      <input type="hidden" name="hasMoreMatches" value="false" />

      <div>
        <label htmlFor="customer-kind" className="isalwa-section-label">
          Tipo
        </label>
        <select
          id="customer-kind"
          name="partyKind"
          required
          defaultValue={value('partyKind') ?? 'organization'}
          className={fieldClass}
        >
          <option value="organization">Empresa</option>
          <option value="person">Persona</option>
        </select>
      </div>

      <div>
        <label htmlFor="customer-name" className="isalwa-section-label">
          Nombre comercial
        </label>
        <input
          id="customer-name"
          name="displayName"
          required
          className={fieldClass}
          placeholder="Nombre con el que se busca este cliente"
          defaultValue={value('displayName') ?? searchedQuery}
          aria-invalid={state?.fieldErrors?.displayName ? true : undefined}
        />
      </div>

      {canSetLegalName ? (
        <div>
          <label htmlFor="customer-legal" className="isalwa-section-label">
            Razón social
          </label>
          <input
            id="customer-legal"
            name="legalName"
            className={fieldClass}
            placeholder="Opcional"
            defaultValue={value('legalName')}
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">No es el NIT ni la razón social tributaria.</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-given" className="isalwa-section-label">
            Nombre del contacto
          </label>
          <input
            id="contact-given"
            name="contactGivenName"
            required
            className={fieldClass}
            defaultValue={value('contactGivenName')}
            aria-invalid={state?.fieldErrors?.contactGivenName ? true : undefined}
          />
        </div>
        <div>
          <label htmlFor="contact-family" className="isalwa-section-label">
            Apellido del contacto
          </label>
          <input
            id="contact-family"
            name="contactFamilyName"
            className={fieldClass}
            defaultValue={value('contactFamilyName')}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
        <div>
          <label htmlFor="create-phone-country" className="isalwa-section-label">
            País
          </label>
          <select
            id="create-phone-country"
            name="phoneCountry"
            defaultValue={value('phoneCountry') ?? DEFAULT_CONTACT_PHONE_COUNTRY}
            disabled={noPhone}
            className={fieldClass}
          >
            {CONTACT_PHONE_COUNTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="create-phone" className="isalwa-section-label">
            Teléfono
          </label>
          <input
            id="create-phone"
            name="phone"
            inputMode="tel"
            className={fieldClass}
            placeholder="70000000"
            disabled={noPhone}
            defaultValue={value('phone')}
            aria-invalid={state?.fieldErrors?.phone ? true : undefined}
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm text-[var(--isalwa-kiln)]">
        <input
          type="checkbox"
          name="noPhoneAvailable"
          className="mt-1"
          checked={noPhone}
          onChange={(event) => setNoPhone(event.target.checked)}
        />
        <span>Sin teléfono disponible</span>
      </label>

      {state?.fieldErrors?.duplicateReason ? (
        <div>
          <label htmlFor="duplicate-reason" className="isalwa-section-label">
            Motivo para registrar otro cliente con este teléfono
          </label>
          <textarea
            id="duplicate-reason"
            name="duplicateReason"
            required
            minLength={1}
            maxLength={500}
            rows={2}
            className={fieldClass}
            defaultValue={value('duplicateReason')}
            aria-invalid
          />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Este teléfono ya aparece en otros registros. No se fusiona en silencio.
          </p>
        </div>
      ) : null}

      <label className="flex items-start gap-3 text-sm text-[var(--isalwa-kiln)]">
        <input type="checkbox" name="confirmDistinct" required className="mt-1" defaultChecked={value('confirmDistinct') === 'on'} />
        <span>
          {matchCount > 0
            ? 'Ninguno de estos registros es el mismo cliente. Crear uno nuevo sin fusionar.'
            : 'Busqué y no existe este cliente. Crear uno nuevo sin fusionar.'}
        </span>
      </label>

      <CommandSubmitButton label="Registrar cliente" />
    </form>
  );
}
