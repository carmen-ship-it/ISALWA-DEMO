import { locationHasCoordinates, selectLocationProvenanceUrl } from '@isalwa/os-contracts';
import { FeedbackNote } from '@isalwa/ui';
import type { OsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { newOpportunityHref } from '@/lib/commercial/navigation';
import { loadCliente360 } from '@/lib/cliente/load-cliente-360';
import { QuickViewHost } from '@/components/operating/quick-view-host';
import { Cliente360Now } from '@/components/party/cliente-360-now';
import { PartyStatusBadge } from '@/components/party/party-role-badges';
import type { ListQueryState } from '@/lib/lists/url-state';
import {
  formatCoordinates,
  provenanceHref,
  provenanceLinkLabel,
  sortLocationsForDisplay,
} from '@/lib/party/customer-self-service';
import { formatPartyKind } from '@/lib/party/labels';
import { composeCliente360FromLoaded, type Cliente360Composition } from '@/lib/party/next-action';
import { partyHref } from '@/lib/party/navigation';
import type { PartyDetailResponse } from '@/lib/party/types';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { memberLabel } from '@/lib/work/member-resolver';

const MAPS_ACTION_LABEL = 'Abrir origen en Maps';

const actionClass =
  'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CustomerQuickViewProps = {
  client: OsApiClient;
  partyId: string;
  listPath: string;
  listQuery: ListQueryState;
};

type PanelLocation = {
  status: string;
  latitude: number | null;
  longitude: number | null;
  provenanceUrl: string | null;
};

export type PanelLocationFacts = {
  /** Formatted latitude/longitude. Never a Maps or provenance URL. */
  coordinates: string | null;
  /** Stored source link. A Maps URL is provenance, not a location. */
  provenance: { href: string; label: string } | null;
};

/**
 * Split already-loaded locations for one open panel.
 * Coordinates and provenance are independent: a shared Maps link does not count as a location.
 */
export function panelLocationFacts(locations: readonly PanelLocation[]): PanelLocationFacts {
  const withCoordinates = sortLocationsForDisplay(locations).find((location) =>
    locationHasCoordinates(location),
  );
  const coordinates = withCoordinates
    ? (formatCoordinates(withCoordinates.latitude, withCoordinates.longitude) ??
      'Ubicación disponible')
    : null;
  const href = provenanceHref(selectLocationProvenanceUrl(locations));
  return {
    coordinates,
    provenance: href ? { href, label: provenanceLinkLabel(href) } : null,
  };
}

export function existingMapsAction(
  locations: ReadonlyArray<{ provenanceUrl: string | null; status: string }>,
): { href: string; label: string } | null {
  for (const location of sortLocationsForDisplay(locations)) {
    const href = provenanceHref(location.provenanceUrl);
    if (!href) continue;
    const label = provenanceLinkLabel(href);
    if (label !== MAPS_ACTION_LABEL) continue;
    return { href, label };
  }
  return null;
}

function quickViewErrorCopy(err: unknown): { title: string; detail: string } {
  if (err instanceof OsApiError && err.kind === 'not_found') {
    return {
      title: 'Cliente no disponible',
      detail: 'No se encontró este cliente o no está disponible.',
    };
  }
  if (err instanceof OsApiError && err.kind === 'forbidden') {
    return {
      title: 'No se puede mostrar',
      detail: 'No tiene acceso a este cliente.',
    };
  }
  return {
    title: 'No se pudo abrir la vista rápida',
    detail: 'Puede cerrar esta vista e intentarlo de nuevo.',
  };
}

export async function CustomerQuickView({
  client,
  partyId,
  listPath,
  listQuery,
}: CustomerQuickViewProps) {
  try {
    const data = await loadCliente360(client, partyId);
    const { detail } = data;
    const ownerMemberId = detail.commercialAccount?.ownerMemberId?.trim() || null;
    const ownerLabel = ownerMemberId ? memberLabel(data.memberLabels, ownerMemberId) : null;
    const displayName = detail.party.displayName || detail.party.legalName || 'Sin nombre';
    const composition = composeCliente360FromLoaded({
      partyId,
      detail,
      displayName,
      ownerLabel,
      canReassignOwner: detail.commercialAuthority?.canReassignOwner === true,
      locations: data.locations,
      relatedWork: data.relatedWork,
      timeline: data.timeline,
      opportunities: data.opportunities,
      quotes: data.quotes,
      orders: data.orders,
      staleProjection: data.staleFreshness,
    });

    return (
      <QuickViewHost open title={displayName} listPath={listPath} listQuery={listQuery}>
        <CustomerQuickViewBody
          detail={detail}
          displayName={displayName}
          composition={composition}
          partyId={partyId}
        />
      </QuickViewHost>
    );
  } catch (err) {
    const copy = quickViewErrorCopy(err);
    return (
      <QuickViewHost open title="Vista rápida" listPath={listPath} listQuery={listQuery}>
        <FeedbackNote tone="error" title={copy.title} detail={copy.detail} />
      </QuickViewHost>
    );
  }
}

function CustomerQuickViewBody({
  detail,
  displayName,
  composition,
  partyId,
}: {
  detail: PartyDetailResponse;
  displayName: string;
  composition: Cliente360Composition;
  partyId: string;
}) {
  const { party } = detail;
  const legalName = party.legalName && party.legalName !== displayName ? party.legalName : null;
  const followUpHref = `${partyHref(partyId)}#trabajo`;

  return (
    <div className="space-y-4">
      <dl className="space-y-3 text-sm">
        {legalName ? (
          <div>
            <dt className="text-xs text-[var(--isalwa-slate)]">Razón social</dt>
            <dd className="mt-0.5 break-words text-[var(--isalwa-kiln)]">{legalName}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Tipo</dt>
          <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{formatPartyKind(party.partyKind)}</dd>
        </div>
        <div>
          <dt className="text-xs text-[var(--isalwa-slate)]">Estado</dt>
          <dd className="mt-1">
            <PartyStatusBadge status={party.status} />
          </dd>
        </div>
      </dl>

      <Cliente360Now composition={composition} compact />

      <nav aria-label="Acciones del cliente" className="flex flex-col items-start gap-2 border-t border-[var(--isalwa-mist)] pt-4">
        <a href={partyHref(partyId)} className={actionClass}>
          Abrir Cliente 360
        </a>
        <a href={newOpportunityHref(partyId)} className={actionClass}>
          Nueva oportunidad
        </a>
        <a href={followUpHref} className={actionClass}>
          {FOLLOW_UP_COPY.action}
        </a>
      </nav>
    </div>
  );
}
