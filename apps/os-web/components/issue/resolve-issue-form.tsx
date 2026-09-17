'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { resolveIssueAction, type ResolveIssueActionResult } from '@/lib/issue/actions';
import { ISSUE_COPY } from '@/lib/issue/labels';

type ResolveIssueFormProps = {
  issueId: string;
  expectedVersion: number;
};

export function ResolveIssueForm({ issueId, expectedVersion }: ResolveIssueFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (
      _prev: ResolveIssueActionResult | null,
      formData: FormData,
    ): Promise<ResolveIssueActionResult | null> => {
      const result = await resolveIssueAction(formData);
      if (result.ok) {
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <div className="mt-6 border-t border-[var(--isalwa-mist)] pt-6">
      <FormFeedback
        error={state && !state.ok ? state.error : null}
        success={state?.ok ? ISSUE_COPY.resolveSuccess : null}
      />
      <form action={formAction} className="mt-3 flex flex-col gap-3">
        <input type="hidden" name="issueId" value={issueId} />
        <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
        <div>
          <label htmlFor={`issue-resolution-${issueId}`} className="isalwa-section-label">
            {ISSUE_COPY.resolution}
          </label>
          <textarea
            id={`issue-resolution-${issueId}`}
            name="resolution"
            required
            rows={4}
            placeholder={ISSUE_COPY.resolutionPlaceholder}
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          />
        </div>
        <CommandSubmitButton
          label={ISSUE_COPY.resolveIssue}
          pendingLabel={ISSUE_COPY.resolveIssuePending}
          variant="primary"
        />
      </form>
    </div>
  );
}
