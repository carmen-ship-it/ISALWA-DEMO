'use client';

import { useMemo, useState } from 'react';
import { SearchField } from '@isalwa/ui';
import { IssueList } from '@/components/issue/issue-list';
import { ListToolbar } from '@/components/lists/list-toolbar';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { memberLabel, type MemberLabelMap } from '@/lib/work/member-resolver';
import type { IssueListReturn } from '@/lib/issue/journal-page';
import type { IssueListItem } from '@/lib/issue/types';

type IncidenciasDeskPanelProps = {
  items: IssueListItem[];
  memberLabels: MemberLabelMap;
  listReturn?: IssueListReturn;
};

function searchableText(item: IssueListItem, memberLabels: MemberLabelMap): string {
  const title = item.title?.trim() ? presentHumanCopy(item.title) : '';
  const description = item.description?.trim() ? presentHumanCopy(item.description) : '';
  const owner = item.ownerMemberId ? memberLabel(memberLabels, item.ownerMemberId) : '';
  const reporter = memberLabel(memberLabels, item.reporterMemberId);
  const refs = item.references.map((ref) => `${ref.label ?? ''} ${ref.referenceType}`).join(' ');
  return [title, description, owner, reporter, refs].join(' ').toLowerCase();
}

export function IncidenciasDeskPanel({ items, memberLabels, listReturn }: IncidenciasDeskPanelProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => searchableText(item, memberLabels).includes(q));
  }, [items, memberLabels, query]);

  return (
    <div className="min-w-0">
      <ListToolbar
        className="mb-3"
        search={
          <SearchField
            id="incidencias-buscar"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Título, descripción o persona"
            aria-label="Buscar en incidencias cargadas"
            autoComplete="off"
          />
        }
      />
      <IssueList items={filtered} memberLabels={memberLabels} showHeader density="compact" listReturn={listReturn} />
      {filtered.length === 0 && items.length > 0 ? (
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
          Ninguna incidencia coincide con la búsqueda en esta vista.
        </p>
      ) : null}
    </div>
  );
}
