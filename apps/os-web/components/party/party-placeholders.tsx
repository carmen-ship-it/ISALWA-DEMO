import Link from 'next/link';
import { EmptyState } from '@isalwa/ui';

type PartyEmptySearchProps = {
  hasQuery: boolean;
  addCustomerHref?: string;
};

function addCustomerLink(href: string) {
  return (
    <Link href={href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
      Agregar cliente
    </Link>
  );
}

export function PartyEmptySearch({ hasQuery, addCustomerHref }: PartyEmptySearchProps) {
  if (hasQuery) {
    return (
      <EmptyState
        title="Sin resultados"
        description="Ningún cliente coincide con esa búsqueda. Pruebe otro nombre o razón social, o quite los filtros."
        action={addCustomerHref ? addCustomerLink(addCustomerHref) : undefined}
      />
    );
  }

  return (
    <EmptyState
      title="No hay clientes registrados"
      description={
        addCustomerHref
          ? 'Busque por nombre o razón social cuando existan registros. Si aún no hay ninguno, puede agregar el primero.'
          : 'Busque por nombre o razón social cuando existan registros.'
      }
      action={addCustomerHref ? addCustomerLink(addCustomerHref) : undefined}
    />
  );
}
