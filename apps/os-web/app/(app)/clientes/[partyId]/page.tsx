import Link from 'next/link';
import { EmptyState, ListRow, PageContainer, PageSection, SectionHeader } from '@isalwa/ui';
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
import { PartyRoleBadges, PartyStatusBadge } from '@/components/party/party-role-badges';
import { WorkList } from '@/components/work/work-list';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext } from '@/lib/auth/actions';
import { loadCliente360 } from '@/lib/cliente/load-cliente-360';
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
  formatCommercialAccountStatus,
  formatPartyKind,
  multiRoleHint,
} from '@/lib/party/labels';
import { partyHref, trabajoForPartyHref } from '@/lib/party/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import type { ActiveMemberOption } from '@/lib/commercial/types';
import type { PartyDetailResponse } from '@/lib/party/types';

type PartyDetailPageProps = {
  params: Promise<{ partyId: string }>;
};

const sectionClass = 'scroll-mt-32 p-8';
const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';

function activeRoleKeys(detail: Awaited<ReturnType<typeof loadCliente360>>['detail']): string[] {
  return detail.roles.map((role) => role.roleKey);
}

function CustomerNotFound() {
  return (
    <PageContainer label="Cliente">
      <PageHeader
        kicker="Cliente"
        title="Cliente no disponible"
        action={
          <Link href="/clientes" className={linkClass}>
            Volver
          </Link>
        }
      />
      <p className="max-w-md text-sm leading-relaxed text-[var(--isalwa-slate)]">
        No se encontró este cliente o no está disponible.
      </p>
    </PageContainer>
  );
}

