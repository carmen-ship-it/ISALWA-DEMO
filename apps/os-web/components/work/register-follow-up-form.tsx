'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { createFollowUpAction } from '@/lib/work/actions';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

type RegisterFollowUpFormProps = {
  partyId: string;
  /** Present only to refresh the quote page. Not a subject field. */
  quoteId?: string;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function RegisterFollowUpForm({ partyId, quoteId }: RegisterFollowUpFormProps) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string; pendingTitle?: string; dueLabel?: string } | null, formData: FormData) => {
      const result = await createFollowUpAction(formData);
      if (result.ok) {
        setFormKey((key) => key + 1);
        router.refresh();
        return {
          success: FOLLOW_UP_COPY.success,
          pendingTitle: result.pending.title,
          dueLabel: result.pending.dueLabel,
        };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <div className="mb-6 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4">
      <p className="font-medium text-[var(--isalwa-kiln)]">{FOLLOW_UP_COPY.action}</p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{FOLLOW_UP_COPY.ownerNote}</p>
      <FormFeedback error={state?.error} success={state?.success} />
      {state?.pendingTitle ? (
        <p className="mt-3 text-sm text-[var(--isalwa-kiln)]" role="status">
          <span className="isalwa-section-label">{FOLLOW_UP_COPY.pending}</span>
          <span className="mt-1 block">{state.pendingTitle}</span>
          <span className="mt-1 block text-[var(--isalwa-slate)]">
            {FOLLOW_UP_COPY.due}: {state.dueLabel}
          </span>
        </p>
      ) : null}
      <form key={formKey} action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="partyId" value={partyId} />
        {quoteId ? <input type="hidden" name="quoteId" value={quoteId} /> : null}
        <div>
          <label htmlFor="follow-up-title" className="isalwa-section-label">
            {FOLLOW_UP_COPY.nextAction}
          </label>
          <input
            id="follow-up-title"
            name="title"
            required
            className={fieldClass}
            placeholder={FOLLOW_UP_COPY.placeholder}
          />
        </div>
        <div>
          <label htmlFor="follow-up-description" className="isalwa-section-label">
            {FOLLOW_UP_COPY.detail}
          </label>
          <textarea
            id="follow-up-description"
            name="description"
            rows={2}
            className={fieldClass}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label htmlFor="follow-up-due" className="isalwa-section-label">
            {FOLLOW_UP_COPY.due}
          </label>
          <input id="follow-up-due" name="dueAt" type="datetime-local" className={fieldClass} />
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{FOLLOW_UP_COPY.dueHint}</p>
        </div>
        <CommandSubmitButton label={FOLLOW_UP_COPY.action} />
      </form>
    </div>
  );
}
