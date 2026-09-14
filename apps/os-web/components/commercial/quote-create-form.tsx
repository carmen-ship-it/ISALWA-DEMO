'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { PageSection } from '@isalwa/ui';
import { createQuoteAction } from '@/lib/commercial/actions';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForCreateQuote } from '@/lib/guidance/select';

type QuoteCreateFormProps = {
  partyId: string;
  opportunityId: string;
  opportunityTitle: string;
};

export function QuoteCreateForm({ partyId, opportunityId, opportunityTitle }: QuoteCreateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createQuoteAction(formData);
      if (result.ok) {
        router.push(result.redirectTo);
        router.refresh();
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <PageSection card className="bg-white p-8 md:p-10">
      <p className="text-sm text-[var(--isalwa-slate)]">
        Oportunidad: <span className="font-medium text-[var(--isalwa-kiln)]">{opportunityTitle}</span>
      </p>
      <FormFeedback error={state?.error} />
      <form action={formAction} className="mt-4 space-y-4">
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
        <CommandSubmitButton label="Nueva cotización" pendingLabel="Creando…" />
      </form>
    </PageSection>
  );
}
