import Link from 'next/link';
import { Button, EmptyPanel, ListRow, SearchField, SectionHeader, StatusPill } from '@isalwa/ui';
import { partyStatusTone } from '@/lib/party/labels';
import {
  MASTER_DATA_TERM_PARAM,
  masterDataLookupHref,
  type MasterDataLookup,
} from '@/lib/party/master-data-lookup';

type MasterDataLookupPanelProps = {
  lookup: MasterDataLookup | null;
  /** Path the GET form and result links return to, e.g. `/clientes`. */
  path: string;
};

/** Data-steward lookup: identity and NIT only; no owner, phone, contacts or commercial actions. */
export function MasterDataLookupPanel({ lookup, path }: MasterDataLookupPanelProps) {
  if (!lookup) return null;

  return (
    <section
      className="mt-6 space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4"
      aria-label="Consulta de datos maestros"
    >
      <SectionHeader kicker="Datos maestros" title="Consultar identidad de un cliente" />
      <p className="text-xs text-[var(--isalwa-slate)]">
        Muestra nombre, razón social, NIT y estado. No muestra responsable, teléfonos ni contactos, y
        no da acceso a oportunidades, cotizaciones ni pedidos.
      </p>
      <form method="get" action={path} className="flex flex-wrap items-end gap-2">
        <label htmlFor="master-data-term" className="sr-only">
          Nombre, razón social o NIT
        </label>
        <SearchField
          id="master-data-term"
          name={MASTER_DATA_TERM_PARAM}
          defaultValue={lookup.term}
          placeholder="Nombre, razón social o NIT"
          minLength={2}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" size="sm">
          Consultar
        </Button>
      </form>

      {lookup.searchedBy && lookup.rows.length === 0 ? (
        <EmptyPanel
          compact
          title="Sin coincidencias"
          description={lookup.searchedBy === 'nit' ? 'Ningún cliente activo tiene ese NIT.' : 'Ningún cliente coincide con ese nombre.'}
        />
      ) : null}

      {lookup.rows.length > 0 ? (
        <ul className="m-0 list-none rounded-[var(--isalwa-radius-control)] bg-white p-0" aria-label="Resultados de datos maestros">
          {lookup.rows.map((row) => (
            <ListRow key={row.partyId} as="li">
              <div className="min-w-0">
                <Link
                  href={masterDataLookupHref(path, lookup.term, row.partyId)}
                  className="font-medium text-[var(--isalwa-kiln)] hover:underline"
                >
                  {row.name}
                </Link>
                <p className="text-xs text-[var(--isalwa-slate)]">
                  {[row.legalName, row.relation, row.merged ? 'Fusionado con otro registro' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <StatusPill tone={partyStatusTone(row.rawStatus)}>{row.status}</StatusPill>
            </ListRow>
          ))}
        </ul>
      ) : null}

      {lookup.selectedMissing ? (
        <EmptyPanel compact title="Registro no encontrado" description="El cliente no existe en esta empresa." />
      ) : null}

      {lookup.selected ? (
        <div className="space-y-1 rounded-[var(--isalwa-radius-control)] bg-white p-3 text-sm" data-master-data="selected">
          <p className="font-medium text-[var(--isalwa-kiln)]">{lookup.selected.name}</p>
          {lookup.selected.legalName ? (
            <p className="text-[var(--isalwa-slate)]">Razón social: {lookup.selected.legalName}</p>
          ) : null}
          <p className="text-[var(--isalwa-slate)]">
            {lookup.selected.relation} · {lookup.selected.status}
          </p>
          {lookup.selected.fiscalIdentities.length > 0 ? (
            <ul className="m-0 list-none p-0 text-[var(--isalwa-slate)]">
              {lookup.selected.fiscalIdentities.map((fiscal) => (
                <li key={`${fiscal.nit}-${fiscal.effectiveAt}`}>
                  NIT {fiscal.nit}
                  {fiscal.razonSocial ? ` · ${fiscal.razonSocial}` : ''}
                  {fiscal.endedAt ? ' · ya no vigente' : ' · vigente'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--isalwa-slate)]">Sin NIT registrado.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
