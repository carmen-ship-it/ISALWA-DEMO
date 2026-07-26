"use client";

import { ExplainedRecommendationCard } from "@/components/workspace/executive/explained-recommendation-card";
import type { ExplainedRecommendation } from "@/lib/explanations";

export function ReasoningCards({
  recommendations,
}: {
  recommendations: ExplainedRecommendation[];
}) {
  if (recommendations.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/80">
        La justificación aparece cuando las recomendaciones tienen evidencia.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Por qué recomendamos esto
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          Evidencia antes que opinión.
        </h3>
      </div>

      <div className="space-y-4">
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
