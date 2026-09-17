import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import Link from 'next/link';
import { EmptyState } from '@isalwa/ui';
import { PartyTimelineList } from '@/components/commercial/party-timeline-list';
import { ScaledListReveal } from '@/components/ui/scaled-list-reveal';
import { presentBusinessEventLabel } from '@/lib/audit/present';
import { auditoriaHref } from '@/lib/audit/url-state';
import {
  conversationIdFromFacts,
  conversationProvenanceView,
  provenanceKindFromEventType,
} from '@/lib/conversations/conversation-provenance';
import { LIST_SCALE_PREVIEW_LARGE } from '@/lib/ui/list-scaling';

type Cliente360HistorialProps = {
  partyId: string;
  items: PartyTimelineEntryReadModel[];
  memberLabels?: Map<string, string>;
};

function isConversationOriginEvent(eventType: string): boolean {
  return (
    eventType.includes('from_conversation') || eventType === 'conversation.recorded'
  );
}

/**
 * Cliente360 Historial — BusinessEvent timeline plus audit/provenance coherence affordances.
 * Does not own Documentos (PF-4).
 */
export function Cliente360Historial({
  partyId,
  items,
  memberLabels,
}: Cliente360HistorialProps) {
  const auditHref = auditoriaHref('/auditoria', {
    resourceType: 'party',
    resourceId: partyId,
  });

  const originEntries = items.filter((entry) => isConversationOriginEvent(entry.eventType));

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--isalwa-slate)]">
        <Link
          href={auditHref}
          className="font-medium text-[var(--isalwa-glaze)] hover:underline"
        >
          Ver en Auditoría
        </Link>
        {' '}
        los cambios vinculados a este cliente.
      </p>

      {originEntries.length > 0 ? (
        <ul
          className="space-y-3 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4"
          aria-label="Origen desde conversación"
        >
          {originEntries.map((entry) => {
            const facts = (entry.facts ?? {}) as Record<string, unknown>;
            const conversationId = conversationIdFromFacts(facts);
            const kind = provenanceKindFromEventType(entry.eventType);
            const provenance = conversationProvenanceView(
              conversationId ? { conversationId, kind } : null,
            );
            return (
              <li key={`origin-${entry.entryId}`} data-historial-origin="conversation">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {presentBusinessEventLabel(entry.eventType)}
                </p>
                {provenance ? (
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {provenance.origenLabel}
                    {' · '}
                    <Link
                      href={provenance.href}
                      className="font-medium text-[var(--isalwa-glaze)] hover:underline"
                    >
                      {provenance.verLabel}
                    </Link>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    Origen: Conversación (sin enlace durable todavía)
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      <ScaledListReveal
        total={items.length}
        previewCount={LIST_SCALE_PREVIEW_LARGE}
        empty={
          <EmptyState
            title="Sin actividad comercial todavía"
            description="La actividad comercial y del cliente aparecerá aquí cuando exista."
          />
        }
        preview={
          <PartyTimelineList
            items={items.slice(0, LIST_SCALE_PREVIEW_LARGE)}
            memberLabels={memberLabels}
          />
        }
        full={<PartyTimelineList items={items} memberLabels={memberLabels} />}
      />
    </div>
  );
}
