"use client";

import { ExplainedRecommendationCard } from "@/components/workspace/executive/explained-recommendation-card";
import { useTranslations } from "@/lib/i18n";
import type { ExplainedRecommendation } from "@/lib/explanations";

export function ModuleInsightCards({
  recommendations,
}: {
  recommendations: ExplainedRecommendation[];
}) {
  const { t } = useTranslations();
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/80">
        {t("moduleInsightCards.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("moduleInsightCards.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {t("moduleInsightCards.title")}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {recommendations.map((rec, i) => (
          <ExplainedRecommendationCard
            key={rec.id}
            explained={rec}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
