import { PageSection } from '@isalwa/ui';
import type { ManagementExceptionCard, ManagementLensModel } from '@/lib/management/exceptions';
import { t } from '@/lib/i18n/es';

type InicioManagementLensProps = {
  model: ManagementLensModel;
};

function cardLine(card: ManagementExceptionCard): string {
  return [card.waitingOn, card.handledBy, card.attention].filter(Boolean).join(' · ');
}

export function InicioManagementLens({ model }: InicioManagementLensProps) {
  const cards = model.canReadOrg ? model.cards : null;

  return (
    <section aria-label={t('pages.inicio.managementTitle')} className="min-w-0 space-y-4">
      <div>
        <p className="isalwa-kicker">{t('pages.inicio.managementKicker')}</p>
        <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
          {t('pages.inicio.managementTitle')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {model.canReadOrg ? t('pages.inicio.managementDescription') : model.orgFiguresHidden}
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {model.lanes.map((lane) => {
          const labels = model.labels.filter((item) => item.lane === lane.id);
          return (
            <PageSection key={lane.id} card className="min-w-0 p-5 md:p-6" aria-label={lane.label}>
              <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{lane.label}</h3>
              {lane.id === 'owner' ? (
                cards && cards.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {cards.map((card) => (
                      <li key={card.id} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                        {card.handledBy}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
                    {model.ownerEmpty}
                  </p>
                )
              ) : (
                <ul className="mt-3 space-y-3">
                  {labels.map((item) => {
                    const recorded = cards?.filter((card) => card.exceptionId === item.id) ?? [];
                    return (
                      <li key={item.id}>
                        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
                        {recorded.length > 0 ? (
                          <ul className="mt-1 space-y-1">
                            {recorded.map((card) => (
                              <li key={card.id} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                                {cardLine(card)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-0.5 text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
                            {model.noRecord}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </PageSection>
          );
        })}
      </div>

      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
        {model.canReadOrg ? model.emptyMessage : model.orgFiguresHidden}
      </p>
    </section>
  );
}
