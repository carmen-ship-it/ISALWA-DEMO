'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@isalwa/ui';
import { t } from '@/lib/i18n/es';

/**
 * A section whose data could not be loaded. Never rendered as an empty list or a zero
 * metric: it states the failure and offers a re-read of the same page (no mutation).
 */
export function SectionLoadFailed({
  className,
  message,
}: {
  className?: string;
  message?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className={className} role="alert" data-section-state="load-failed">
      <p className="text-[var(--isalwa-text-base)] text-[var(--isalwa-kiln)]">
        {message ?? t('pages.inicio.attentionUnavailable')}
      </p>
      <Button
        type="button"
        variant="secondary"
        className="mt-2"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        {t('pages.inicio.retry')}
      </Button>
    </div>
  );
}
