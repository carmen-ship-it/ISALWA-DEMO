import Link from 'next/link';
import { Button, PageSection } from '@isalwa/ui';
import type { ManagementInsight } from '@/lib/management/improvement-insights';

type ManagementInsightsPanelProps = {
  title: string;
  kicker: string;
  insights: ManagementInsight[];
};

export function ManagementInsightsPanel({ title, kicker, insights }: ManagementInsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <section aria-label={title} className="min-w-0 space-y-3">
      <div>
        <p className="isalwa-kicker">{kicker}</p>
        <h2 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          {title}
        </h2>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <PageSection key={insight.id} card className="flex h-full flex-col justify-between p-4">
            <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{insight.message}</p>
            <div className="mt-4">
              <Link href={insight.href} className="inline-flex">
                <Button type="button" variant="secondary" size="sm">
                  {insight.cta}
                </Button>
              </Link>
            </div>
          </PageSection>
        ))}
      </div>
    </section>
  );
}
