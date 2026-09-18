import Link from 'next/link';
import { ListRow, PageSection, SectionHeader, EmptyState } from '@isalwa/ui';
import { Cliente360Nav } from '@/components/cliente/cliente-360-nav';
import { Cliente360Sticky } from '@/components/cliente/cliente-360-sticky';
import { Cliente360Header } from '@/components/cliente/cliente-360-header';
import { Cliente360Intelligence } from '@/components/cliente/cliente-360-intelligence';
import { CommercialPageFrame } from '@/components/commercial/commercial-page-frame';
import { CommercialSectionState } from '@/components/commercial/commercial-section-state';
import { commercialPrimaryLinkClass } from '@/components/commercial/commercial-surfaces';
import '@/components/commercial/commercial-surfaces.css';
import { OpportunityList } from '@/components/commercial/opportunity-list';
import { OrderList } from '@/components/commercial/order-list';
import { Cliente360Historial } from '@/components/cliente/cliente-360-historial';
import { QuoteList } from '@/components/commercial/quote-list';
import { Cliente360Now } from '@/components/party/cliente-360-now';
import { Cliente360OwnerLine } from '@/components/party/cliente-360-owner-line';
import { TemporaryCoveragePanel } from '@/components/party/temporary-coverage-panel';
import { CustomerLocationPanel } from '@/components/party/customer-location-panel';
import { PageHeader } from '@/components/shell/page-header';
import { PartyRoleBadges, PartyStatusBadge } from '@/components/party/party-role-badges';
import { WorkList } from '@/components/work/work-list';
import { QuerySurfaceState } from '@/components/work/query-surface-state';
import { StaleProjectionBanner } from '@/components/work/stale-projection-banner';
import { Cliente360Issues } from '@/components/issue/cliente-360-issues';
import { Cliente360Documentos } from '@/components/cliente/cliente-360-documentos';
import { Cliente360Finanzas } from '@/components/cliente/cliente-360-finanzas';
import { CommitmentList } from '@/components/commitments/commitment-list';
import { ScaledListReveal } from '@/components/ui/scaled-list-reveal';
import { createOsApiClient } from '@/lib/api/os-api-client';
import { OsApiError } from '@/lib/api/os-api-errors';
import { getServerOsAuthContext, getServerWebSession } from '@/lib/auth/actions';
import { loadCliente360 } from '@/lib/cliente/load-cliente-360';
import { buildCliente360Intelligence } from '@/lib/cliente/client-intelligence';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import { parseCliente360Tab } from '@/lib/cliente/nav-sections';
import { LIST_SCALE_PREVIEW_DEFAULT, LIST_SCALE_PREVIEW_LARGE } from '@/lib/ui/list-scaling';
import { newOpportunityHref } from '@/lib/commercial/navigation';
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
import { formatTimestamp } from '@/lib/work/labels';
import {
  contactDisplayName,
  formatCommercialAccountStatus,
  formatPartyKind,
  multiRoleHint,
} from '@/lib/party/labels';
import { partyHref, trabajoForPartyHref } from '@/lib/party/navigation';
import { classifyQueryError } from '@/lib/work/query-errors';
import { FOLLOW_UP_COPY } from '@/lib/work/follow-up';
import { reportIssueContextFromParty } from '@/lib/issue/report-context';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';
import { AiAssistShell } from '@/components/ai/ai-assist-shell';
import { getEvaluationProjection } from '@/lib/role-preview/evaluation-projection';
import { commercialListQueryFromProjection } from '@/lib/role-preview/commercial-list-query';
import { EvaluationDeskExcluded } from '@/components/shell/evaluation-desk-excluded';
import {
  evaluationAllowsDesk,
  evaluationBlocksDirectParty,
  evaluationIsOpsPersona,
} from '@/lib/role-preview/evaluation-resource-access';
import { filterTimelineItemsForProjection, filterDocumentLinksForProjection } from '@/lib/role-preview/evaluation-history-filter';

