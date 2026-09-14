'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { updateContactAction, updateCustomerAction } from '@/lib/party/actions';
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
              className={fieldClass}
            />
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
    </details>
  );
}
