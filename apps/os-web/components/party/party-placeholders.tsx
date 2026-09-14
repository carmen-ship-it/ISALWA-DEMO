import Link from 'next/link';
import { EmptyState } from '@isalwa/ui';

type FutureSectionPlaceholderProps = {
  title: string;
  description: string;
};

/** Honest locked placeholder for Cliente 360 sections without read contracts yet. */
export function FutureSectionPlaceholder({ title, description }: FutureSectionPlaceholderProps) {
  return (
    <div className="rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_65%,white)] p-5">
      <p className="isalwa-section-label">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{description}</p>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--isalwa-copper)]">
        Próximamente
      </p>
    </div>
  );
}

type PartyEmptySearchProps = {
  hasQuery: boolean;
  addCustomerHref?: string;
};

export function PartyEmptySearch({ hasQuery, addCustomerHref }: PartyEmptySearchProps) {
  if (hasQuery) {
    return (
      <EmptyState
        title="Sin resultados"
        description="No encontramos empresas o contactos con esos criterios. Pruebe otro término o quite filtros."
        action={
          addCustomerHref ? (
            <Link href={addCustomerHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
              Agregar cliente
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      title="No hay clientes registrados todavía"
      description="Cuando se registren empresas o contactos en el sistema, aparecerán aquí."
      example="Una empresa puede ser cliente y proveedor al mismo tiempo — verá una sola ficha con varias relaciones."
      action={
        addCustomerHref ? (
          <Link href={addCustomerHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
            Agregar cliente
          </Link>
        ) : undefined
      }
    />
  );
}