type PartyDetailPageProps = {
  params: Promise<{ partyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const sectionClass = 'scroll-mt-40 p-5 md:p-6';
const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';
const helpLinkClass = 'text-sm font-medium text-[var(--isalwa-info)] hover:underline';

const CLOSED_ISSUE_STATUSES = new Set(['resolved', 'closed']);

function activeRoleKeys(detail: Awaited<ReturnType<typeof loadCliente360>>['detail']): string[] {
  return detail.roles.map((role) => role.roleKey);
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

export default async function PartyDetailPage({ params, searchParams }: PartyDetailPageProps) {
  const { partyId } = await params;
  const tab = parseCliente360Tab((await searchParams).tab);
  const auth = await getServerOsAuthContext();
  if (!auth) return null;
  const evaluation = await getEvaluationProjection();
  if (!evaluationAllowsDesk(evaluation, 'commercial')) {
    return <EvaluationDeskExcluded evaluation={evaluation} deskLabel="Cliente" />;
  }

  const client = createOsApiClient(auth);

  try {
    const data = await loadCliente360(client, partyId, {
      commercialQuery: commercialListQueryFromProjection(evaluation),
      suppressCommercialNegotiation: evaluationIsOpsPersona(evaluation.persona),
    });
    const {
      detail,
      opportunities,
      quotes,
      orders,
      timeline,
      relatedWork,
      locations,
      documentLinks,
      financeSummary,
      memberLabels,
    } = data;
    const roleKeys = activeRoleKeys(detail);
    const roleHint = multiRoleHint(roleKeys);
    const { party, contacts, commercialAccount } = detail;
    const linkedQuotes =
      quotes.status === 'ok'
        ? quotes.data.items.map((item) => ({
            quoteId: item.quoteId,
            partyId: item.partyId,
            opportunityId: item.opportunityId,
            status: item.status,
          }))
        : [];

    if (evaluationBlocksDirectParty(evaluation, commercialAccount?.ownerMemberId)) {
      return (
        <CommercialPageFrame label="Cliente">
          <AccessDeniedState />
        </CommercialPageFrame>
      );
    }

    const displayName = party.displayName || party.legalName || 'Sin nombre';
    const actorIsMasterDataAdmin = evaluation.active
      ? false
      : await actorCanMutateMasterData(client);
    const canEditParty = canMutateActiveParty(party.status, actorIsMasterDataAdmin ? ['master_data.admin'] : []);
    const canEditContacts = canManageContacts(
      party.partyKind,
      party.status,
      actorIsMasterDataAdmin ? ['master_data.admin'] : [],
    );
    const canReassignOwner =
      !evaluation.active && detail.commercialAuthority?.canReassignOwner === true;
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
    const accountLabel = commercialAccount ? formatCommercialAccountStatus(commercialAccount.status) : null;

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
    const issueContext = reportIssueContextFromParty(partyId, displayName);

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

    const openIssueCount = partyIssues.filter((item) => !CLOSED_ISSUE_STATUSES.has(item.status)).length;

    let partyCommitments: Awaited<ReturnType<typeof client.listCommitments>>['items'] = [];
    try {
      const commitmentPage = await client.listCommitments({ partyId });
      partyCommitments = commitmentPage.items ?? [];
    } catch {
      partyCommitments = [];
    }

    const intelligence = buildCliente360Intelligence({
      opportunities,
      quotes,
      orders,
      documentLinks,
      openIssues: openIssueCount,
      composition,
    });

    return (
      <CommercialPageFrame label={displayName} data-tour={TOUR_TARGET.customer360}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 md:mb-4">
          <p className="text-sm text-[var(--isalwa-slate)]">
            {roleHint ? roleHint : 'Ficha del cliente'}
          </p>
          <Link href="/clientes" className={helpLinkClass}>
            Volver a clientes
          </Link>
        </div>

        {data.staleFreshness ? (
          <div className="mb-4">
            <StaleProjectionBanner stale />
          </div>
        ) : null}

        <Cliente360Sticky>
          <Cliente360Header
            partyId={partyId}
            displayName={displayName}
            status={party.status}
            composition={composition}
            party={party}
            contacts={contacts}
            canEditParty={canEditParty}
            canEditContacts={canEditContacts}
            canReassignOwner={canReassignOwner}
            allowMutations={!evaluation.active}
            ownerLabel={owner.label}
            commercialAccountId={commercialAccount?.id ?? null}
            currentOwnerMemberId={commercialAccount?.ownerMemberId ?? null}
            issueContext={issueContext}
            reportedByLabel={reportedByLabel || undefined}
            organizationId={manualOrganizationId || party.organizationId}
            actorMemberId={actorMemberId}
            manualSubjectLabel={displayName}
            manualOrganizationId={manualOrganizationId}
            manualSubjectId={manualSubjectId}
          />
          <Cliente360Nav partyId={partyId} activeTab={tab} embedded />
        </Cliente360Sticky>

        <div className="mt-5 min-w-0 space-y-6 md:mt-6 md:space-y-8">
          {tab === 'resumen' ? (
          <PageSection id="resumen" card className={sectionClass} data-tour="cliente360-identity">
            <SectionHeader title="Resumen" className="mb-4" />
            <div className="space-y-6">
              <Cliente360Intelligence facts={intelligence} />
              <Cliente360Now composition={composition} />
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
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
              </dl>
              <Cliente360OwnerLine owner={owner} note={composition.owner.note} />
              {commercialAccount?.id && commercialAccount.ownerMemberId ? (
                <TemporaryCoveragePanel
                  partyId={partyId}
                  commercialAccountId={commercialAccount.id}
                  canonicalOwnerLabel={owner.label}
                  canonicalOwnerMemberId={commercialAccount.ownerMemberId}
                  canManageCoverage={
                    !evaluation.active && detail.commercialAuthority?.canManageCoverage === true
                  }
                  activeCoverage={
                    detail.activeCoverage
                      ? {
                          grantId: detail.activeCoverage.grantId,
                          actingAdvisorLabel: memberLabel(
                            memberLabels,
                            detail.activeCoverage.actingAdvisorMemberId,
                          ),
                          actingAdvisorMemberId: detail.activeCoverage.actingAdvisorMemberId,
                          assignedByLabel: detail.activeCoverage.recordedByMemberId
                            ? memberLabel(memberLabels, detail.activeCoverage.recordedByMemberId)
                            : null,
                          startsAtLabel:
                            formatTimestamp(detail.activeCoverage.startsAt) ??
                            detail.activeCoverage.startsAt,
                          note: null,
                        }
                      : null
                  }
                />
              ) : null}
              {accountLabel ? <p className="text-sm text-[var(--isalwa-slate)]">{accountLabel}</p> : null}
              {party.status === 'merged' && party.mergedIntoPartyId ? (
                <p className="text-sm text-[var(--isalwa-slate)]">
                  Este registro fue fusionado.{' '}
                  <Link href={partyHref(party.mergedIntoPartyId)} className={linkClass}>
                    Ver registro principal
                  </Link>
                </p>
              ) : null}
              <div>
                <p className="isalwa-section-label">Contactos</p>
                {contacts.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">No hay contactos registrados.</p>
                ) : (
                  <ScaledListReveal
                    total={contacts.length}
                    empty={<p className="mt-2 text-sm text-[var(--isalwa-slate)]">No hay contactos registrados.</p>}
                    preview={
                      <ul className="mt-3 min-w-0 divide-y divide-[var(--isalwa-mist)]">
                        {contacts.slice(0, LIST_SCALE_PREVIEW_DEFAULT).map((item) => (
                          <ListRow key={item.id} as="li" className="min-w-0 px-1 py-2">
                            <p className="break-words font-medium text-[var(--isalwa-kiln)]">
                              {contactDisplayName(item.givenName, item.familyName)}
                            </p>
                            {item.phone ? (
                              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.phone}</p>
                            ) : null}
                          </ListRow>
                        ))}
                      </ul>
                    }
                    full={
                      <ul className="mt-3 min-w-0 divide-y divide-[var(--isalwa-mist)]">
                        {contacts.map((item) => (
                          <ListRow key={item.id} as="li" className="min-w-0 px-1 py-2">
                            <p className="break-words font-medium text-[var(--isalwa-kiln)]">
                              {contactDisplayName(item.givenName, item.familyName)}
                            </p>
                            {item.phone ? (
                              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.phone}</p>
                            ) : null}
                          </ListRow>
                        ))}
                      </ul>
                    }
                  />
                )}
              </div>
              <div>
                <p className="isalwa-section-label">Relaciones</p>
                <div className="mt-2">
                  <PartyRoleBadges roleKeys={roleKeys} />
                </div>
              </div>
            </div>
          </PageSection>
          ) : null}

          {tab === 'comercial' ? (
          <PageSection id="comercial" card className={sectionClass}>
            <SectionHeader
              title="Comercial"
              action={
                <Link href={newOpportunityHref(partyId)} className={commercialPrimaryLinkClass}>
                  Nueva oportunidad
                </Link>
              }
            />
            <div className="space-y-10">
              <div>
                <SectionHeader title="Oportunidades" />
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
                      <ScaledListReveal
                        total={list.items.length}
                        previewCount={LIST_SCALE_PREVIEW_LARGE}
                        empty={
                          <EmptyState
                            title="Todavía no hay oportunidades activas para este cliente"
                            description="Cuando se registren oportunidades para esta empresa, aparecerán aquí."
                          />
                        }
                        preview={
                          <OpportunityList
                            partyId={partyId}
                            items={list.items.slice(0, LIST_SCALE_PREVIEW_LARGE)}
                            memberLabels={memberLabels}
                            linkedQuotes={linkedQuotes}
                          />
                        }
                        full={
                          <OpportunityList partyId={partyId} items={list.items} memberLabels={memberLabels} linkedQuotes={linkedQuotes} />
                        }
                      />
                    </>
                  )}
                </CommercialSectionState>
              </div>
              <div>
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
                      <ScaledListReveal
                        total={list.items.length}
                        previewCount={LIST_SCALE_PREVIEW_LARGE}
                        empty={
                          <EmptyState
                            title="Todavía no hay cotizaciones activas"
                            description="Cuando se emitan cotizaciones para esta empresa, aparecerán aquí."
                          />
                        }
                        preview={
                          <QuoteList
                            partyId={partyId}
                            items={list.items.slice(0, LIST_SCALE_PREVIEW_LARGE)}
                            memberLabels={memberLabels}
                          />
                        }
                        full={<QuoteList partyId={partyId} items={list.items} memberLabels={memberLabels} />}
                      />
                    </>
                  )}
                </CommercialSectionState>
              </div>
              <div>
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
                      <ScaledListReveal
                        total={list.items.length}
                        previewCount={LIST_SCALE_PREVIEW_LARGE}
                        empty={
                          <EmptyState
                            title="Sin pedidos todavía"
                            description="Cuando se registren pedidos para esta empresa, aparecerán aquí."
                          />
                        }
                        preview={
                          <OrderList
                            partyId={partyId}
                            items={list.items.slice(0, LIST_SCALE_PREVIEW_LARGE)}
                            memberLabels={memberLabels}
                          />
                        }
                        full={<OrderList partyId={partyId} items={list.items} memberLabels={memberLabels} />}
                      />
                    </>
                  )}
                </CommercialSectionState>
              </div>
            </div>
          </PageSection>
          ) : null}

          {tab === 'operacion' ? (
          <PageSection id="operacion" card className={sectionClass}>
            <SectionHeader title="Operación" />
            <p className="mb-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">{CLIENTE360_UX_COPY.operacionHint}</p>
            <div className="space-y-10">
              <div>
                <SectionHeader title="Ubicaciones" />
                {locations.status === 'ok' ? (
                  <CustomerLocationPanel
                    partyId={partyId}
                    locations={locations.data.locations}
                    canMutate={false}
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
              </div>
              <div id="finanzas">
                <Cliente360Finanzas outcome={financeSummary} />
              </div>
            </div>
          </PageSection>
          ) : null}

          {tab === 'trabajo' ? (
          <PageSection id="trabajo" card className={sectionClass}>
            <SectionHeader
              title="Trabajo"
              action={
                relatedWork.status === 'ok' && relatedWork.data.items.length > 0 ? (
                  <Link href={trabajoForPartyHref(partyId)} className={linkClass}>
                    Ver todo
                  </Link>
                ) : undefined
              }
            />
            <div className="space-y-10">
              <div>
                <SectionHeader title={FOLLOW_UP_COPY.section} />
                <CommercialSectionState
                  outcome={relatedWork}
                  emptyTitle={FOLLOW_UP_COPY.emptyTitle}
                  emptyDescription={FOLLOW_UP_COPY.emptyDescription}
                >
                  {(workData) => (
                    <>
                      <StaleProjectionBanner freshness={workData.freshness} />
                      <ScaledListReveal
                        total={workData.items.length}
                        empty={
                          <EmptyState
                            title={FOLLOW_UP_COPY.emptyTitle}
                            description={FOLLOW_UP_COPY.emptyDescription}
                          />
                        }
                        preview={
                          <WorkList
                            items={workData.items.slice(0, LIST_SCALE_PREVIEW_DEFAULT)}
                            memberLabels={memberLabels}
                            presentation="follow-up"
                          />
                        }
                        full={
                          <WorkList
                            items={workData.items}
                            memberLabels={memberLabels}
                            presentation="follow-up"
                          />
                        }
                      />
                    </>
                  )}
                </CommercialSectionState>
              </div>
              <Cliente360Issues
                items={partyIssues}
                partyId={partyId}
                partyLabel={displayName}
                reportedByLabel={reportedByLabel || undefined}
              />
              <div>
                <SectionHeader title={COMMITMENT_COPY.title} />
                <p className="mb-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">{COMMITMENT_COPY.sectionHint}</p>
                <CommitmentList
                  items={partyCommitments}
                  memberLabels={memberLabels}
                  partyLabel={displayName}
                  showOrigin
                  scale
                  hideHeader
                />
              </div>
              <AiAssistShell
                title="Ayuda con compromisos"
                feature="summarize_commitments"
                subjectType="party"
                subjectId={partyId}
                surface="commitment"
                promptLabel="Preguntar sobre compromisos"
              />
            </div>
          </PageSection>
          ) : null}

          {tab === 'documentos' ? (
          <PageSection id="documentos" card className={sectionClass}>
            <Cliente360Documentos
              outcome={
                documentLinks.status === 'ok'
                  ? {
                      ...documentLinks,
                      links: filterDocumentLinksForProjection(evaluation, documentLinks.links),
                    }
                  : documentLinks
              }
            />
          </PageSection>
          ) : null}

          {tab === 'historial' ? (
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
                  <Cliente360Historial
                    partyId={partyId}
                    items={filterTimelineItemsForProjection(evaluation, list.items)}
                    memberLabels={memberLabels}
                  />
                </>
              )}
            </CommercialSectionState>
          </PageSection>
          ) : null}

          <AiAssistShell
            title="Ayuda con este cliente"
            feature="summarize_customer"
            subjectType="party"
            subjectId={partyId}
            surface="cliente360"
            promptLabel="Preguntar sobre este cliente"
          />
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
