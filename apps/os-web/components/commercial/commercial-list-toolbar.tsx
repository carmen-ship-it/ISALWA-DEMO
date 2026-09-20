import Link from 'next/link';
import { ListSearchForm, ListToolbar } from '@/components/lists/list-toolbar';
import {
  listDensityLabel,
  parseListDensity,
  type ListDensity,
} from '@/lib/productivity/list-controls';
import { listHref, type ListQueryState } from '@/lib/lists/url-state';

export type CommercialListToolbarProps = {
  path: string;
  state: ListQueryState;
  searchLabel: string;
  searchPlaceholder: string;
  hiddenFields?: Record<string, string | undefined>;
  clearSearchHref: string;
};

function withDensity(state: ListQueryState, density: ListDensity): ListQueryState {
  const next: ListQueryState = { ...state, density: density === 'compact' ? undefined : density };
  if (density === 'compact') delete next.density;
  delete next.cursor;
  return next;
}

export function CommercialListToolbar({
  path,
  state,
  searchLabel,
  searchPlaceholder,
  hiddenFields,
  clearSearchHref,
}: CommercialListToolbarProps) {
  const density = parseListDensity(state.density);
  const hasQuery = Boolean(state.q?.trim());
  const densityToggleHref = listHref(
    path,
    withDensity(state, density === 'compact' ? 'comfortable' : 'compact'),
  );

  return (
    <ListToolbar
      search={
        <ListSearchForm
          action={path}
          initialQuery={state.q ?? ''}
          hiddenFields={hiddenFields}
          label={searchLabel}
          placeholder={searchPlaceholder}
          clearHref={hasQuery ? clearSearchHref : undefined}
        />
      }
      density={
        <Link
          href={densityToggleHref}
          className="isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-slate)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          aria-label={`Densidad ${listDensityLabel(density)}. Cambiar.`}
        >
          {listDensityLabel(density)}
        </Link>
      }
    />
  );
}
