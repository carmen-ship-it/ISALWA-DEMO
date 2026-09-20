'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { PageSection } from '@isalwa/ui';
import { createQuoteAction } from '@/lib/commercial/actions';
import { hrefWithClientDataMode } from '@/lib/demo/preserve-data-mode';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForCreateQuote } from '@/lib/guidance/select';

type QuoteCreateFormProps = {
  partyId: string;
  opportunityId: string;
  opportunityTitle: string;
  customerName: string;
  ownerLabel?: string | null;
  dataModeLabel?: string | null;
};

export function QuoteCreateForm({
  partyId,
  opportunityId,
  opportunityTitle,
  customerName,
  ownerLabel,
  dataModeLabel,
}: QuoteCreateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createQuoteAction(formData);
      if (result.ok) {
        router.push(hrefWithClientDataMode(result.redirectTo));
        router.refresh();
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <PageSection card className="bg-white p-6 md:p-8">
      <dl className="grid gap-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-200)_40%,white)] p-4 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <dt className="isalwa-section-label">Cliente</dt>
          <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{customerName}</dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Oportunidad</dt>
          <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{opportunityTitle}</dd>
        </div>
        {ownerLabel ? (
          <div>
            <dt className="isalwa-section-label">Responsable</dt>
            <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{ownerLabel}</dd>
          </div>
        ) : null}
        {dataModeLabel ? (
          <div>
            <dt className="isalwa-section-label">Datos</dt>
            <dd className="mt-1 font-medium text-[var(--isalwa-kiln)]">{dataModeLabel}</dd>
          </div>
        ) : null}
      </dl>
      <FormFeedback error={state?.error} />
      <form action={formAction} className="mt-6 space-y-4">
        <GuidanceNotes notes={guidanceForCreateQuote()} />
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <div>
          <label htmlFor="quote-notes" className="isalwa-section-label">
            Notas
          </label>
          <textarea
            id="quote-notes"
            name="notes"
            rows={3}
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            placeholder="Opcional"
          />
        </div>
        <CommandSubmitButton label="Crear cotización" pendingLabel="Creando…" />
      </form>
    </PageSection>
  );
}
