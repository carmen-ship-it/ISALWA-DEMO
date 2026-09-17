import { Panel, SectionHeader } from '@isalwa/ui';
import type { PatternInsightCard } from '@/lib/anticipation/pattern-insights';
import { PATTERN_INSIGHT_COPY } from '@/lib/anticipation/pattern-insights';

type PatternInsightNoteProps = {
  insight: PatternInsightCard;
};

export function PatternInsightNote({ insight }: PatternInsightNoteProps) {
  return (
    <Panel>
      <SectionHeader kicker={PATTERN_INSIGHT_COPY.sectionKicker} title={insight.message} />
      <a href={insight.href} className="mt-2 inline-block text-sm font-medium text-[var(--isalwa-glaze)] hover:underline">
        {insight.ctaLabel}
      </a>
    </Panel>
  );
}
