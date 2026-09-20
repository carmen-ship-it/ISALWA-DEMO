'use client';

import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { PURCHASING_CONCLUSIONS } from '@/lib/purchasing/resolve-review-copy';
import { resolvePurchasingReviewAction } from '@/lib/purchasing/resolve-review-action';

const fieldClass =
  'mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)]';

type ResolvePurchasingReviewFormProps = {
  workItemId: string;
  requesterMemberId: string;
  partyId: string;
  orderId: string;
  orderNumber: string;
};

export function ResolvePurchasingReviewForm(props: ResolvePurchasingReviewFormProps) {
  const [state, action] = useActionState(
    async (_prev: { error?: string; ok?: boolean } | null, formData: FormData) => {
      const result = await resolvePurchasingReviewAction(formData);
      if (result.ok) return { ok: true };
      return { error: result.error };
    },
    null,
  );

  if (state?.ok) {
    return (
      <p className="mt-3 text-sm text-[var(--isalwa-kiln)]">
        Resultado registrado. Quien pidió la revisión lo ve en Mi trabajo. No se creó una orden de compra.
      </p>
    );
  }

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="workItemId" value={props.workItemId} />
      <input type="hidden" name="requesterMemberId" value={props.requesterMemberId} />
      <input type="hidden" name="partyId" value={props.partyId} />
      <input type="hidden" name="orderId" value={props.orderId} />
      <input type="hidden" name="orderNumber" value={props.orderNumber} />
      <label className="block text-sm text-[var(--isalwa-kiln)]">
        Conclusión
        <select name="conclusion" required className={fieldClass} defaultValue="">
          <option value="" disabled>
            Seleccione
          </option>
          {PURCHASING_CONCLUSIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm text-[var(--isalwa-kiln)]">
        Comentario / conclusión
        <textarea name="comment" required maxLength={500} className={fieldClass} rows={3} />
      </label>
      {state?.error ? <p className="text-sm text-[var(--isalwa-danger)]">{state.error}</p> : null}
      <CommandSubmitButton label="Resolver revisión" pendingLabel="Registrando…" variant="primary" />
    </form>
  );
}