function IdentityLetterhead({
  party,
  contacts,
  contact,
  owner,
  partyId,
  commercialAccount,
  members,
  canEditParty,
}: {
  party: PartyDetailResponse['party'];
  contacts: PartyDetailResponse['contacts'];
  contact: PartyDetailResponse['contacts'][number] | null;
  owner: ReturnType<typeof commercialOwnerView>;
  partyId: string;
  commercialAccount: PartyDetailResponse['commercialAccount'];
  members: ActiveMemberOption[];
  canEditParty: boolean;
}) {
  const contactName = contact ? contactDisplayName(contact.givenName, contact.familyName) : null;
  const accountLabel = commercialAccount
    ? formatCommercialAccountStatus(commercialAccount.status)
    : null;

  return (
    <div id="resumen" className="scroll-mt-32 space-y-8 bg-white">
      <dl className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
        {party.legalName ? (
          <div className="min-w-0 sm:col-span-2">
            <dt className="isalwa-section-label">Razón social</dt>
            <dd className="mt-2 break-words text-[var(--isalwa-kiln)]">{party.legalName}</dd>
          </div>
        ) : null}
        <div>
          <dt className="isalwa-section-label">Estado</dt>
          <dd className="mt-2">
            <PartyStatusBadge status={party.status} />
          </dd>
        </div>
        <div>
          <dt className="isalwa-section-label">Tipo</dt>
          <dd className="mt-2 text-[var(--isalwa-kiln)]">{formatPartyKind(party.partyKind)}</dd>
        </div>
        {contactName ? (
          <div className="min-w-0">
            <dt className="isalwa-section-label">Contacto</dt>
            <dd className="mt-2 break-words text-[var(--isalwa-kiln)]">{contactName}</dd>
            {contact?.title ? (
              <dd className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{contact.title}</dd>
            ) : null}
          </div>
        ) : null}
        {contact?.phone ? (
          <div className="min-w-0">
            <dt className="isalwa-section-label">Teléfono</dt>
            <dd className="mt-2 break-words text-[var(--isalwa-kiln)]">{contact.phone}</dd>
          </div>
        ) : null}
        {contact?.whatsapp ? (
          <div className="min-w-0">
            <dt className="isalwa-section-label">WhatsApp</dt>
            <dd className="mt-2 break-words text-[var(--isalwa-kiln)]">{contact.whatsapp}</dd>
          </div>
        ) : null}
      </dl>

      {commercialAccount ? (
        <CommercialOwnerLine
          owner={owner}
          partyId={partyId}
          commercialAccountId={commercialAccount.id}
          members={members}
        />
      ) : (
        <CommercialOwnerLine owner={owner} />
      )}

      {accountLabel ? <p className="text-sm text-[var(--isalwa-slate)]">{accountLabel}</p> : null}

      {party.status === 'merged' && party.mergedIntoPartyId ? (
        <p className="text-sm text-[var(--isalwa-slate)]">
          Este registro fue fusionado.{' '}
          <Link href={partyHref(party.mergedIntoPartyId)} className={linkClass}>
            Ver registro principal
          </Link>
        </p>
      ) : null}

      <CustomerEditForms party={party} contacts={contacts} canEditParty={canEditParty} canEditContacts={false} />
    </div>
  );
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
    const contact = contacts[0] ?? null;
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
      <PageContainer label={displayName} className="min-w-0">
        <PageHeader
          kicker="Cliente"
          title={displayName}
          description={roleHint ?? undefined}
          action={
            <Link href="/clientes" className={linkClass}>
              Volver
            </Link>
          }
        />

        {data.staleFreshness ? (
          <div className="mb-8">
            <StaleProjectionBanner stale />
          </div>
        ) : null}

        <IdentityLetterhead
          party={party}
          contacts={contacts}
          contact={contact}
          owner={owner}
          partyId={partyId}
          commercialAccount={commercialAccount}
          members={ownerMembers}
          canEditParty={canEditParty}
        />

        <Cliente360Nav partyId={partyId} />

        <div className="mt-10 min-w-0 space-y-12">
          <PageSection id="contactos" card className={sectionClass}>
            <SectionHeader title="Contactos" />
            {contacts.length === 0 ? (
              <EmptyState title="No hay contactos" description="Esta empresa no tiene contactos registrados." />
            ) : (
              <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]">
                {contacts.map((item) => (
                  <ListRow key={item.id} as="li" className="min-w-0 px-1 py-1">
                    <div className="min-w-0 max-w-full flex-1">
                      <p className="break-words font-medium text-[var(--isalwa-kiln)]">
                        {contactDisplayName(item.givenName, item.familyName)}
                      </p>
                      {item.title ? (
                        <p className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{item.title}</p>
                      ) : null}
                      <dl className="mt-3 grid min-w-0 gap-3 text-sm sm:grid-cols-2">
                        {item.email ? (
                          <div className="min-w-0">
                            <dt className="isalwa-section-label">Correo</dt>
                            <dd className="mt-1 break-words text-[var(--isalwa-kiln)] [overflow-wrap:anywhere]">
                              {item.email}
                            </dd>
                          </div>
                        ) : null}
                        {item.phone ? (
                          <div className="min-w-0">
                            <dt className="isalwa-section-label">Teléfono</dt>
                            <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{item.phone}</dd>
                          </div>
                        ) : null}
                        {item.whatsapp ? (
                          <div className="min-w-0">
                            <dt className="isalwa-section-label">WhatsApp</dt>
                            <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{item.whatsapp}</dd>
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

          <PageSection id="ubicaciones" card className={sectionClass}>
            <SectionHeader title="Ubicaciones" />
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

          <PageSection id="relaciones" card className={sectionClass}>
            <SectionHeader title="Relaciones" />
            <p className="mb-6 text-sm text-[var(--isalwa-slate)]">
              Todas las relaciones comerciales de esta misma empresa.
            </p>
            <PartyRoleBadges roleKeys={roleKeys} />
          </PageSection>

          <PageSection id="oportunidades" card className={sectionClass}>
            <SectionHeader
              title="Oportunidades"
              action={
                <Link href={newOpportunityHref(partyId)} className={linkClass}>
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

          <PageSection id="cotizaciones" card className={sectionClass}>
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

          <PageSection id="pedidos" card className={sectionClass}>
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

          <PageSection id="trabajo" card className={sectionClass}>
            <SectionHeader
              title={FOLLOW_UP_COPY.section}
              action={
                relatedWork.status === 'ok' && relatedWork.data.items.length > 0 ? (
                  <Link href={trabajoForPartyHref(partyId)} className={linkClass}>
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

          <PageSection id="historial" card className={sectionClass}>
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
        </div>
      </PageContainer>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return <CustomerNotFound />;
    }
    return (
      <PageContainer label="Cliente">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </PageContainer>
    );
  }
}
