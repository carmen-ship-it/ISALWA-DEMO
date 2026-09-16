'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { cancelFollowUpAction } from '@/lib/work/actions';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

type CancelFollowUpFormProps = {
  workItemId: string;
  partyId?: string | null;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CancelFollowUpForm({ workItemId, partyId }: CancelFollowUpFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await cancelFollowUpAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: FOLLOW_UP_COPY.cancelled };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <form action={formAction} className="mt-4 border-t border-[var(--isalwa-mist)] pt-4">
      <input type="hidden" name="workItemId" value={workItemId} />
      {partyId ? <input type="hidden" name="partyId" value={partyId} /> : null}
      <p className="text-sm text-[var(--isalwa-slate)]">{FOLLOW_UP_COPY.historyNote}</p>
      <label htmlFor="cancel-reason" className="isalwa-section-label mt-3 block">
        {FOLLOW_UP_COPY.cancelReason}
      </label>
      <input id="cancel-reason" name="reason" className={fieldClass} />
      <FormFeedback error={state?.error} success={state?.success} />
      <div className="mt-3">
        <CommandSubmitButton label={FOLLOW_UP_COPY.markCancel} variant="secondary" />
      </div>
    </form>
  );
}
