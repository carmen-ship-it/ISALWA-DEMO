import type { ReactNode } from 'react';
import { PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { ESCALATION_COPY } from '@/lib/escalation/copy';
import { hasEscalationContent } from '@/lib/escalation/derive';
import type { EscalationGuidance, EscalationStage } from '@/lib/escalation/types';

type EscalationGuidancePanelProps = {
  guidance: EscalationGuidance;
  /** Drop the outer card when a host already has a section. */
  embedded?: boolean;
};

export function EscalationGuidancePanel({ guidance, embedded = false }: EscalationGuidancePanelProps) {
  if (!hasEscalationContent(guidance)) return null;

  const body = (
    <>
      <SectionHeader
        kicker={ESCALATION_COPY.panelLabel}
        title={ESCALATION_COPY.panelTitle}
        className="mb-3"
        action={
          guidance.stage && guidance.stageLabel ? (
            <StatusPill tone={stageTone(guidance.stage)}>{guidance.stageLabel}</StatusPill>
          ) : null
        }
      />
      <div className="space-y-4">
        {guidance.blockers.length > 0 ? (
          <FactList label={ESCALATION_COPY.blockedBy}>
            {guidance.blockers.map((blocker) => (
              <li key={blocker.code}>
                <p className="font-medium text-[var(--isalwa-kiln)]">{blocker.label}</p>
                <p className="text-[var(--isalwa-slate)]">{blocker.detail}</p>
              </li>
            ))}
          </FactList>
        ) : null}
        {guidance.mayAffect.length > 0 ? (
          <FactList label={ESCALATION_COPY.mayAffect}>
            {guidance.mayAffect.map((impact) => (
              <li key={impact.code} className="text-[var(--isalwa-kiln)]">
                {impact.label}
              </li>
            ))}
          </FactList>
        ) : null}
        {guidance.relatedPeople.length > 0 ? (
          <FactList label={ESCALATION_COPY.relatedPeople}>
            {guidance.relatedPeople.map((person) => (
              <li key={person.memberId}>
                <p className="text-[var(--isalwa-kiln)]">{person.displayName}</p>
                <p className="text-[var(--isalwa-slate)]">{person.roleLabel}</p>
              </li>
            ))}
          </FactList>
        ) : null}
        {guidance.rungs.length > 0 ? (
          <section aria-label={ESCALATION_COPY.whoToTalkTo}>
            <h3 className="text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              {ESCALATION_COPY.whoToTalkTo}
            </h3>
            <ol className="mt-2 space-y-2">
              {guidance.rungs.map((rung) => (
                <li key={rung.order} className="text-sm leading-relaxed">
                  <p className={rung.active ? 'font-medium text-[var(--isalwa-kiln)]' : 'text-[var(--isalwa-slate)]'}>
                    {rung.order}. {rung.title}
                  </p>
                  <p className="text-[var(--isalwa-slate)]">{rung.detail}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {guidance.notes.map((note) => (
          <p key={note} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {note}
          </p>
        ))}
        {guidance.awarenessNote ? (
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{guidance.awarenessNote}</p>
        ) : null}
      </div>
    </>
  );

  if (embedded) {
    return <div aria-label={ESCALATION_COPY.panelLabel}>{body}</div>;
  }

  return (
    <PageSection card className="p-4 md:p-6" aria-label={ESCALATION_COPY.panelLabel}>
      {body}
    </PageSection>
  );
}

export function EscalationGuidanceList({
  items,
  embedded = false,
}: {
  items: readonly EscalationGuidance[];
  embedded?: boolean;
}) {
  const visible = items.filter(hasEscalationContent);
  if (visible.length === 0) return null;
  return (
    <div className="space-y-4">
      {visible.map((guidance) => (
        <EscalationGuidancePanel key={guidance.listKey} guidance={guidance} embedded={embedded} />
      ))}
    </div>
  );
}

function FactList({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <h3 className="text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">{label}</h3>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed">{children}</ul>
    </section>
  );
}

function stageTone(stage: EscalationStage): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (stage) {
    case 'overdue':
      return 'danger';
    case 'needs_attention':
    case 'recorded':
      return 'warning';
    case 'suggested':
      return 'info';
    default:
      return 'neutral';
  }
}
