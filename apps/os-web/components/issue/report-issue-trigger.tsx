'use client';

import { useState } from 'react';
import { Button } from '@isalwa/ui';
import { ReportIssueDrawer } from './report-issue-drawer';
import { ISSUE_COPY } from '@/lib/issue/labels';
import type { ReportIssueContext } from '@/lib/issue/types';

type ReportIssueTriggerProps = {
  context?: ReportIssueContext | null;
  reportedByLabel?: string;
  variant?: 'primary' | 'secondary';
  className?: string;
};

/**
 * Button that opens the Report Issue drawer.
 * Can be placed in Cliente360, product pages, or anywhere a contextual report is needed.
 */
export function ReportIssueTrigger({
  context,
  reportedByLabel,
  variant = 'secondary',
  className,
}: ReportIssueTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {ISSUE_COPY.reportAction}
      </Button>
      <ReportIssueDrawer
        open={open}
        onOpenChange={setOpen}
        context={context}
        reportedByLabel={reportedByLabel}
      />
    </>
  );
}
