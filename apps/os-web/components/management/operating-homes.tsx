import Link from 'next/link';
import { EmptyState, OperatingRow, PageSection, Skeleton } from '@isalwa/ui';
import { AccessDeniedState } from '@/components/states/app-states';
import type { OperatingHomesModel, RoleAction, RoleHome, RoleQueue } from '@/lib/roles/homes';
import { NO_RECORD } from '@/lib/roles/queues';
import { SystemControlsHome } from '@/components/management/system-controls-home';
import { t } from '@/lib/i18n/es';

type OperatingHomesProps = {
  model: OperatingHomesModel;
};

function DeskLink({ action }: { action: RoleAction }) {
  return (
    <Link href={action.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
      {action.label}
    </Link>
  );
}

function QueueBlock({ queue }: { queue: RoleQueue }) {
  const desk = queue.deskHref ? (
    <Link href={queue.deskHref} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
      Abrir la mesa
    </Link>
  ) : null;
  if (queue.items.length === 0 && queue.unavailable) {
    return (
      <div className="mt-3">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{queue.title}</h3>
        <EmptyState className="mt-2" title="No disponible" description={queue.unavailable} action={desk} />
      </div>
    );
  }
  if (queue.items.length === 0) {
    return (
      <div className="mt-3">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{queue.title}</h3>
        <EmptyState className="mt-2" title={NO_RECORD} description={queue.empty} action={desk} />
      </div>
    );
  }
  return (
    <div className="mt-3">
      <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{queue.title}</h3>
      <ul className="mt-2" aria-label={queue.title}>
        {queue.items.map((item) => (
          <li key={item.id}>
            <OperatingRow
              href={item.href ?? undefined}
              subject={item.subject}
              meta={item.href ? item.meta : item.unmounted}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HomeBlock({ home }: { home: RoleHome }) {
  const actions = [
    ...(home.nextAction ? [home.nextAction] : []),
    ...home.actions.filter((entry) => entry.href !== home.nextAction?.href),
  ];
  return (
    <section aria-label={home.title} className="min-w-0 space-y-4">
      <div>
        <p className="isalwa-kicker">{home.kicker}</p>
        <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
          {home.title}
        </h2>
        <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">{home.question}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{home.description}</p>
        {actions.length > 0 ? (
          <p className="mt-3 flex flex-wrap gap-4">
            {actions.map((entry) => (
              <DeskLink key={entry.href} action={entry} />
            ))}
          </p>
        ) : null}
      </div>
      <PageSection card className="min-w-0 p-5 md:p-6">
        {home.queues.map((queue) => (
          <QueueBlock key={queue.id} queue={queue} />
        ))}
      </PageSection>
    </section>
  );
}

export function OperatingHomes({ model }: OperatingHomesProps) {
  if (model.status === 'loading') {
    return (
      <PageSection card className="space-y-3 p-5 md:p-6" aria-busy="true">
        <p className="text-sm text-[var(--isalwa-slate)]" role="status">
          {t('states.loading')}
        </p>
        <Skeleton h={18} className="w-40" />
        <Skeleton h={48} className="w-full" />
      </PageSection>
    );
  }
  if (model.denial === 'capabilities-unavailable') {
    return (
      <PageSection card className="min-w-0 p-5 md:p-6">
        <EmptyState title="No disponible" description="Esta lectura no está disponible." />
      </PageSection>
    );
  }
  if (model.status === 'denied') {
    return <AccessDeniedState />;
  }
  if (model.businessHomes.length === 0 && !model.systemControls) return null;
  return (
    <div className="min-w-0 space-y-10">
      {model.businessHomes.map((home) => (
        <HomeBlock key={home.id} home={home} />
      ))}
      {model.systemControls ? <SystemControlsHome controls={model.systemControls} /> : null}
    </div>
  );
}
