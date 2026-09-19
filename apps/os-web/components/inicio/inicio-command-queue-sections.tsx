import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  Button,
  EmptyPanel,
  OperatingRow,
  PageSection,
  SectionHeader,
  StatusPill,
  cx,
} from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import type { CommitmentSummary } from '@/lib/api/os-api-client';
import { IssueList } from '@/components/issue/issue-list';
import { ApprovalList } from '@/components/work/approval-list';
import { commitmentStateLabel } from '@/lib/commitments/copy';
import { formatCommitmentDue } from '@/lib/commitments/view';
import type { InicioCommandQueues } from '@/lib/inicio/load-command-queues';
import { inicioRoleLensLabel } from '@/lib/inicio/role-lens';
import { issueListHref } from '@/lib/issue/navigation';
import type { IssueListItem } from '@/lib/issue/types';
import { partyHref } from '@/lib/party/navigation';
import type { PartyLabelMap } from '@/lib/commercial/party-resolver';
import { partyLabel } from '@/lib/commercial/party-resolver';
import { formatWorkDueLine } from '@/lib/work/due-order';
import { formatWorkStatus, isWorkOverdue, statusToneForWork } from '@/lib/work/labels';
import type { MemberLabelMap } from '@/lib/work/member-resolver';
import { workItemHref } from '@/lib/work/navigation';
import { staffFacingSubject, isEngineeringFixtureCopy } from '@/lib/work/staff-subject';

type InicioCommandQueueSectionsProps = {
  model: InicioCommandQueues;
  memberLabels: MemberLabelMap;
  partyLabels: PartyLabelMap;
  approvalSubjects: Map<string, string>;
};

function destinationButton(href: string, label: string, variant: 'primary' | 'secondary' | 'tertiary' = 'secondary') {
  return (
    <Link href={href} className="inline-flex">
      <Button type="button" variant={variant} size="sm">
        {label}
      </Button>
    </Link>
  );
}

