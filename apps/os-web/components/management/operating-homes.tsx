import Link from 'next/link';
import { EmptyState, OperatingRow, PageSection, Skeleton } from '@isalwa/ui';
import { AccessDeniedState } from '@/components/states/app-states';
import type { OperatingHomesModel, RoleHome, RoleQueue } from '@/lib/roles/homes';
import { NO_RECORD } from '@/lib/roles/queues';
import { SystemControlsHome } from '@/components/management/system-controls-home';
import { t } from '@/lib/i18n/es';

type OperatingHomesProps = {
  model: OperatingHomesModel;
};

function QueueBlock({ queue }: { queue: RoleQueue }) {
  if (queue.items.length === 0) {
    return (
      <div className="mt-3">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{queue.title}</h3>
        <EmptyState className="mt-2" title={NO_RECORD} description={queue.empty} />
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
  const action = home.nextAction ? (
    <Link href={home.nextAction.href} className="text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
      {home.nextAction.label}
    </Link>
  ) : null;
  return (
    <section aria-label={home.title} className="min-w-0 space-y-4">
      <div>
        <p className="isalwa-kicker">{home.kicker}</p>
        <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-2xl italic text-[var(--isalwa-kiln)]">
          {home.title}
        </h2>
        <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">{home.question}</p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{home.description}</p>
        {action ? <p className="mt-3">{action}</p> : null}
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
