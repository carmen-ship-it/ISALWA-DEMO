import Link from 'next/link';
import {
  FilterPopover,
  ListSearchForm,
  ListToolbar,
  type FilterPopoverSection,
} from '@/components/lists/list-toolbar';
import {
  clearListControls,
  countActiveListControls,
  listDensityLabel,
  listFocusLabel,
  listSortLabel,
  type ActiveListControls,
  type ListDensity,
  type ListFocus,
  type ListSort,
} from '@/lib/productivity/list-controls';
import { listHref, type ListQueryState } from '@/lib/lists/url-state';

type TrabajoListToolbarProps = {
  path?: string;
  state: ListQueryState;
  controls: ActiveListControls;
};

function withControls(
  state: ListQueryState,
  patch: Partial<{
    q: string | undefined;
    sort: ListSort | undefined;
    density: ListDensity | undefined;
    focus: ListFocus | undefined;
  }>,
): ListQueryState {
  const next: ListQueryState = { ...state };
  if ('q' in patch) {
    if (patch.q) next.q = patch.q;
    else delete next.q;
  }
  if ('sort' in patch) {
    if (patch.sort && patch.sort !== 'due') next.sort = patch.sort;
    else delete next.sort;
  }
  if ('density' in patch) {
    if (patch.density && patch.density !== 'compact') next.density = patch.density;
    else delete next.density;
  }
  if ('focus' in patch) {
    if (patch.focus) next.focus = patch.focus;
    else delete next.focus;
  }
  delete next.cursor;
  return next;
}

export function TrabajoListToolbar({ path = '/trabajo', state, controls }: TrabajoListToolbarProps) {
  const activeCount = countActiveListControls(controls);
  const clearHref = listHref(path, clearListControls(state));
  const hiddenFields: Record<string, string | undefined> = {
    view: state.view,
    subjectType: state.subjectType,
    subjectId: state.subjectId,
    sort: controls.sort === 'due' ? undefined : controls.sort,
    density: controls.density === 'compact' ? undefined : controls.density,
    focus: controls.focus,
  };

  const sections: FilterPopoverSection[] = [
    {
      id: 'sort',
      title: 'Orden',
      options: (['due', 'priority', 'title'] as const).map((sort) => ({
        id: sort,
        label: listSortLabel(sort),
        href: listHref(path, withControls(state, { sort })),
        active: controls.sort === sort,
      })),
    },
    {
      id: 'focus',
      title: 'Enfoque',
      options: [
        {
          id: 'all',
          label: 'Todos en esta vista',
          href: listHref(path, withControls(state, { focus: undefined })),
          active: !controls.focus,
        },
        {
          id: 'approval',
          label: listFocusLabel('approval'),
          href: listHref(path, withControls(state, { focus: 'approval' })),
          active: controls.focus === 'approval',
        },
      ],
    },
    {
      id: 'density',
      title: 'Densidad',
      options: (['compact', 'comfortable'] as const).map((density) => ({
        id: density,
        label: listDensityLabel(density),
        href: listHref(path, withControls(state, { density })),
        active: controls.density === density,
      })),
    },
  ];

  const densityToggleHref = listHref(
    path,
    withControls(state, {
      density: controls.density === 'compact' ? 'comfortable' : 'compact',
    }),
  );

  return (
    <ListToolbar
      search={
        <ListSearchForm
          action={path}
          initialQuery={controls.q ?? ''}
          hiddenFields={hiddenFields}
          label="Buscar trabajo"
          placeholder="Asunto o descripción"
          clearHref={controls.q ? listHref(path, withControls(state, { q: undefined })) : undefined}
        />
      }
      filters={
        <FilterPopover
          activeCount={activeCount}
          clearHref={clearHref}
          sections={sections}
        />
      }
      density={
        <Link
          href={densityToggleHref}
          className="isalwa-t-fast inline-flex h-9 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 text-sm font-medium text-[var(--isalwa-slate)] outline-none hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          aria-label={`Densidad ${listDensityLabel(controls.density)}. Cambiar.`}
        >
          {listDensityLabel(controls.density)}
        </Link>
      }
    />
  );
}
