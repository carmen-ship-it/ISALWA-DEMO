import Link from 'next/link';
import { EmptyState, ListRow, PageSection, SectionHeader } from '@isalwa/ui';
import { Cliente360Nav } from '@/components/cliente/cliente-360-nav';
import { Cliente360Sticky } from '@/components/cliente/cliente-360-sticky';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { CommercialSectionState } from '@/components/commercial/commercial-section-state';
import { commercialPrimaryLinkClass } from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { OpportunityList } from '@/components/commercial/opportunity-list';
import { OrderList } from '@/components/commercial/order-list';
import { PartyTimelineList } from '@/components/commercial/party-timeline-list';
import { QuoteList } from '@/components/commercial/quote-list';
import { ManualOperationsPanel } from '@/components/operations/manual-operations-panel';
import { Cliente360Now } from '@/components/party/cliente-360-now';
import { CommercialOwnerLine } from '@/components/party/commercial-owner-line';
import { CustomerEditForms } from '@/components/party/customer-edit-forms';
import { CustomerLocationPanel } from '@/components/party/customer-location-panel';
import { PageHeader } from '@/components/shell/page-header';
import { PartyRoleBadges, PartyStatusBadge } from '@/components/party/party-role-badges';
import { WorkList } from '@/components/work/work-list';
import { RegisterFollowUpForm } from '@/components/work/register-follow-up-form';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { Cliente360Issues } from '@/components/issue/cliente-360-issues';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { CommitmentRecordForm } from '@/components/commitments/commitment-record-form';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { loadCliente360 } from '@/lib/cliente/load-cliente-360';
import { clienteSectionHref, newOpportunityHref } from '@/lib/commercial/navigation';
import { AccessDeniedState, ServiceUnavailableState } from '@/components/states/app-states';
import { actorCanMutateMasterData } from '@/lib/party/master-data-access';
import type { IssueListItem } from '@/lib/issue/types';
import { COMMITMENT_COPY } from '@/lib/commitments/copy';
import {
  canManageContacts,
  canMutateActiveParty,
  commercialOwnerView,
} from '@/lib/party/customer-self-service';
import { composeCliente360FromLoaded } from '@/lib/party/next-action';
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
import type { Cliente360Composition } from '@/lib/party/next-action';
import type { PartyDetailResponse } from '@/lib/party/types';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { AiAssistPanel } from '@/components/ai/ai-assist-panel';
import { isAiEnabled } from '@/lib/ai/limits';

type PartyDetailPageProps = {
  params: Promise<{ partyId: string }>;
};

const sectionClass = 'scroll-mt-40 p-8';
const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';
const secondaryActionClass =
  'isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 text-sm font-medium text-[var(--isalwa-kiln)] hover:border-[var(--isalwa-glaze)] focus-visible:shadow-[var(--isalwa-shadow-focus)]';

function activeRoleKeys(detail: Awaited<ReturnType<typeof loadCliente360>>['detail']): string[] {
  return detail.roles.map((role) => role.roleKey);
}

