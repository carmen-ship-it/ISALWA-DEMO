import { PageSection } from '@isalwa/ui';
import type { ManagementExceptionCard, ManagementLensModel } from '@/lib/management/exceptions';
import { t } from '@/lib/i18n/es';

type InicioManagementLensProps = {
  model: ManagementLensModel;
  /**
   * Destination chrome already provided by the page header (Excepciones nav).
   * Avoids a second Inicio-style title block above the same facts.
   */
  destination?: boolean;
};

function cardLine(card: ManagementExceptionCard): string {
  return [card.waitingOn, card.handledBy, card.attention].filter(Boolean).join(' · ');
}

/**
 * Management exceptions as one command surface — not an equal-weight card grid.
 * Owner lane leads; waiting / stalled sit as subordinate strips beneath.
 */
export function InicioManagementLens({ model, destination = false }: InicioManagementLensProps) {
  const cards = model.canReadOrg ? model.cards : null;
  const ownerLane = model.lanes.find((lane) => lane.id === 'owner');
  const secondaryLanes = model.lanes.filter((lane) => lane.id !== 'owner');
  const hasRecordedCards = Boolean(cards && cards.length > 0);

  return (
    <section aria-label={t('pages.inicio.managementTitle')} className="min-w-0 space-y-4">
      {destination ? null : (
        <div>
          <p className="isalwa-kicker">{t('pages.inicio.managementKicker')}</p>
          <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
            {t('pages.inicio.managementTitle')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {model.canReadOrg ? t('pages.inicio.managementDescription') : model.orgFiguresHidden}
          </p>
        </div>
      )}

      <PageSection
        card
        surface="active"
        className="min-w-0 overflow-hidden p-0 shadow-[var(--isalwa-shadow-soft)]"
        aria-label={t('pages.inicio.managementTitle')}
      >
        {ownerLane ? (
          <div className="px-5 py-5 md:px-6 md:py-6">
            <p className="isalwa-section-label">{ownerLane.label}</p>
            {hasRecordedCards ? (
              <ul className="mt-3 space-y-2">
                {cards!.map((card) => (
                  <li key={card.id} className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
                    {card.handledBy}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs leading-relaxed text-[var(--isalwa-slate)]" role="status">
                {model.ownerEmpty}
              </p>
            )}
          </div>
        ) : null}

        {secondaryLanes.length > 0 ? (
          <div className="grid min-w-0 grid-cols-1 divide-y divide-[var(--isalwa-mist)] border-t border-[var(--isalwa-mist)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {secondaryLanes.map((lane) => {
              const labels = model.labels.filter((item) => item.lane === lane.id);
              return (
                <div key={lane.id} className="min-w-0 px-5 py-5 md:px-6 md:py-6" aria-label={lane.label}>
                  <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{lane.label}</h3>
                  <ul className="mt-3 space-y-3">
                    {labels.map((item) => {
                      const recorded = cards?.filter((card) => card.exceptionId === item.id) ?? [];
                      return (
                        <li key={item.id}>
                          <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
                          {recorded.length > 0 ? (
                            <ul className="mt-1 space-y-1">
                              {recorded.map((card) => (
                                <li
                                  key={card.id}
                                  className="text-sm leading-relaxed text-[var(--isalwa-slate)]"
                                >
                                  {cardLine(card)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p
                              className="mt-0.5 text-xs leading-relaxed text-[color-mix(in_srgb,var(--isalwa-slate)_78%,transparent)]"
                              role="status"
                            >
                              {model.noRecord}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}
      </PageSection>

      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]" role="status">
        {model.canReadOrg
          ? hasRecordedCards
            ? t('pages.inicio.managementDescription')
            : model.emptyMessage
          : model.orgFiguresHidden}
      </p>
    </section>
  );
}

