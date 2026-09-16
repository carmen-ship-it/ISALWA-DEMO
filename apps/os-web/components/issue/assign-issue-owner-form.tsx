'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import {
  assignIssueOwnerAction,
  type AssignIssueOwnerActionResult,
} from '@/lib/issue/actions';
import { ISSUE_COPY } from '@/lib/issue/labels';

type AssignIssueOwnerFormProps = {
  issueId: string;
  expectedVersion: number;
  currentOwnerMemberId?: string | null;
  currentOwnerLabel?: string | null;
};

export function AssignIssueOwnerForm({
  issueId,
  expectedVersion,
  currentOwnerMemberId,
  currentOwnerLabel,
}: AssignIssueOwnerFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (
      _prev: AssignIssueOwnerActionResult | null,
      formData: FormData,
    ): Promise<AssignIssueOwnerActionResult | null> => {
      const result = await assignIssueOwnerAction(formData);
      if (result.ok) {
        router.refresh();
      }
      return result;
    },
    null,
  );

  return (
    <div className="mt-4">
      <FormFeedback
        error={state && !state.ok ? state.error : null}
        success={state?.ok ? ISSUE_COPY.assignOwnerSuccess : null}
      />
      <form action={formAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <input type="hidden" name="issueId" value={issueId} />
        <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
        <div className="min-w-0 flex-1">
          <label htmlFor={`issue-owner-${issueId}`} className="isalwa-section-label">
            {ISSUE_COPY.owner}
          </label>
          <ServerMemberTypeahead
            id={`issue-owner-${issueId}`}
            name="ownerMemberId"
            required
            defaultMemberId={currentOwnerMemberId ?? undefined}
            defaultLabel={currentOwnerLabel ?? ''}
            placeholder="Buscar persona"
          />
        </div>
        <CommandSubmitButton
          label={ISSUE_COPY.assignOwner}
          pendingLabel={ISSUE_COPY.assignOwnerPending}
          variant="secondary"
        />
      </form>
    </div>
  );
}
