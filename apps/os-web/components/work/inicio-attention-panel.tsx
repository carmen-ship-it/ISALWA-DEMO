import Link from 'next/link';
import { Button, EmptyState, PageSection, SectionHeader } from '@isalwa/ui';
import type { AttentionItemReadModel } from '@isalwa/os-contracts';
import { t } from '@/lib/i18n/es';
import {
  groupInicioAttention,
  inicioAttentionEmptyCtas,
  inicioAttentionEmptyMessage,
} from '@/lib/work/inicio-attention';
import { AttentionList } from '@/components/work/attention-list';

type InicioAttentionPanelProps = {
  items: AttentionItemReadModel[];
  unavailable?: boolean;
  hasMore?: boolean;
};

export function InicioAttentionPanel({
  items,
  unavailable = false,
  hasMore = false,
}: InicioAttentionPanelProps) {
  const groups = groupInicioAttention(items);
  const emptyCtas = inicioAttentionEmptyCtas();

  return (
    <PageSection card className="p-4" aria-label={t('pages.inicio.attention')}>
      <SectionHeader title={t('pages.inicio.attention')} />

      {unavailable ? (
        <p className="px-2 text-sm text-[var(--isalwa-slate)]" role="status">
          {t('pages.inicio.attentionUnavailable')}
        </p>
      ) : groups.length === 0 ? (
        <EmptyState
          title={inicioAttentionEmptyMessage()}
          action={
            <div className="flex flex-wrap gap-3">
              {emptyCtas.map((cta) => (
                <Link key={cta.href} href={cta.href} className="inline-flex">
                  <Button type="button" variant={cta.href === '/trabajo' ? 'primary' : 'secondary'}>
                    {cta.label}
                  </Button>
                </Link>
              ))}
            </div>
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.id}>
              <h3 className="mb-2 px-1 text-sm font-medium text-[var(--isalwa-kiln)]">
                {group.title}
              </h3>
              <AttentionList items={group.items} compact />
            </div>
          ))}
          {hasMore ? (
            <p className="px-2 text-sm text-[var(--isalwa-slate)]">
              {t('pages.inicio.attentionMore')}{' '}
              <Link href="/trabajo" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
                {t('states.viewWork')}
              </Link>
            </p>
          ) : null}
        </div>
      )}
    </PageSection>
  );
}
