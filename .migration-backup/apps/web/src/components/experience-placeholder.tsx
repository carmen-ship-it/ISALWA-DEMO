import { Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';

type ExperienceHref =
  | '/radar'
  | '/personas'
  | '/territorio'
  | '/senal'
  | '/cierre'
  | '/memoria';

export function ExperiencePlaceholder({
  active,
  title,
  body,
}: {
  active: ExperienceHref;
  title: string;
  body: string;
}) {
  return (
    <AppShell active={active}>
      <main className="px-5 py-8 md:px-8">
        <Panel className="max-w-2xl p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[var(--isalwa-text-xl)] font-semibold">{title}</h1>
            <StatusPill tone="info">Próximo milestone</StatusPill>
          </div>
          <p className="mt-3 text-[var(--isalwa-slate)]">{body}</p>
        </Panel>
      </main>
    </AppShell>
  );
}
