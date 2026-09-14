'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { createOrderAction } from '@/lib/commercial/actions';

type ConvertQuoteFormProps = {
  partyId: string;
  quoteId: string;
};

export function ConvertQuoteForm({ partyId, quoteId }: ConvertQuoteFormProps) {
  const router = useRouter();
  const [state, action] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createOrderAction(formData);
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
    <form action={action} className="space-y-3">
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <p className="text-sm text-[var(--isalwa-slate)]">
        La conversión crea el pedido y conserva el vínculo con esta cotización. No emite factura ni nota de entrega.
      </p>
      <FormFeedback error={state?.error} />
      <CommandSubmitButton label="Convertir a pedido" />
    </form>
  );
}
