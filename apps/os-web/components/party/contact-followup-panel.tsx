'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import type { ContactFollowupPreferenceItem } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { setContactFollowupPreferenceAction } from '@/lib/party/actions';
import { FOLLOWUP_PREFERENCE_LABELS } from '@/lib/party/customer-self-service';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', phone: 'Teléfono', email: 'Correo' };

export function ContactFollowupPanel({
  partyId,
  contactId,
  active,
  canSet,
  items,
}: {
  partyId: string;
  contactId: string;
  active: boolean;
  canSet: boolean;
  items: ContactFollowupPreferenceItem[];
}) {
  if (items.length === 0 && !canSet) return null;
  return (
    <div className="mt-2 space-y-2 text-sm">
      <p className="isalwa-section-label">Seguimiento</p>
      {items.map((item) => (
        <FollowupChannelForm
          key={item.channel}
          partyId={partyId}
          contactId={contactId}
          item={item}
          canSet={canSet && active}
        />
      ))}
    </div>
  );
}

function FollowupChannelForm({
  partyId,
  contactId,
  item,
  canSet,
}: {
  partyId: string;
  contactId: string;
  item: ContactFollowupPreferenceItem;
  canSet: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
    const result = await setContactFollowupPreferenceAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Preferencia registrada.' };
  }, null);
  const current = item.preference ? FOLLOWUP_PREFERENCE_LABELS[item.preference] ?? item.preference : 'Sin preferencia registrada';

  return (
    <div className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
      <p className="text-[var(--isalwa-kiln)]">
        {CHANNEL_LABELS[item.channel] ?? item.channel}: {current}
      </p>
      {canSet ? (
        <form action={action} className="mt-2 space-y-2">
          <FormFeedback error={state?.error} success={state?.success} />
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="contactId" value={contactId} />
          <input type="hidden" name="channel" value={item.channel} />
          <input type="hidden" name="expectedVersion" value={String(item.version)} />
          <label htmlFor={`followup-${contactId}-${item.channel}`} className="isalwa-section-label">
            Registrar
          </label>
          <select id={`followup-${contactId}-${item.channel}`} name="preference" required defaultValue="" className={fieldClass}>
            <option value="" disabled>
              Elija
            </option>
            <option value="no_promotions">No más promociones</option>
            <option value="no_unsolicited_followups">No me escriban</option>
            <option value="allowed">Permitir seguimiento</option>
          </select>
          <label className="flex items-start gap-2 text-xs text-[var(--isalwa-slate)]">
            <input type="checkbox" name="identityConfirmed" className="mt-0.5" />
            <span>Identidad confirmada por una persona. Obligatorio para permitir seguimiento.</span>
          </label>
          <label htmlFor={`followup-note-${contactId}-${item.channel}`} className="isalwa-section-label">
            Nota
          </label>
          <textarea id={`followup-note-${contactId}-${item.channel}`} name="note" rows={2} maxLength={500} className={fieldClass} />
          <p className="text-xs text-[var(--isalwa-slate)]">
            Permitir seguimiento es un registro del personal, con identidad confirmada y una nota. No es un permiso de promociones masivas.
          </p>
          <CommandSubmitButton label="Guardar preferencia" variant="secondary" />
        </form>
      ) : null}
    </div>
  );
}
