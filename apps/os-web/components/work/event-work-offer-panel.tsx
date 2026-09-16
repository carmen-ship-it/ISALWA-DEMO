'use client';

import Link from 'next/link';
import { Button } from '@isalwa/ui';
import {
  EVENT_WORK_OFFER_COPY,
  type EventWorkOffer,
} from '@/lib/work/event-work-offer';
import { partyHref } from '@/lib/party/navigation';

type EventWorkOfferPanelProps = {
  offer: EventWorkOffer;
  /** When party is known, link to cliente follow-up. Otherwise /trabajo. */
  followUpHref?: string;
};

/**
 * Surfaces an optional WorkItem create path after a business event.
 * Does not create work. Does not invent dueAt.
 */
export function EventWorkOfferPanel({ offer, followUpHref }: EventWorkOfferPanelProps) {
  const href =
    followUpHref ??
    (offer.partyId ? `${partyHref(offer.partyId)}#seguimiento` : '/trabajo');

  return (
    <div
      className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white p-4"
      aria-label={offer.contextLabel}
    >
      <p className="font-medium text-[var(--isalwa-kiln)]">{offer.contextLabel}</p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        {EVENT_WORK_OFFER_COPY.dueRequired} {EVENT_WORK_OFFER_COPY.noAutoSla}
      </p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        {EVENT_WORK_OFFER_COPY.reminderInProduct}
      </p>
      <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">
        Sugerido: <span className="font-medium">{offer.suggestedTitle}</span>
      </p>
      <Link href={href} className="mt-3 inline-flex">
        <Button type="button" variant="secondary" size="sm">
          {offer.contextLabel}
        </Button>
      </Link>
    </div>
  );
}
