import Link from 'next/link';
import {
  conversationProvenanceView,
  type ConversationProvenanceRef,
} from '@/lib/conversations/conversation-provenance';

type Props = {
  origin: ConversationProvenanceRef | null | undefined;
  className?: string;
};

/** Compact Origen: Conversación + Ver conversación deep link. */
export function ConversationOriginLine({ origin, className }: Props) {
  const view = conversationProvenanceView(origin);
  if (!view) return null;
  return (
    <div className={className} data-conversation-origin="yes">
      <p className="text-sm text-[var(--isalwa-kiln)]">{view.origenLabel}</p>
      {view.partyLabel ? (
        <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">Cliente: {view.partyLabel}</p>
      ) : null}
      {view.contactLabel ? (
        <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">Contacto: {view.contactLabel}</p>
      ) : null}
      {view.occurredAt ? (
        <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">{view.occurredAt}</p>
      ) : null}
      <Link href={view.href} className="mt-2 inline-block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
        {view.verLabel}
      </Link>
    </div>
  );
}
