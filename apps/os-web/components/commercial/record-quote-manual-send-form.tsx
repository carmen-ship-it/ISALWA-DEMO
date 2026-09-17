'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useId, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { recordQuoteManualSendAction } from '@/lib/commercial/actions';
import {
  QUOTE_MANUAL_SEND_COPY,
  quoteManualSendHistoryLabel,
} from '@/lib/commercial/quote-manual-send';

type RecordQuoteManualSendFormProps = {
  partyId: string;
  quoteId: string;
  quoteNumber: string;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function RecordQuoteManualSendForm({
  partyId,
  quoteId,
  quoteNumber,
}: RecordQuoteManualSendFormProps) {
  const router = useRouter();
  const formId = useId();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (
      _prev: { error?: string; success?: string; channel?: string } | null,
      formData: FormData,
    ) => {
      const result = await recordQuoteManualSendAction(formData);
      if (result.ok) {
        setFormKey((key) => key + 1);
        router.refresh();
        return {
          success: quoteManualSendHistoryLabel(result.channel),
          channel: result.channel,
        };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <div className="space-y-6">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {QUOTE_MANUAL_SEND_COPY.disclaimer}
      </p>
      <FormFeedback error={state?.error} success={state?.success} />
      {state?.success ? (
        <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4">
          <p className="font-medium text-[var(--isalwa-kiln)]">
            {QUOTE_MANUAL_SEND_COPY.followUpPrompt}
          </p>
          <div className="mt-4">
            <RegisterFollowUpForm
              partyId={partyId}
              quoteId={quoteId}
              quoteNumber={quoteNumber}
              promptMode="after-send"
            />
          </div>
        </div>
      ) : (
        <form key={formKey} action={formAction} className="space-y-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <fieldset>
            <legend className="isalwa-section-label">{QUOTE_MANUAL_SEND_COPY.channel}</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-[var(--isalwa-kiln)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="channel"
                  value="whatsapp"
                  defaultChecked
                  required
                />
                {QUOTE_MANUAL_SEND_COPY.channelWhatsapp}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="channel" value="email" required />
                {QUOTE_MANUAL_SEND_COPY.channelEmail}
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="channel" value="otro" required />
                {QUOTE_MANUAL_SEND_COPY.channelOther}
              </label>
            </div>
          </fieldset>
          <div>
            <label htmlFor={`${formId}-note`} className="isalwa-section-label">
              {QUOTE_MANUAL_SEND_COPY.note}
            </label>
            <textarea
              id={`${formId}-note`}
              name="note"
              rows={2}
              className={fieldClass}
              placeholder={QUOTE_MANUAL_SEND_COPY.noteOptional}
            />
          </div>
          <CommandSubmitButton
            label={QUOTE_MANUAL_SEND_COPY.action}
            pendingLabel={QUOTE_MANUAL_SEND_COPY.pendingLabel}
          />
        </form>
      )}
    </div>
  );
}
