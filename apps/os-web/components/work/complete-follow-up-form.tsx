'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { completeFollowUpAction } from '@/lib/work/actions';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

type CompleteFollowUpFormProps = {
  workItemId: string;
  partyId?: string | null;
};

export function CompleteFollowUpForm({ workItemId, partyId }: CompleteFollowUpFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await completeFollowUpAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: FOLLOW_UP_COPY.completed };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <form action={formAction} className="mt-6 border-t border-[var(--isalwa-mist)] pt-6">
      <input type="hidden" name="workItemId" value={workItemId} />
      {partyId ? <input type="hidden" name="partyId" value={partyId} /> : null}
      <FormFeedback error={state?.error} success={state?.success} />
      <div className="mt-3">
        <CommandSubmitButton label={FOLLOW_UP_COPY.markComplete} />
      </div>
    </form>
  );
}
