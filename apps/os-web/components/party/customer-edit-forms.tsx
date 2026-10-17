'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  changeContactPhoneAction,
  retireContactPhoneAction,
  updateContactAction,
  updateCustomerAction,
} from '@/lib/party/actions';
import { CONTACT_PHONE_REASON_OPTIONS, CONTACT_PHONE_VERIFICATION_OPTIONS } from '@/lib/party/contact-phone';
import { PARTY_CHANGE_KIND_OPTIONS } from '@/lib/party/customer-self-service';
import type { PartyDetailResponse } from '@/lib/party/types';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CustomerEditFormsProps = {
  party: PartyDetailResponse['party'];
  contacts: PartyDetailResponse['contacts'];
  canEditParty: boolean;
  canEditContacts: boolean;
};

export function CustomerEditForms({
  party,
  contacts,
  canEditParty,
  canEditContacts,
}: CustomerEditFormsProps) {
  if (!canEditParty && !canEditContacts) return null;

  return (
    <div className="mt-8 space-y-6">
      {canEditParty ? <PartyFieldsForm party={party} /> : null}
      {canEditContacts ? (
        <>
          {contacts.map((contact) => (
            <ContactFieldsForm key={contact.id} organizationPartyId={party.id} contact={contact} />
          ))}
          <ContactFieldsForm organizationPartyId={party.id} />
        </>
      ) : null}
    </div>
  );
}

function PartyFieldsForm({ party }: { party: PartyDetailResponse['party'] }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await updateCustomerAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Datos del cliente actualizados.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <details className="border-t border-[var(--isalwa-mist)] pt-6">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
        Editar datos del cliente
      </summary>
      <form action={formAction} className="mt-4 space-y-4">
        <FormFeedback error={state?.error} success={state?.success} />
        <input type="hidden" name="partyId" value={party.id} />
        <input type="hidden" name="expectedVersion" value={party.version} />
        <div>
          <label htmlFor="edit-display-name" className="isalwa-section-label">
            Nombre
          </label>
          <input
            id="edit-display-name"
            name="displayName"
            required
            defaultValue={party.displayName}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="edit-legal-name" className="isalwa-section-label">
            Razón social
          </label>
          <input
            id="edit-legal-name"
            name="legalName"
            defaultValue={party.legalName ?? ''}
            className={fieldClass}
          />
        </div>
        <input type="hidden" name="previousDisplayName" value={party.displayName} />
        <input type="hidden" name="previousLegalName" value={party.legalName ?? ''} />
        <div>
          <label htmlFor="edit-change-kind" className="isalwa-section-label">
            Tipo de cambio
          </label>
          <select id="edit-change-kind" name="changeKind" defaultValue="update" className={fieldClass}>
            {PARTY_CHANGE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-change-reason" className="isalwa-section-label">
            Motivo
          </label>
          <textarea id="edit-change-reason" name="changeReason" rows={2} maxLength={500} className={fieldClass} />
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
            Obligatorio salvo un error de escritura en el nombre. Queda en el historial con el valor anterior y el nuevo.
          </p>
        </div>
        <CommandSubmitButton label="Guardar cliente" />
      </form>
    </details>
  );
}

