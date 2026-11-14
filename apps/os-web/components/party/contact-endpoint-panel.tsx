'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState, type ReactNode } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  changeContactPhoneAction,
  resolveContactIdentityReviewAction,
  retireContactPhoneAction,
  revealContactEndpointAction,
} from '@/lib/party/actions';
import {
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_ENDPOINT_STATUS_LABELS,
  CONTACT_PHONE_COUNTRY_OPTIONS,
  CONTACT_PHONE_REASON_OPTIONS,
  CONTACT_PHONE_VERIFICATION_LABELS,
  CONTACT_PHONE_VERIFICATION_OPTIONS,
  DEFAULT_CONTACT_PHONE_COUNTRY,
  IDENTITY_REVIEW_NOTICE,
  endpointHistoryEndLabel,
} from '@/lib/party/contact-phone';
import type { ContactEndpointHistoryResponse, PartyDetailResponse } from '@/lib/party/types';
import { formatTimestamp } from '@/lib/work/labels';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type Contact = PartyDetailResponse['contacts'][number];
type HistoryItem = ContactEndpointHistoryResponse['items'][number];

export type ContactEndpointAuthority = {
  canChangeEndpoints: boolean;
  canReviewEndpointHistory: boolean;
  canRevealEndpoint: boolean;
  canResolveIdentityReview: boolean;
};

type PhoneFormState = { error?: string; success?: string } | null;

function channelLabel(channel: string): string {
  return CONTACT_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ?? channel;
}

function statusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return CONTACT_ENDPOINT_STATUS_LABELS[status] ?? null;
}

function ReasonFields({ prefix }: { prefix: string }) {
  return (
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
        <input
          id={`${prefix}-reason-note`}
          name="reasonNote"
          maxLength={500}
          placeholder="Obligatorio si elige Otro"
          className={fieldClass}
        />
      </div>
    </div>
  );
}

function ChannelFields({ prefix, includeCountry }: { prefix: string; includeCountry: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${prefix}-channel`} className="isalwa-section-label">
          Canal
        </label>
        <select id={`${prefix}-channel`} name="channel" defaultValue="phone" className={fieldClass}>
          {CONTACT_CHANNEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {includeCountry ? (
        <div>
          <label htmlFor={`${prefix}-country`} className="isalwa-section-label">
            País
          </label>
          <select id={`${prefix}-country`} name="country" defaultValue={DEFAULT_CONTACT_PHONE_COUNTRY} className={fieldClass}>
            {CONTACT_PHONE_COUNTRY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}

export function ContactEndpointPanel({
  partyId,
  contact,
  authority,
  history,
}: {
  partyId: string;
  contact: Contact;
  authority: ContactEndpointAuthority;
  /** Present only when the server allowed masked history. Never contains a full number. */
  history: HistoryItem[] | null;
}) {
  const phoneReview = contact.phoneStatus === 'identity_review';
  const whatsappReview = contact.whatsappStatus === 'identity_review';
  const hidden = (
    <>
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="contactId" value={contact.id} />
      <input type="hidden" name="expectedVersion" value={contact.version} />
    </>
  );

  return (
    <div className="mt-2 space-y-3 text-sm" data-contact-endpoints={contact.id}>
      <p className="text-[var(--isalwa-slate)]">
        Teléfono: {contact.phoneDisplay || contact.phone || 'Sin número'}
        {statusLabel(contact.phoneStatus) ? ` · ${statusLabel(contact.phoneStatus)}` : ''}
      </p>
      <p className="text-[var(--isalwa-slate)]">
        WhatsApp: {contact.whatsappDisplay || contact.whatsapp || 'Sin número'}
        {statusLabel(contact.whatsappStatus) ? ` · ${statusLabel(contact.whatsappStatus)}` : ''}
      </p>
      {phoneReview || whatsappReview ? <p className="text-[var(--isalwa-kiln)]">{IDENTITY_REVIEW_NOTICE}</p> : null}
      {authority.canResolveIdentityReview && phoneReview ? (
        <IdentityReviewForm partyId={partyId} contact={contact} channel="phone" />
      ) : null}
      {authority.canResolveIdentityReview && whatsappReview ? (
        <IdentityReviewForm partyId={partyId} contact={contact} channel="whatsapp" />
      ) : null}
      {authority.canChangeEndpoints ? <ChangeAndRetireForms contact={contact} hidden={hidden} /> : null}
      {authority.canReviewEndpointHistory ? (
        <EndpointHistory
          partyId={partyId}
          contactId={contact.id}
          items={history ?? []}
          canReveal={authority.canRevealEndpoint}
        />
      ) : null}
    </div>
  );
}

function ChangeAndRetireForms({ contact, hidden }: { contact: Contact; hidden: ReactNode }) {
  const router = useRouter();
  const idPrefix = `endpoint-${contact.id}`;
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
    return { success: 'Número retirado. Ya no se usa como destino actual.' };
  }, null);
  const canRetire = Boolean(contact.phone || contact.whatsapp);

  return (
    <div className="space-y-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
      <form action={changeAction} className="space-y-3">
        <p className="font-medium text-[var(--isalwa-kiln)]">Cambiar número</p>
        <FormFeedback error={changeState?.error} success={changeState?.success} />
        {hidden}
        <ChannelFields prefix={`${idPrefix}-change`} includeCountry />
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
        <ReasonFields prefix={`${idPrefix}-change`} />
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
      {canRetire ? (
        <form action={retireAction} className="space-y-3 border-t border-[var(--isalwa-mist)] pt-3">
          <p className="font-medium text-[var(--isalwa-kiln)]">Retirar número</p>
          <p className="text-xs text-[var(--isalwa-slate)]">
            Retirar deja el contacto y su historial, y saca el número de los destinos actuales.
          </p>
          <FormFeedback error={retireState?.error} success={retireState?.success} />
          {hidden}
          <ChannelFields prefix={`${idPrefix}-retire`} includeCountry={false} />
          <ReasonFields prefix={`${idPrefix}-retire`} />
          <CommandSubmitButton label="Retirar número" variant="secondary" />
        </form>
      ) : null}
    </div>
  );
}

function IdentityReviewForm({
  partyId,
  contact,
  channel,
}: {
  partyId: string;
  contact: Contact;
  channel: 'phone' | 'whatsapp';
}) {
  const router = useRouter();
  const prefix = `identity-${contact.id}-${channel}`;
  const [state, action] = useActionState(async (_prev: PhoneFormState, formData: FormData) => {
    const result = await resolveContactIdentityReviewAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Revisión de identidad registrada.' };
  }, null);

  return (
    <form action={action} className="space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
      <p className="font-medium text-[var(--isalwa-kiln)]">Revisión de identidad · {channelLabel(channel)}</p>
      <FormFeedback error={state?.error} success={state?.success} />
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="contactId" value={contact.id} />
      <input type="hidden" name="expectedVersion" value={contact.version} />
      <input type="hidden" name="channel" value={channel} />
      <div>
        <label htmlFor={`${prefix}-decision`} className="isalwa-section-label">
          Decisión
        </label>
        <select id={`${prefix}-decision`} name="decision" required defaultValue="" className={fieldClass}>
          <option value="" disabled>
            Elija la decisión
          </option>
          <option value="confirmed">Confirmar identidad</option>
          <option value="rejected">Rechazar y retirar el número</option>
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-method`} className="isalwa-section-label">
          Cómo se verificó
        </label>
        <select id={`${prefix}-method`} name="verificationMethod" required defaultValue="" className={fieldClass}>
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
      <div>
        <label htmlFor={`${prefix}-note`} className="isalwa-section-label">
          Nota (opcional)
        </label>
        <input id={`${prefix}-note`} name="note" maxLength={500} className={fieldClass} />
      </div>
      <CommandSubmitButton label="Registrar revisión" variant="secondary" />
    </form>
  );
}

