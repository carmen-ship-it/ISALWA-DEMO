'use client';

import { useActionState, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button, PageContainer, PageSection } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { PageHeader } from '@/components/shell/page-header';
import { reportIssueAction, type ReportIssueActionResult } from '@/lib/issue/actions';
import { parseReportIssueContext } from '@/lib/issue/report-context';
import { ISSUE_COPY, formatReferenceType } from '@/lib/issue/labels';
import { issueHref, issueListHref } from '@/lib/issue/navigation';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

const readonlyClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-3 py-2 text-[var(--isalwa-slate)]';

export default function ReportarIncidenciaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const descriptionId = useId();
  const contextId = useId();
  const dateId = useId();
  const [formKey, setFormKey] = useState(0);

  // Parse context from URL query params
  const rawParams = Object.fromEntries(searchParams.entries());
  const context = parseReportIssueContext(rawParams);

  const [state, formAction] = useActionState(
    async (
      _prev: ReportIssueActionResult | null,
      formData: FormData,
    ): Promise<ReportIssueActionResult | null> => {
      const result = await reportIssueAction(formData);
      if (result.ok) {
        setFormKey((k) => k + 1);
        router.push(issueHref(result.issueId));
        router.refresh();
      }
      return result;
    },
    null,
  );

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
    <PageContainer label={ISSUE_COPY.reportTitle}>
      <PageHeader
        kicker={ISSUE_COPY.listKicker}
        title={ISSUE_COPY.reportTitle}
        action={
          <Link href={issueListHref()}>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </Link>
        }
      />

      <PageSection card className="max-w-xl p-6 md:p-8">
        <form key={formKey} action={formAction} className="space-y-5">
          {/* Hidden fields for context */}
          {context?.referenceType ? (
            <input type="hidden" name="referenceType" value={context.referenceType} />
          ) : null}
          {context?.referenceId ? (
            <input type="hidden" name="referenceId" value={context.referenceId} />
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
              rows={5}
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
            <Link href={issueListHref()}>
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      </PageSection>
    </PageContainer>
  );
}
