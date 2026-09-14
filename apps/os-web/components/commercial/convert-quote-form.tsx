'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNote } from '@/components/guidance/guidance-note';
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
    <form action={action} className="space-y-6">
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <GuidanceNote
        kind="consejo"
        title="Antes de convertir a pedido"
        items={['Confirme que esta es la cotización correcta.']}
      />
      <GuidanceNote
        kind="regla"
        title="Convertir crea un pedido"
        items={['Convertir crea un pedido desde una cotización enviada. No emite factura ni nota de entrega.']}
      />
      <FormFeedback error={state?.error} />
      <CommandSubmitButton label="Convertir a pedido" pendingLabel="Registrando pedido…" />
    </form>
  );
}