function EndpointHistory({
  partyId,
  contactId,
  items,
  canReveal,
}: {
  partyId: string;
  contactId: string;
  items: HistoryItem[];
  canReveal: boolean;
}) {
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="isalwa-section-label">Historial de números</p>
      {items.length === 0 ? (
        <p className="text-[var(--isalwa-slate)]">No hay números anteriores en este contacto.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {items.map((item) => {
            const endLabel = endpointHistoryEndLabel(item.endReason);
            const method =
              item.verificationMethod && CONTACT_PHONE_VERIFICATION_LABELS[item.verificationMethod]
                ? CONTACT_PHONE_VERIFICATION_LABELS[item.verificationMethod]
                : null;
            return (
              <li key={item.associationId} className="text-[var(--isalwa-slate)]">
                <p>
                  {channelLabel(item.channel)}: {revealed[item.associationId] ?? item.numberMasked ?? '—'}
                  {item.endedAt ? '' : ' · vigente'}
                </p>
                <p className="text-xs">
                  {[formatTimestamp(item.startedAt), item.endedAt ? formatTimestamp(item.endedAt) : null, endLabel, method]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {canReveal && !revealed[item.associationId] ? (
                  <RevealForm
                    partyId={partyId}
                    contactId={contactId}
                    associationId={item.associationId}
                    onRevealed={(number) => setRevealed((current) => ({ ...current, [item.associationId]: number }))}
                    onError={setError}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {error ? <p className="text-sm text-[var(--isalwa-kiln)]">{error}</p> : null}
    </div>
  );
}

function RevealForm({
  partyId,
  contactId,
  associationId,
  onRevealed,
  onError,
}: {
  partyId: string;
  contactId: string;
  associationId: string;
  onRevealed: (number: string) => void;
  onError: (message: string | null) => void;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-1 space-y-2"
      action={async (formData) => {
        setPending(true);
        onError(null);
        const result = await revealContactEndpointAction(formData);
        setPending(false);
        if (!result.ok) {
          onError(result.error);
          return;
        }
        onRevealed(result.number);
      }}
    >
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="contactId" value={contactId} />
      <input type="hidden" name="associationId" value={associationId} />
      <label htmlFor={`reveal-${associationId}`} className="isalwa-section-label">
        Motivo para ver el número
      </label>
      <input
        id={`reveal-${associationId}`}
        name="justification"
        required
        minLength={10}
        maxLength={500}
        className={fieldClass}
      />
      <p className="text-xs text-[var(--isalwa-slate)]">Explique por qué necesita ver el número completo.</p>
      <CommandSubmitButton label={pending ? 'Mostrando…' : 'Ver número completo'} variant="secondary" />
    </form>
  );
}
