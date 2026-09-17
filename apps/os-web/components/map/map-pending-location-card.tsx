import Link from 'next/link';
import { Button } from '@isalwa/ui';
import type { PendingLocationCardCopy } from '@/lib/map/pending-location';

type MapPendingLocationCardProps = {
  copy: PendingLocationCardCopy;
};

/** Non-technical pending location card for map lists / drawer. */
export function MapPendingLocationCard({ copy }: MapPendingLocationCardProps) {
  return (
    <div
      className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-tint-amber-border)] bg-[var(--isalwa-tint-amber)] p-3"
      data-map-pending-location-card={copy.tone}
    >
      <p className="text-sm font-medium text-[var(--isalwa-tint-amber-ink)]">{copy.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--isalwa-kiln)]">{copy.helper}</p>
      <div className="mt-3">
        <Link href={copy.href} className="inline-flex">
          <Button type="button" variant="secondary" size="sm">
            {copy.cta}
          </Button>
        </Link>
      </div>
    </div>
  );
}
