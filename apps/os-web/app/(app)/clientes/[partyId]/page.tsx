import Link from 'next/link';
import { ListRow, PageContainer, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { Cliente360Nav } from '@/components/cliente/cliente-360-nav';
import { CommercialSectionState } from '@/components/commercial/commercial-section-state';
import { OpportunityList } from '@/components/commercial/opportunity-list';
import { OrderList } from '@/components/commercial/order-list';
import { PartyTimelineList } from '@/components/commercial/party-timeline-list';
import { QuoteList } from '@/components/commercial/quote-list';
import { CommercialOwnerLine } from '@/components/party/commercial-owner-line';
import { CustomerEditForms } from '@/components/party/customer-edit-forms';
import { CustomerLocationPanel } from '@/components/party/customer-location-panel';
import { PageHeader } from '@/components/shell/page-header';
import {
  CommercialBadge,
  PartyRoleBadges,
  PartyStatusBadge,
} from '@/components/party/party-role-badges';
import { FutureSectionPlaceholder } from '@/components/party/party-placeholders';
import { WorkList } from '@/components/work/work-list';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { CLIENTE_360_REQUEST_COUNT, loadCliente360 } from '@/lib/cliente/load-cliente-360';
import { newOpportunityHref } from '@/lib/commercial/navigation';
import { AccessDeniedState, ServiceUnavailableState } from '@/components/states/app-states';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import {
  canManageContacts,
  canMutateActiveParty,
  commercialOwnerView,
} from '@/lib/party/customer-self-service';
import { memberLabel } from '@/lib/work/member-resolver';
import {
  contactDisplayName,
  formatPartyKind,
  multiRoleHint,
} from '@/lib/party/labels';
import { partyHref, trabajoForPartyHref } from '@/lib/party/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';

type PartyDetailPageProps = {
  params: Promise<{ partyId: string }>;
};

function activeRoleKeys(detail: Awaited<ReturnType<typeof loadCliente360>>['detail']): string[] {
  return detail.roles.map((role) => role.roleKey);
}

export default async function PartyDetailPage({ params }: PartyDetailPageProps) {
  const { partyId } = await params;
  const auth = await getServerOsAuthContext();
  if (!auth) return null;

  const client = createOsApiClient(auth);

  try {
    const data = await loadCliente360(client, partyId);
    const { detail, opportunities, quotes, orders, timeline, relatedWork, locations, memberLabels } = data;
    const roleKeys = activeRoleKeys(detail);
    const roleHint = multiRoleHint(roleKeys);
    const { party, contacts, commercialAccount } = detail;
    const displayName = party.displayName || party.legalName || 'Sin nombre';
    const actorIsMasterDataAdmin = await actorCanMutateMasterData(client);
    const canEditParty = canMutateActiveParty(party.status, actorIsMasterDataAdmin ? ['master_data.admin'] : []);
    const canEditContacts = canManageContacts(
      party.partyKind,
      party.status,
      actorIsMasterDataAdmin ? ['master_data.admin'] : [],
    );
    const canReassignOwner = detail.commercialAuthority?.canReassignOwner === true;
    const ownerMembers = canReassignOwner
      ? (await client.listActiveMemberOptions().catch(() => ({ items: [] }))).items
      : [];
    const owner = commercialOwnerView(
      commercialAccount?.ownerMemberId,
      commercialAccount?.ownerMemberId
        ? memberLabel(memberLabels, commercialAccount.ownerMemberId)
        : null,
      canReassignOwner,
    );

    return (
      <PageContainer label={displayName}>
        <PageHeader
          kicker="Cliente"
          title={displayName}
          description={roleHint ?? undefined}
          action={
            <Link
              href="/clientes"
              className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)]"
            >
              Volver
            </Link>
          }
        />

        {data.staleFreshness ? (
          <div className="mb-6">
            <StaleProjectionBanner stale />
          </div>
        ) : null}

        <Cliente360Nav partyId={partyId} />

        <div className="mt-6 space-y-6">
          <PageSection id="resumen" card className="scroll-mt-24 p-6">
            <SectionHeader title="Resumen" />
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="isalwa-section-label">Nombre</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{party.displayName}</dd>
              </div>
              {party.legalName ? (
                <div>
                  <dt className="isalwa-section-label">Razón social</dt>
                  <dd className="mt-1 text-[var(--isalwa-kiln)]">{party.legalName}</dd>
                </div>
              ) : null}
              <div>
                <dt className="isalwa-section-label">Tipo</dt>
                <dd className="mt-1 text-[var(--isalwa-kiln)]">{formatPartyKind(party.partyKind)}</dd>
              </div>
              <div>
                <dt className="isalwa-section-label">Estado</dt>
                <dd className="mt-1">
                  <PartyStatusBadge status={party.status} />
                </dd>
              </div>
              {party.status === 'merged' && party.mergedIntoPartyId ? (
                <div className="sm:col-span-2">
                  <dt className="isalwa-section-label">Fusión</dt>
                  <dd className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    Este registro fue fusionado.{' '}
                    <Link href={partyHref(party.mergedIntoPartyId)} className="text-[var(--isalwa-glaze)] hover:underline">
                      Ver registro principal
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
            {commercialAccount ? (
              <div className="mt-6 border-t border-[var(--isalwa-mist)] pt-6">
                <p className="isalwa-section-label mb-2">Cuenta comercial</p>
                <CommercialBadge
                  hasCommercialAccount
                  commercialAccountStatus={commercialAccount.status}
                />
                <CommercialOwnerLine
                  owner={owner}
                  partyId={partyId}
                  commercialAccountId={commercialAccount.id}
                  members={ownerMembers}
                />
              </div>
            ) : (
              <div className="mt-6 border-t border-[var(--isalwa-mist)] pt-6">
                <CommercialOwnerLine owner={owner} />
              </div>
            )}
            <CustomerEditForms
              party={party}
              contacts={contacts}
              canEditParty={canEditParty}
              canEditContacts={false}
            />
            <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
              Datos fiscales (NIT, razón social tributaria) no están disponibles en esta vista todavía.
            </p>
          </PageSection>

          <PageSection id="relaciones" card className="scroll-mt-24 p-6">
            <SectionHeader title="Relaciones" />
            <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
              Todas las relaciones comerciales de esta misma empresa.
            </p>
            <PartyRoleBadges roleKeys={roleKeys} />
          </PageSection>

          <PageSection id="contactos" card className="scroll-mt-24 p-6">
            <SectionHeader title="Contactos" />
            {contacts.length === 0 ? (
              <p className="text-sm text-[var(--isalwa-slate)]">No hay contactos registrados.</p>
            ) : (
              <ul className="divide-y divide-[var(--isalwa-mist)]">
                {contacts.map((contact) => (
                  <ListRow key={contact.id} as="li" className="px-1 py-3">
                    <div>
                      <p className="font-medium text-[var(--isalwa-kiln)]">
                        {contactDisplayName(contact.givenName, contact.familyName)}
                      </p>
                      {contact.title ? (
                        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{contact.title}</p>
                      ) : null}
                      <dl className="mt-2 grid gap-1 text-sm text-[var(--isalwa-slate)] sm:grid-cols-2">
                        {contact.email ? (
                          <div>
                            <dt className="sr-only">Correo</dt>
                            <dd>{contact.email}</dd>
                          </div>
                        ) : null}
                        {contact.phone ? (
                          <div>
                            <dt className="sr-only">Teléfono</dt>
                            <dd>{contact.phone}</dd>
                          </div>
                        ) : null}
                        {contact.whatsapp ? (
                          <div>
                            <dt className="sr-only">WhatsApp</dt>
                            <dd>WhatsApp: {contact.whatsapp}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>
                  </ListRow>
                ))}
              </ul>
            )}
            <CustomerEditForms
              party={party}
              contacts={contacts}
              canEditParty={false}
              canEditContacts={canEditContacts}
            />
          </PageSection>

          <PageSection id="trabajo" card className="scroll-mt-24 p-6">
            <SectionHeader
              title={FOLLOW_UP_COPY.section}
              action={
                relatedWork.status === 'ok' && relatedWork.data.items.length > 0 ? (
                  <Link href={trabajoForPartyHref(partyId)} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
                    Ver todo
                  </Link>
                ) : undefined
              }
            />
            <RegisterFollowUpForm partyId={partyId} />
            <CommercialSectionState
              outcome={relatedWork}
              emptyTitle={FOLLOW_UP_COPY.emptyTitle}
              emptyDescription={FOLLOW_UP_COPY.emptyDescription}
            >
              {(workData) => (
                <>
                  <StaleProjectionBanner freshness={workData.freshness} />
                  <WorkList items={workData.items} memberLabels={memberLabels} presentation="follow-up" />
                </>
              )}
            </CommercialSectionState>
          </PageSection>

          <PageSection id="oportunidades" card className="scroll-mt-24 p-6">
            <SectionHeader
              title="Oportunidades"
              action={
                <Link
                  href={newOpportunityHref(partyId)}
                  className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                >
                  Nueva oportunidad
                </Link>
              }
            />
            <CommercialSectionState
              outcome={opportunities}
              emptyTitle="Sin oportunidades todavía"
              emptyDescription="Cuando se registren oportunidades para esta empresa, aparecerán aquí."
            >
              {(list) => (
                <>
                  <StaleProjectionBanner freshness={list.freshness} />
                  <OpportunityList partyId={partyId} items={list.items} memberLabels={memberLabels} />
                </>
              )}
            </CommercialSectionState>
          </PageSection>

          <PageSection id="cotizaciones" card className="scroll-mt-24 p-6">
            <SectionHeader title="Cotizaciones" />
            <CommercialSectionState
              outcome={quotes}
              emptyTitle="Sin cotizaciones todavía"
              emptyDescription="Cuando se emitan cotizaciones para esta empresa, aparecerán aquí."
            >
              {(list) => (
                <>
                  <StaleProjectionBanner freshness={list.freshness} />
                  <QuoteList partyId={partyId} items={list.items} memberLabels={memberLabels} />
                </>
              )}
            </CommercialSectionState>
          </PageSection>

          <PageSection id="pedidos" card className="scroll-mt-24 p-6">
            <SectionHeader title="Pedidos" />
            <CommercialSectionState
              outcome={orders}
              emptyTitle="Sin pedidos todavía"
              emptyDescription="Cuando se registren pedidos para esta empresa, aparecerán aquí."
            >
              {(list) => (
                <>
                  <StaleProjectionBanner freshness={list.freshness} />
                  <OrderList partyId={partyId} items={list.items} memberLabels={memberLabels} />
                </>
              )}
            </CommercialSectionState>
          </PageSection>

          <PageSection id="ubicaciones" card className="scroll-mt-24 p-6">
            <SectionHeader title="Ubicaciones" />
            <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
              Direcciones registradas de esta empresa. Sin mapa y sin geocodificación.
            </p>
            {locations.status === 'ok' ? (
              <CustomerLocationPanel
                partyId={partyId}
                locations={locations.data.locations}
                canMutate={canEditParty}
              />
            ) : locations.status === 'unavailable' ? (
              <ServiceUnavailableState />
            ) : locations.status === 'forbidden' ? (
              <AccessDeniedState />
            ) : (
              <p className="text-sm text-[var(--isalwa-slate)]" role="alert">
                {locations.message}
              </p>
            )}
          </PageSection>

          <PageSection id="historial" card className="scroll-mt-24 p-6">
            <SectionHeader title="Historial" />
            <CommercialSectionState
              outcome={timeline}
              emptyTitle="Sin actividad comercial todavía"
              emptyDescription="La actividad comercial y del cliente aparecerá aquí cuando exista."
            >
              {(list) => (
                <>
                  <StaleProjectionBanner freshness={list.freshness} />
                  <PartyTimelineList items={list.items} />
                </>
              )}
            </CommercialSectionState>
          </PageSection>

          <FutureSectionPlaceholder
            title="Mensajes"
            description="Mensajes integrados — no configurado todavía."
          />
        </div>

        <p className="sr-only">
          Cliente 360 carga hasta {CLIENTE_360_REQUEST_COUNT} consultas en paralelo por vista.
        </p>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return (
        <PageContainer label="Cliente">
          <QuerySurfaceState
            error={{ kind: 'unknown', message: 'No se encontró este cliente o no está disponible.' }}
          />
        </PageContainer>
      );
    }
    return (
      <PageContainer label="Cliente">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
