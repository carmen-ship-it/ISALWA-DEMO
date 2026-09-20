import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../lib/cx';
import { Button } from './button';
import { Chip, SearchField } from './data';

export type ListToolbarDensity = 'comfortable' | 'compact';

export type ListToolbarActiveFilter = {
  id: string;
  label: string;
  onRemove: () => void;
};

export type ListToolbarProps = HTMLAttributes<HTMLDivElement> & {
  /** Custom search region — overrides controlled search fields when set. */
  search?: ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  sort?: ReactNode;
  /** Custom density control, or pass `listDensity` + `onListDensityChange` for the built-in toggle. */
  density?: ReactNode;
  listDensity?: ListToolbarDensity;
  onListDensityChange?: (density: ListToolbarDensity) => void;
  period?: ReactNode;
  activeFilters?: ListToolbarActiveFilter[];
  onClearFilters?: () => void;
  /** Right-side actions (alias: `children`). */
  actions?: ReactNode;
  children?: ReactNode;
};

function DensityToggle({
  value,
  onChange,
}: {
  value: ListToolbarDensity;
  onChange: (density: ListToolbarDensity) => void;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Densidad de lista">
      <Chip
        active={value === 'comfortable'}
        onClick={() => onChange('comfortable')}
        className="h-8 px-3 text-[var(--isalwa-text-xs)]"
      >
        Cómoda
      </Chip>
      <Chip
        active={value === 'compact'}
        onClick={() => onChange('compact')}
        className="h-8 px-3 text-[var(--isalwa-text-xs)]"
      >
        Compacta
      </Chip>
    </div>
  );
}

export function ListToolbar({
  search,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Buscar',
  filters,
  sort,
  density,
  listDensity,
  onListDensityChange,
  period,
  activeFilters,
  onClearFilters,
  actions,
  children,
  className,
  ...rest
}: ListToolbarProps) {
  const rightActions = actions ?? children;
  const hasActiveFilters = Boolean(activeFilters?.length);
  const densityControl =
    density ??
    (listDensity && onListDensityChange ? (
      <DensityToggle value={listDensity} onChange={onListDensityChange} />
    ) : null);

  const searchRegion =
    search ??
    (onSearchChange ? (
      <SearchField
        value={searchValue ?? ''}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="max-w-md"
      />
    ) : null);

  return (
    <div
      className={cx(
        'rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-3 shadow-[var(--isalwa-shadow-soft)]',
        className,
      )}
      {...rest}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">{searchRegion}</div>
        <div className="flex flex-wrap items-center gap-2">
          {period ? (
            <div className="flex items-center gap-2" aria-label="Período">
              {period}
            </div>
          ) : null}
          {sort ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                Ordenar
              </span>
              {sort}
            </div>
          ) : null}
          {filters ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                Filtros
              </span>
              {filters}
            </div>
          ) : null}
          {densityControl}
          {rightActions}
        </div>
      </div>

      {hasActiveFilters || onClearFilters ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--isalwa-mist)] pt-3">
          {activeFilters?.map((filter) => (
            <Chip
              key={filter.id}
              active
              onClick={filter.onRemove}
              className="h-7 gap-1.5 px-2.5 text-[var(--isalwa-text-xs)]"
              aria-label={`Quitar filtro ${filter.label}`}
            >
              <span>{filter.label}</span>
              <span aria-hidden className="text-[var(--isalwa-slate)]">
                ×
              </span>
            </Chip>
          ))}
          {hasActiveFilters && onClearFilters ? (
            <Button variant="tertiary" size="sm" type="button" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