function CommitmentRows({
  items,
  partyLabels,
}: {
  items: readonly CommitmentSummary[];
  partyLabels: PartyLabelMap;
}) {
  if (items.length === 0) return null;
  return (
    <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Compromisos">
      {items.map((item) => {
        const tone =
          item.state === 'overdue'
            ? 'danger'
            : item.state === 'due_today'
              ? 'warning'
              : 'neutral';
        const customer = item.partyId ? partyLabel(partyLabels, item.partyId) : null;
        const meta = [commitmentStateLabel(item.state), formatCommitmentDue(item.dueAt), customer]
          .filter(Boolean)
          .join(' · ');
        const href = item.partyId ? partyHref(item.partyId) : null;
        return (
          <li key={item.id} className="list-none">
            {href ? (
              <OperatingRow
                href={href}
                density="compact"
                subject={presentHumanCopy(item.text) || 'Compromiso'}
                meta={meta}
                status={
                  <StatusPill tone={tone} className="shrink-0">
                    {commitmentStateLabel(item.state)}
                  </StatusPill>
                }
              />
            ) : (
              <div className="px-3 py-2">
                <p className="text-sm text-[var(--isalwa-kiln)]">{presentHumanCopy(item.text) || 'Compromiso'}</p>
                <p className="text-xs text-[var(--isalwa-slate)]">{meta}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PendingWorkRows({
  items,
  partyLabels,
  asOf,
}: {
  items: readonly WorkSummaryReadModel[];
  partyLabels: PartyLabelMap;
  asOf: Date;
}) {
  return (
    <ul className="min-w-0 divide-y divide-[var(--isalwa-mist)]" aria-label="Trabajo pendiente">
      {items.map((work) => {
        const customer =
          work.subjectType === 'party' && work.subjectId
            ? partyLabel(partyLabels, work.subjectId)
            : null;
        const subject = staffFacingSubject({
          title: work.title,
          description: work.description,
          subjectType: work.subjectType,
          customerName: customer,
        });
        const due = formatWorkDueLine(work);
        const tone = isWorkOverdue(work, asOf) ? 'danger' : statusToneForWork(work.status);
        return (
          <li key={work.workItemId} className="list-none">
            <OperatingRow
              href={workItemHref(work.workItemId)}
              density="compact"
              subject={subject}
              meta={due.text}
              status={
                <StatusPill tone={tone} className="shrink-0">
                  {isWorkOverdue(work, asOf) ? 'Vencido' : formatWorkStatus(work.status)}
                </StatusPill>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Differentiated surface weight inside Centro de mando — not equal cards. */
const SECTION_SURFACE: Record<string, 'ops' | 'context' | 'active' | 'attention'> = {
  pendientes: 'ops',
  problemas: 'attention',
  compromisos: 'context',
  decisiones: 'active',
};

export function InicioCommandQueueSections({
  model,
  memberLabels,
  partyLabels,
  approvalSubjects,
}: InicioCommandQueueSectionsProps) {
  const asOf = new Date();
  const lensNote = `Lectura ${inicioRoleLensLabel(model.lens).toLowerCase()}. Colas del contrato, no totales.`;
  const visibleIssues = model.openIssues.filter(
    (item): item is IssueListItem =>
      !isEngineeringFixtureCopy(item.description) && !isEngineeringFixtureCopy(item.title),
  );

  const sections: Array<{
    id: string;
    title: string;
    weight: 'lead' | 'support';
    href: string;
    hrefLabel: string;
    unavailable?: boolean;
    emptyTitle: string;
    emptyDescription: string;
    content: ReactNode;
    isEmpty: boolean;
  }> = [
    {
      id: 'pendientes',
      title: 'Pendientes',
      weight: 'lead',
      href: model.lens === 'operator' ? '/trabajo' : `/trabajo?view=${model.lens === 'manager' ? 'team' : 'org'}`,
      hrefLabel: 'Ver trabajo',
      unavailable: model.unavailable.work,
      emptyTitle: 'Sin trabajo pendiente en esta lectura',
      emptyDescription: 'Cuando haya ítems abiertos en su cola, aparecerán aquí.',
      content: <PendingWorkRows items={model.pendingWork.slice(0, 6)} partyLabels={partyLabels} asOf={asOf} />,
      isEmpty: model.pendingWork.length === 0,
    },
    {
      id: 'problemas',
      title: 'Problemas abiertos',
      weight: 'lead',
      href: issueListHref('open'),
      hrefLabel: 'Ver incidencias',
      unavailable: model.unavailable.issues,
      emptyTitle: 'Sin problemas abiertos visibles',
      emptyDescription: 'Las incidencias abiertas que pueda ver aparecerán aquí.',
      content: (
        <IssueList items={visibleIssues.slice(0, 6)} memberLabels={memberLabels} density="compact" showHeader={false} />
      ),
      isEmpty: visibleIssues.length === 0,
    },
    {
      id: 'compromisos',
      title: 'Compromisos',
      weight: 'support',
      href: '/clientes',
      hrefLabel: 'Ir a clientes',
      unavailable: model.unavailable.commitments,
      emptyTitle: 'Sin compromisos abiertos',
      emptyDescription: 'Los compromisos abiertos registrados aparecerán aquí.',
      content: (
        <div className="min-w-0 space-y-4">
          {model.commitmentsOverdue.length > 0 ? (
            <div>
              <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                Vencidos
              </p>
              <CommitmentRows items={model.commitmentsOverdue} partyLabels={partyLabels} />
            </div>
          ) : null}
          {model.commitmentsOpen.length > 0 ? (
            <div>
              {model.commitmentsOverdue.length > 0 ? (
                <p className="mb-1 px-3 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
                  Próximos
                </p>
              ) : null}
              <CommitmentRows items={model.commitmentsOpen} partyLabels={partyLabels} />
            </div>
          ) : null}
        </div>
      ),
      isEmpty: model.commitmentsOverdue.length === 0 && model.commitmentsOpen.length === 0,
    },
    {
      id: 'decisiones',
      title: 'Decisiones',
      weight: 'lead',
      href: '/aprobaciones',
      hrefLabel: 'Ver aprobaciones',
      unavailable: model.unavailable.approvals,
      emptyTitle: 'Sin decisiones pendientes',
      emptyDescription: 'Cuando alguien solicite su aprobación, aparecerá aquí.',
      content: (
        <ApprovalList
          items={model.pendingApprovals.slice(0, 6)}
          memberLabels={memberLabels}
          subjects={approvalSubjects}
          density="compact"
          showHeader={false}
        />
      ),
      isEmpty: model.pendingApprovals.length === 0,
    },
  ];

  return (
    <div className="min-w-0 space-y-4" aria-label="Colas del centro de mando">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{lensNote}</p>
      {sections.map((section) => (
        <PageSection
          key={section.id}
          card
          surface={SECTION_SURFACE[section.id]}
          className={cx('min-w-0 p-3 shadow-[var(--isalwa-shadow-soft)] md:p-4', section.weight === 'lead' && 'md:p-5')}
        >
          <SectionHeader
            title={
              section.weight === 'lead' ? (
                <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
                  {section.title}
                </h2>
              ) : (
                section.title
              )
            }
            action={destinationButton(
              section.href,
              section.hrefLabel,
              section.weight === 'lead' ? 'secondary' : 'tertiary',
            )}
            className="mb-2"
          />
          {section.unavailable ? (
            <p className="text-sm text-[var(--isalwa-slate)]" role="status">
              No disponible en este momento.
            </p>
          ) : section.isEmpty ? (
            <EmptyPanel
              compact
              title={section.emptyTitle}
              description={section.emptyDescription}
            />
          ) : (
            section.content
          )}
        </PageSection>
      ))}
    </div>
  );
}
