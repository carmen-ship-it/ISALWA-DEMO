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
  const emptyCtas = inicioAttentionEmptyCtas();

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

  if (groups.length === 0) {
    return (
      <div aria-label={t('pages.inicio.attention')}>
        <SectionHeader title={t('pages.inicio.attention')} />
        <EmptyState
          title={inicioAttentionEmptyMessage()}
          description="Aquí aparece el trabajo, las reasignaciones y las aprobaciones que dependen de usted. Puede continuar en Trabajo o en Clientes."
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
      </div>
    );
  }

  return (
    <PageSection card className="p-5 md:p-6" aria-label={t('pages.inicio.attention')}>
      <SectionHeader title={t('pages.inicio.attention')} />
      <div>
        {groups.map((group, index) => (
          <div
            key={group.id}
            className={index === 0 ? undefined : 'mt-8 border-t border-[var(--isalwa-mist)] pt-8'}
          >
            <h3 className="mb-3 text-sm font-medium text-[var(--isalwa-kiln)]">{group.title}</h3>
            <AttentionList items={group.items} subjects={subjects} compact />
          </div>
        ))}
      </div>
      {hasMore ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          {t('pages.inicio.attentionMore')}{' '}
          <Link href="/trabajo" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
            {t('states.viewWork')}
          </Link>
        </p>
      ) : null}
    </PageSection>
  );
}