function ContactFieldsForm({
  organizationPartyId,
  contact,
}: {
  organizationPartyId: string;
  contact?: PartyDetailResponse['contacts'][number];
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await updateContactAction(formData);
      if (result.ok) {
        if (!contact) setFormKey((key) => key + 1);
        router.refresh();
        return { success: contact ? 'Contacto actualizado.' : 'Contacto agregado.' };
      }
      return { error: result.error };
    },
    null,
  );
  const idPrefix = contact ? `contact-${contact.id}` : 'contact-new';

  return (
    <details className="border-t border-[var(--isalwa-mist)] pt-6">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
        {contact ? `Editar contacto · ${contact.givenName} ${contact.familyName}` : 'Agregar contacto'}
      </summary>
      <form key={formKey} action={formAction} className="mt-4 space-y-4">
        <FormFeedback error={state?.error} success={state?.success} />
        <input type="hidden" name="organizationPartyId" value={organizationPartyId} />
        {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-given`} className="isalwa-section-label">
              Nombre
            </label>
            <input
              id={`${idPrefix}-given`}
              name="givenName"
              required
              defaultValue={contact?.givenName ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-family`} className="isalwa-section-label">
              Apellido
            </label>
            <input
              id={`${idPrefix}-family`}
              name="familyName"
              required
              defaultValue={contact?.familyName ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-email`} className="isalwa-section-label">
              Correo
            </label>
            <input
              id={`${idPrefix}-email`}
              name="email"
              type="email"
              defaultValue={contact?.email ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-phone`} className="isalwa-section-label">
              Teléfono
            </label>
            <input
              id={`${idPrefix}-phone`}
              name="phone"
              defaultValue={contact?.phone ?? ''}
              readOnly={Boolean(contact)}
              aria-describedby={contact ? `${idPrefix}-phone-hint` : undefined}
              className={fieldClass}
            />
            {contact ? (
              <p id={`${idPrefix}-phone-hint`} className="mt-1 text-xs text-[var(--isalwa-slate)]">
                Para cambiar o retirar el número use “Cambiar o retirar teléfono”.
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor={`${idPrefix}-whatsapp`} className="isalwa-section-label">
              WhatsApp
            </label>
            <input
              id={`${idPrefix}-whatsapp`}
              name="whatsapp"
              defaultValue={contact?.whatsapp ?? ''}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-title`} className="isalwa-section-label">
              Cargo
            </label>
            <input
              id={`${idPrefix}-title`}
              name="title"
              defaultValue={contact?.title ?? ''}
              className={fieldClass}
            />
          </div>
        </div>
        <CommandSubmitButton label={contact ? 'Guardar contacto' : 'Agregar contacto'} />
      </form>
      {contact ? <ContactPhoneForms partyId={organizationPartyId} contact={contact} /> : null}
    </details>
  );
}

type PhoneFormState = { error?: string; success?: string } | null;

function ContactPhoneForms({
  partyId,
  contact,
}: {
  partyId: string;
  contact: PartyDetailResponse['contacts'][number];
}) {
  const router = useRouter();
  const [changeState, changeAction] = useActionState(async (_prev: PhoneFormState, formData: FormData) => {
    const result = await changeContactPhoneAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Número actualizado. El anterior queda en el historial.' };
  }, null);
  const [retireState, retireAction] = useActionState(async (_prev: PhoneFormState, formData: FormData) => {
    const result = await retireContactPhoneAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Número retirado. Ya no se usa para seguimientos.' };
  }, null);
  const idPrefix = `contact-${contact.id}-phone`;
  const hidden = (
    <>
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="contactId" value={contact.id} />
      <input type="hidden" name="expectedVersion" value={contact.version} />
    </>
  );
  const reasonFields = (prefix: string) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${prefix}-reason`} className="isalwa-section-label">
          Motivo
        </label>
        <select id={`${prefix}-reason`} name="reason" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Elija el motivo
          </option>
          {CONTACT_PHONE_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-reason-note`} className="isalwa-section-label">
          Detalle del motivo
        </label>
        <input id={`${prefix}-reason-note`} name="reasonNote" maxLength={500} placeholder="Obligatorio si elige Otro" className={fieldClass} />
      </div>
    </div>
  );

  return (
    <details className="mt-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">Cambiar o retirar teléfono</summary>
      <form action={changeAction} className="mt-4 space-y-4">
        <FormFeedback error={changeState?.error} success={changeState?.success} />
        {hidden}
        <p className="text-sm text-[var(--isalwa-slate)]">Número actual: {contact.phone ?? 'Sin número'}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${idPrefix}-new`} className="isalwa-section-label">
              Número nuevo
            </label>
            <input id={`${idPrefix}-new`} name="newPhone" required inputMode="tel" maxLength={32} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-method`} className="isalwa-section-label">
              Cómo se verificó
            </label>
            <select id={`${idPrefix}-method`} name="verificationMethod" required defaultValue="" className={fieldClass}>
              <option value="" disabled>
                Elija el método
              </option>
              {CONTACT_PHONE_VERIFICATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {reasonFields(`${idPrefix}-change`)}
        <div>
          <label htmlFor={`${idPrefix}-evidence`} className="isalwa-section-label">
            Nota de verificación (opcional)
          </label>
          <input id={`${idPrefix}-evidence`} name="evidenceNote" maxLength={500} className={fieldClass} />
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
            No adjunte documentos personales. Un mensaje nuevo que dice “soy el contacto” no verifica el número.
          </p>
        </div>
        <CommandSubmitButton label="Cambiar número" variant="secondary" />
      </form>
      {contact.phone ? (
        <form action={retireAction} className="mt-6 space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
          <FormFeedback error={retireState?.error} success={retireState?.success} />
          {hidden}
          <p className="text-sm text-[var(--isalwa-slate)]">
            Retirar deja el contacto y su historial, y saca el número de seguimientos y de la selección por defecto.
          </p>
          {reasonFields(`${idPrefix}-retire`)}
          <CommandSubmitButton label="Retirar número" variant="secondary" />
        </form>
      ) : null}
    </details>
  );
}
