import Link from 'next/link';
import { PageSection, SectionHeader } from '@isalwa/ui';
import type {
  AttentionItemReadModel,
  QuoteSummaryReadModel,
  WorkSummaryReadModel,
} from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import { deriveAgingFacts, workAgingInput } from '@/lib/work/aging/derive';
import type { ApprovalAgingSource, CommitmentAgingAdapter } from '@/lib/work/aging/types';
import { supplementalAgingGroups } from '@/lib/work/aging/present';
import { groupInicioAttention } from '@/lib/work/inicio-attention';
import { AttentionList, FactualDueList } from '@/components/work/attention-list';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type InicioAttentionPanelProps = {
  items: AttentionItemReadModel[];
  subjects?: Map<string, string>;
  unavailable?: boolean;
  hasMore?: boolean;
  work?: readonly WorkSummaryReadModel[];
  approvals?: readonly ApprovalAgingSource[];
  quotes?: readonly QuoteSummaryReadModel[];
  commitments?: CommitmentAgingAdapter | null;
  asOf?: Date;
};

export function InicioAttentionPanel({
  items,
  subjects,
  unavailable = false,
  hasMore = false,
  work,
  approvals,
  quotes,
  commitments,
  asOf,
}: InicioAttentionPanelProps) {
  const clock = asOf ?? new Date();
  const groups = groupInicioAttention(items);

  if (unavailable) {
    return (
      <div aria-label={t('pages.inicio.attention')} data-tour={TOUR_TARGET.homeAttention}>
        <SectionHeader title={t('pages.inicio.attention')} />
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {t('pages.inicio.attentionUnavailable')}
        </p>
      </div>
    );
  }

  const facts = deriveAgingFacts({
    work: work?.map(workAgingInput),
    approvals,
    quotes,
    commitments,
    asOf: clock,
  });
  const dueTodayByWorkId = new Map<string, string>();
  const approvalAges = new Map<string, string>();
  for (const fact of facts) {
    if (fact.kind === 'due_today' && fact.issueId?.startsWith('work:')) {
      dueTodayByWorkId.set(fact.issueId.slice('work:'.length), fact.label);
    }
    if (fact.kind === 'approval_pending' && fact.issueId?.startsWith('approval:')) {
      approvalAges.set(fact.issueId.slice('approval:'.length), fact.label);
    }
  }
  const extraGroups = supplementalAgingGroups(facts, items);

  if (groups.length === 0 && extraGroups.length === 0) return null;

  return (
    <PageSection
      card
      surface="active"
      className="border-[color-mix(in_srgb,var(--isalwa-glaze)_18%,var(--isalwa-mist))] p-3 shadow-[var(--isalwa-shadow-resting)] md:p-4"
      aria-label={t('pages.inicio.attention')}
      data-tour={TOUR_TARGET.homeAttention}
    >
      <SectionHeader
        kicker="Ahora"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
            {t('pages.inicio.attention')}
          </h2>
        }
        className="mb-2"
      />
      <div>
        {groups.map((group, index) => (
          <div
            key={group.id}
            className={index === 0 ? undefined : 'mt-3 border-t border-[var(--isalwa-mist)] pt-3'}
          >
            <h3 className="mb-0.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
              {group.title}
            </h3>
            <AttentionList
              items={group.items}
              subjects={subjects}
              compact
              density="compact"
              asOf={clock}
              dueTodayByWorkId={dueTodayByWorkId}
              approvalAges={approvalAges}
            />
          </div>
        ))}
        {extraGroups.map((group, index) => (
          <div
            key={group.id}
            className={
              groups.length === 0 && index === 0
                ? undefined
                : 'mt-3 border-t border-[var(--isalwa-mist)] pt-3'
            }
          >
            <h3 className="mb-0.5 text-[10px] font-semibold tracking-[0.1em] text-[var(--isalwa-slate)] uppercase">
              {group.title}
            </h3>
            <FactualDueList facts={group.facts} label={group.title} density="compact" />
          </div>
        ))}
      </div>
      {hasMore ? (
        <p className="mt-2.5 text-sm text-[var(--isalwa-slate)]">
          {t('pages.inicio.attentionMore')}{' '}
          <Link href="/trabajo" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            {t('states.viewWork')}
          </Link>
        </p>
      ) : null}
    </PageSection>
  );
}
