'use client';

import { useMemo, useState } from 'react';
import { SearchField, SectionHeader } from '@isalwa/ui';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { ListToolbar } from '@/components/lists/list-toolbar';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { bucketCompromisosDesk } from '@/lib/commitments/desk-buckets';
import { partyLabel, type PartyLabelMap } from '@/lib/commercial/party-resolver';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import { deskPanelClass } from '@/lib/ui/visual-status';

type CompromisosDeskPanelProps = {
  items: CommitmentSummary[];
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
};

function matchesQuery(
  item: CommitmentSummary,
  q: string,
  memberLabels: MemberLabelMap,
  partyLabels: PartyLabelMap,
): boolean {
  const haystack = [
    item.text ?? '',
    item.partyId ? partyLabel(partyLabels, item.partyId) : '',
    item.ownerMemberId ? memberLabel(memberLabels, item.ownerMemberId) : '',
    item.createdByMemberId ? memberLabel(memberLabels, item.createdByMemberId) : '',
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

type BucketProps = {
  kicker: string;
  title: string;
  items: CommitmentSummary[];
  memberLabels: MemberLabelMap;
  emptyTitle: string;
  emptyDescription: string;
};

function CommitmentBucket({ kicker, title, items, memberLabels, emptyTitle, emptyDescription, accent }: BucketProps & { accent?: string }) {
  return (
    <section className={`mb-4 ${deskPanelClass} border-l-4 p-4 md:p-5 ${accent ?? 'border-l-[var(--isalwa-mist)]'}`}>
      <SectionHeader
        kicker={kicker}
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
            {title}
          </h2>
        }
      />
      <div className="mt-3">
        <CommitmentList
          items={items}
          memberLabels={memberLabels}
          showOrigin
          scale
          hideHeader
          emptyTitle={emptyTitle}
          emptyDescription={emptyDescription}
        />
      </div>
    </section>
  );
}

export function CompromisosDeskPanel({ items, memberLabels, partyLabels }: CompromisosDeskPanelProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!q) return items;
    return items.filter((item) => matchesQuery(item, q, memberLabels, partyLabels));
  }, [items, memberLabels, partyLabels, q]);

  const buckets = useMemo(() => bucketCompromisosDesk(filteredItems), [filteredItems]);

  return (
    <div className="min-w-0">
      <ListToolbar
        className="mb-4"
        search={
          <SearchField
            id="compromisos-buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Texto, cliente o responsable"
            aria-label="Buscar en compromisos cargados"
            autoComplete="off"
          />
        }
      />
      {filteredItems.length === 0 && items.length > 0 ? (
        <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
          Ningún compromiso coincide con la búsqueda.
        </p>
      ) : null}
      <CommitmentBucket
        kicker="Próximos"
        title="Vence pronto"
        accent="border-l-[var(--isalwa-status-amber-2)]"
        items={buckets.dueSoon}
        memberLabels={memberLabels}
        emptyTitle="Sin compromisos próximos"
        emptyDescription="No hay compromisos abiertos con vencimiento cercano."
      />
      <CommitmentBucket
        kicker="Equipo"
        title="Compromisos de equipo"
        accent="border-l-[var(--isalwa-sky)]"
        items={buckets.team}
        memberLabels={memberLabels}
        emptyTitle="Sin compromisos internos"
        emptyDescription="Los compromisos sin cliente vinculado aparecen aquí."
      />
      <CommitmentBucket
        kicker="Historial"
        title="Cumplidos"
        accent="border-l-[var(--isalwa-success)]"
        items={buckets.completed}
        memberLabels={memberLabels}
        emptyTitle="Sin compromisos cumplidos"
        emptyDescription="Cuando se marquen como cumplidos, aparecerán aquí."
      />
    </div>
  );
}
