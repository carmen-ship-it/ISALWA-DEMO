'use client';

import { useActionState, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ContextDrawer } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { reportIssueAction, type ReportIssueActionResult } from '@/lib/issue/actions';
import { ISSUE_COPY, formatReferenceType } from '@/lib/issue/labels';
import { issueHref } from '@/lib/issue/navigation';
import type { ReportIssueContext } from '@/lib/issue/types';

type ReportIssueDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context?: ReportIssueContext | null;
  reportedByLabel?: string;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const readonlyClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-3 py-2 text-[var(--isalwa-slate)]';

export function ReportIssueDrawer({
  open,
  onOpenChange,
  context,
  reportedByLabel,
}: ReportIssueDrawerProps) {
  const router = useRouter();
  const descriptionId = useId();
  const contextId = useId();
  const reporterId = useId();
  const dateId = useId();
  const [formKey, setFormKey] = useState(0);

  const [state, formAction] = useActionState(
    async (
      _prev: ReportIssueActionResult | null,
      formData: FormData,
    ): Promise<ReportIssueActionResult | null> => {
      const result = await reportIssueAction(formData);
      if (result.ok) {
        setFormKey((k) => k + 1);
        // Navigate to the new issue and close drawer
        router.push(issueHref(result.issueId));
        onOpenChange(false);
        router.refresh();
      }
      return result;
    },
    null,
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setFormKey((k) => k + 1);
  }, [onOpenChange]);

  const contextLabel = context?.referenceLabel
    ? `${formatReferenceType(context.referenceType!)} · ${context.referenceLabel}`
    : context?.referenceType
      ? formatReferenceType(context.referenceType)
      : null;

  const now = new Date().toLocaleDateString('es', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <ContextDrawer open={open} title={ISSUE_COPY.reportTitle} onClose={handleClose}>
      <form key={formKey} action={formAction} className="space-y-5">
        {/* Hidden fields for context */}
        {context?.referenceType ? (
          <input type="hidden" name="referenceType" value={context.referenceType} />
        ) : null}
        {context?.referenceId ? (
          <input type="hidden" name="referenceId" value={context.referenceId} />
        ) : null}
        {context?.partyId ? (
          <input type="hidden" name="partyId" value={context.partyId} />
        ) : null}

        {/* Description field */}
        <div>
          <label htmlFor={descriptionId} className="isalwa-section-label">
            {ISSUE_COPY.descriptionLabel}
          </label>
          <textarea
            id={descriptionId}
            name="description"
            required
            rows={4}
            className={fieldClass}
            placeholder={ISSUE_COPY.descriptionPlaceholder}
          />
        </div>

        {/* Context (readonly if present) */}
        {contextLabel ? (
          <div>
            <label htmlFor={contextId} className="isalwa-section-label">
              {ISSUE_COPY.contextLabel}
            </label>
            <input
              id={contextId}
              type="text"
              value={contextLabel}
              readOnly
              className={readonlyClass}
            />
          </div>
        ) : null}

        {/* Reported by (readonly) */}
        {reportedByLabel ? (
          <div>
            <label htmlFor={reporterId} className="isalwa-section-label">
              {ISSUE_COPY.reportedByLabel}
            </label>
            <input
              id={reporterId}
              type="text"
              value={reportedByLabel}
              readOnly
              className={readonlyClass}
            />
          </div>
        ) : null}

        {/* Date (readonly, auto) */}
        <div>
          <label htmlFor={dateId} className="isalwa-section-label">
            {ISSUE_COPY.dateLabel}
          </label>
          <input id={dateId} type="text" value={now} readOnly className={readonlyClass} />
        </div>

        {/* Feedback */}
        {state && !state.ok ? (
          <FormFeedback error={state.error} />
        ) : null}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <CommandSubmitButton
            label={ISSUE_COPY.submitLabel}
            pendingLabel={ISSUE_COPY.submitPending}
          />
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </ContextDrawer>
  );
}
