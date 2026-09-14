import Link from 'next/link';
import { PageSection, SectionHeader } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import { groupInicioAttention } from '@/lib/work/inicio-attention';
import { AttentionList } from '@/components/work/attention-list';

type InicioAttentionPanelProps = {
  items: AttentionItemReadModel[];
  subjects?: Map<string, string>;
  unavailable?: boolean;
  hasMore?: boolean;
};

export function InicioAttentionPanel({
  items,
  subjects,
  unavailable = false,
  hasMore = false,
}: InicioAttentionPanelProps) {
  const groups = groupInicioAttention(items);

  if (unavailable) {
    return (
      <div aria-label={t('pages.inicio.attention')}>
        <SectionHeader title={t('pages.inicio.attention')} />
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {t('pages.inicio.attentionUnavailable')}
        </p>
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <PageSection card className="p-3 md:p-4" aria-label={t('pages.inicio.attention')}>
      <SectionHeader title={t('pages.inicio.attention')} className="mb-2" />
      <div>
        {groups.map((group, index) => (
          <div
            key={group.id}
            className={index === 0 ? undefined : 'mt-4 border-t border-[var(--isalwa-mist)] pt-4'}
          >
            <h3 className="mb-1 text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              {group.title}
            </h3>
            <AttentionList items={group.items} subjects={subjects} compact />
          </div>
        ))}
      </div>
      {hasMore ? (
        <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
          {t('pages.inicio.attentionMore')}{' '}
          <Link href="/trabajo" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            {t('states.viewWork')}
          </Link>
        </p>
      ) : null}
    </PageSection>
  );
}