function CustomerCompactHeader({
  displayName,
  status,
  ownerLabel,
  hasCoordinates,
  contactName,
  phone,
  maps,
  partyId,
  nextAction,
}: {
  displayName: string;
  status: string;
  ownerLabel: string | null;
  hasCoordinates: boolean;
  contactName: string | null;
  phone: string | null;
  maps: { href: string; label: string } | null;
  partyId: string;
  nextAction: Cliente360Composition['nextAction'] | null;
}) {
  const facts = [
    ownerLabel ? `Responsable comercial: ${ownerLabel}` : null,
    hasCoordinates ? 'Ubicación disponible' : null,
    contactName,
    phone,
  ].filter((fact): fact is string => Boolean(fact));

  const showNext =
    nextAction &&
    nextAction.kind !== 'insufficient' &&
    nextAction.statement.trim().length > 0;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-[var(--isalwa-kiln)]">{displayName}</p>
            <PartyStatusBadge status={status} />
          </div>
          {facts.length > 0 ? (
            <p className="mt-1 break-words text-xs leading-4 text-[var(--isalwa-slate)]">{facts.join(' · ')}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {maps ? (
            <a href={maps.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {maps.label}
            </a>
          ) : null}
          <Link href={newOpportunityHref(partyId)} className={commercialPrimaryLinkClass}>
            Nueva oportunidad
          </Link>
          <Link href={clienteSectionHref(partyId, 'trabajo')} className={secondaryActionClass}>
            {FOLLOW_UP_COPY.action}
          </Link>
        </div>
      </div>
      {showNext ? (
        <p className="text-sm text-[var(--isalwa-kiln)]" data-tour="cliente360-next-action">
          <span className="font-medium">{FOLLOW_UP_COPY.nextAction}</span>
          {' · '}
          {nextAction.href ? (
            <Link href={nextAction.href} className={linkClass}>
              {nextAction.statement}
            </Link>
          ) : (
            <span>{nextAction.statement}</span>
          )}
          {nextAction.dueText ? (
            <span className="text-[var(--isalwa-slate)]"> · {nextAction.dueText}</span>
          ) : null}
          {nextAction.overdue ? (
            <span className="text-[var(--isalwa-slate)]"> · Vencido</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function CustomerNotFound() {
  return (
    <CommercialPageFrame label="Cliente">
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
    </CommercialPageFrame>
  );
}

function IdentityLetterhead({
  party,
  contacts,
  contact,
  owner,
  partyId,
  commercialAccount,
  canEditParty,
  composition,
}: {
  party: PartyDetailResponse['party'];
  contacts: PartyDetailResponse['contacts'];
  contact: PartyDetailResponse['contacts'][number] | null;
  owner: ReturnType<typeof commercialOwnerView>;
  partyId: string;
  commercialAccount: PartyDetailResponse['commercialAccount'];
  canEditParty: boolean;
  composition: Cliente360Composition;
}) {
  const contactName = contact ? contactDisplayName(contact.givenName, contact.familyName) : null;
  const accountLabel = commercialAccount
    ? formatCommercialAccountStatus(commercialAccount.status)
    : null;

  return (
    <div
      id="resumen"
      className="scroll-mt-40 space-y-8 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-6 shadow-[var(--isalwa-shadow-soft)] md:p-8"
      data-tour="cliente360-identity"
    >
      <Cliente360Now composition={composition} />
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
          currentOwnerMemberId={commercialAccount.ownerMemberId}
          note={composition.owner.note}
        />
      ) : (
        <CommercialOwnerLine owner={owner} note={composition.owner.note} />
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
    const actorIsMasterDataAdmin = await actorCanMutateMasterData(client);
    const canEditParty = canMutateActiveParty(party.status, actorIsMasterDataAdmin ? ['master_data.admin'] : []);
    const canEditContacts = canManageContacts(
      party.partyKind,
      party.status,
      actorIsMasterDataAdmin ? ['master_data.admin'] : [],
    );
    const canReassignOwner = detail.commercialAuthority?.canReassignOwner === true;
    const owner = commercialOwnerView(
      commercialAccount?.ownerMemberId,
      commercialAccount?.ownerMemberId
        ? memberLabel(memberLabels, commercialAccount.ownerMemberId)
        : null,
      canReassignOwner,
    );
    const composition = composeCliente360FromLoaded({
      partyId,
      detail,
      displayName,
      ownerLabel: commercialAccount?.ownerMemberId ? owner.label : null,
      canReassignOwner,
      locations,
      relatedWork,
      timeline,
      opportunities,
      quotes,
      orders,
      staleProjection: data.staleFreshness,
    });
    const primaryContact =
      contacts.find((item) => item.id === composition.primaryContact.id) ?? null;
    const webSession = await getServerWebSession();
    const reportedByLabel = webSession?.displayLabel?.trim() ?? '';
    let actorMemberId = '';
    try {
      const authed = await client.getAuthenticatedSession();
      actorMemberId = authed.memberId?.trim() ?? '';
    } catch {
      actorMemberId = '';
    }
    const manualSubjectId = party.id.trim();
    const manualOrganizationId = party.organizationId.trim();

    let partyIssues: IssueListItem[] = [];
    try {
      const issuePage = await client.listIssues({ view: 'all', partyId, limit: 20 });
      partyIssues = (issuePage.items ?? []).map((item) => ({
        issueId: item.issueId,
        title: item.title,
        description: item.description,
        status: item.status,
        reporterMemberId: item.reporterMemberId,
        ownerMemberId: item.ownerMemberId,
        createdAt: item.createdAt,
        references: item.references ?? [],
      }));
    } catch {
      partyIssues = [];
    }

    let partyCommitments: Awaited<ReturnType<typeof client.listCommitments>>['items'] = [];
    try {
      const commitmentPage = await client.listCommitments({ partyId });
      partyCommitments = commitmentPage.items ?? [];
    } catch {
      partyCommitments = [];
    }

    return (
      <CommercialPageFrame label={displayName} data-tour={TOUR_TARGET.customer360}>
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
          <div className="mb-6">
            <StaleProjectionBanner stale />
          </div>
        ) : null}

        <Cliente360Sticky>
          <CustomerCompactHeader
            displayName={displayName}
            status={party.status}
            ownerLabel={composition.owner.assigned ? composition.owner.label : null}
            hasCoordinates={composition.location.state === 'coordinates'}
            contactName={composition.primaryContact.name}
            phone={composition.primaryContact.phone}
            maps={composition.location.provenance}
            partyId={partyId}
            nextAction={composition.nextAction}
          />
          <Cliente360Nav partyId={partyId} embedded />
        </Cliente360Sticky>

        <IdentityLetterhead
          party={party}
          contacts={contacts}
          contact={primaryContact}
          owner={owner}
          partyId={partyId}
          commercialAccount={commercialAccount}
          canEditParty={canEditParty}
          composition={composition}
        />

        {reportedByLabel && manualOrganizationId && manualSubjectId ? (
          <PageSection card className="mt-10 max-w-xl p-8">
            <ManualOperationsPanel
              organizationId={manualOrganizationId}
              subjectType="party"
              subjectId={manualSubjectId}
              subjectLabel={displayName}
              reportedByLabel={reportedByLabel}
            />
          </PageSection>
        ) : null}

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
                <Link href={newOpportunityHref(partyId)} className={commercialPrimaryLinkClass}>
                  Nueva oportunidad
                </Link>
              }
            />
            <CommercialSectionState
              outcome={opportunities}
              emptyTitle="Todavía no hay oportunidades activas para este cliente"
              emptyDescription="Cuando se registren oportunidades para esta empresa, aparecerán aquí."
              emptyExample="Un cliente activo sin pipeline: cero oportunidades es un estado real del piloto, no un fallo de pantalla."
              emptyAction={
                <Link href={newOpportunityHref(partyId)} className={commercialPrimaryLinkClass}>
                  Nueva oportunidad
                </Link>
              }
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
              emptyTitle="Todavía no hay cotizaciones activas"
              emptyDescription="Cuando se emitan cotizaciones para esta empresa, aparecerán aquí."
              emptyExample="Todavía no hay cotizaciones es esperado si aún no hay oportunidad con borrador o envío."
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
              emptyExample="Un cliente activo puede no tener pedidos. El vacío es intencional hasta que exista una cotización convertida."
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

          <PageSection id="incidencias" card className={sectionClass}>
            <Cliente360Issues
              items={partyIssues}
              partyId={partyId}
              partyLabel={displayName}
              reportedByLabel={reportedByLabel || undefined}
            />
          </PageSection>

          <div className="mt-6">
            <AiAssistPanel
              title="Ayuda con este cliente"
              feature="summarize_customer"
              subjectType="party"
              subjectId={partyId}
              surface="cliente360"
              aiEnabled={isAiEnabled()}
              promptLabel="Preguntar sobre este cliente"
            />
          </div>

          <PageSection id="compromisos" card className={sectionClass}>
            <SectionHeader title={COMMITMENT_COPY.title} />
            <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {COMMITMENT_COPY.sectionHint}
            </p>
            {actorMemberId ? (
              <CommitmentRecordForm
                organizationId={manualOrganizationId || party.organizationId}
                ownerMemberId={actorMemberId}
                partyId={partyId}
              />
            ) : null}
            <div className="mt-6">
              <CommitmentList
                items={partyCommitments}
                memberLabels={memberLabels}
                partyLabel={displayName}
                showOrigin
              />
            </div>
            <div className="mt-6">
              <AiAssistPanel
                title="Ayuda con compromisos"
                feature="summarize_commitments"
                subjectType="party"
                subjectId={partyId}
                surface="commitment"
                aiEnabled={isAiEnabled()}
                promptLabel="Preguntar sobre compromisos"
              />
            </div>
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
                  <PartyTimelineList items={list.items} memberLabels={memberLabels} />
                </>
              )}
            </CommercialSectionState>
          </PageSection>
        </div>
      </CommercialPageFrame>
    );
  } catch (err) {
    if (err instanceof OsApiError && err.kind === 'not_found') {
      return <CustomerNotFound />;
    }
    return (
      <CommercialPageFrame label="Cliente">
        <QuerySurfaceState error={classifyQueryError(err)} />
      </CommercialPageFrame>
    );
  }
}
