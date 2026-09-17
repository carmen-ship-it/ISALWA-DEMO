import { Panel, SectionHeader } from '@isalwa/ui';
import { quickstartForRole, type RoleQuickstart } from '@/lib/walkthrough/quickstart';

type RoleQuickstartPanelProps = {
  roleKey: string | null | undefined;
  quickstart?: RoleQuickstart | null;
};

export function RoleQuickstartPanel({ roleKey, quickstart }: RoleQuickstartPanelProps) {
  const guide = quickstart ?? quickstartForRole(roleKey);
  if (!guide) return null;

  return (
    <Panel>
      <SectionHeader kicker="Capacitación" title={guide.title} />
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--isalwa-slate)]">
        {guide.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </Panel>
  );
}
