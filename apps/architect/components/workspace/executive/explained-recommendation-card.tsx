"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import {
  Beat,
  BeatEmpty,
  BeatList,
  BeatSubLabel,
  StoryBeats,
} from "@/components/workspace/story-beat";
import {
  confidenceBandLabelEs,
  priorityLabelEs,
  roiBandLabelEs,
  type ExplainedRecommendation,
} from "@/lib/explanations";
import { cn } from "@/lib/utils";

export function ExplainedRecommendationCard({
  explained,
  index = 0,
  compact = false,
  className,
}: {
  explained: ExplainedRecommendation;
  index?: number;
  /** Tighter summary for cockpit lists. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className={className}
    >
      <Card className={cn("h-full px-5 py-5", compact && "px-4 py-4")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {!compact ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Recomendación
              </p>
            ) : null}
            <p
              className={cn(
                "text-neutral-950",
                compact ? "text-base" : "mt-1 text-xl",
              )}
            >
              {explained.title}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              {explained.businessValue}
            </p>
          </div>
          {explained.priority ? (
            <span className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-600">
              {priorityLabelEs(explained.priority)}
            </span>
          ) : null}
        </div>

        <div
          className={cn(
            "mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-neutral-500",
            compact && "mt-3",
          )}
        >
          <span>
            ROI{" "}
            <span className="font-medium text-neutral-900">
              {roiBandLabelEs(explained.expectedRoi.band)}
            </span>
          </span>
          <span>
            Confianza{" "}
            <span className="font-medium text-neutral-900">
              {confidenceBandLabelEs(explained.confidence.band)}
            </span>
          </span>
          {explained.evidence.length > 0 ? (
            <span>
              {explained.evidence.length} evidencia
              {explained.evidence.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {/*
          Mission 8 — Executive Storytelling. Numbered 7-beat McKinsey spine:
          what happened → why it matters → the evidence → business impact →
          recommended solution → expected result → next step. Presentation
          only — every beat below maps to a field already produced by
          Mission 14's explanation engine (`lib/explanations/`); nothing is
          invented, and every list-shaped field gets an honest empty state.
        */}
        <ExecutiveDetail
          className="mt-2"
          labelExpand="Ver justificación completa"
          labelCollapse="Ocultar justificación"
        >
          <StoryBeats>
            <Beat step={1} title="Qué encontramos">
              <p>{explained.problem}</p>
            </Beat>

            <Beat step={2} title="Por qué importa">
              <p>{explained.observedPattern}</p>
            </Beat>

            <Beat
              step={3}
              title="La evidencia"
              lead="Así queda trazado en el expediente:"
            >
              {explained.evidence.length === 0 ? (
                <BeatEmpty text="Aún no hay piezas de evidencia vinculadas." />
              ) : (
                <ul className="space-y-1.5">
                  {explained.evidence.map((item, i) => (
                    <li key={`${item.source}-${item.id ?? item.label}-${i}`}>
                      <span className="text-neutral-400">
                        [{sourceLabelEs(item.source)}]
                      </span>{" "}
                      {item.quote ?? item.label}
                    </li>
                  ))}
                </ul>
              )}
              {explained.supportingFacts.length > 0 ? (
                <div className="mt-3">
                  <BeatSubLabel>Hechos de soporte</BeatSubLabel>
                  <BeatList
                    items={explained.supportingFacts}
                    className="mt-1.5 space-y-1.5"
                  />
                </div>
              ) : null}
            </Beat>

            <Beat
              step={4}
              title="Impacto en el negocio"
              lead="Esto es lo que cuesta hoy, o lo que deja sobre la mesa:"
            >
              <p>{explained.businessConsequence}</p>
              <p className="mt-2 text-neutral-600">
                {explained.businessValue}
              </p>
            </Beat>

            <Beat step={5} title="Solución recomendada">
              <p>{explained.recommendation}</p>
            </Beat>

            <Beat
              step={6}
              title="Resultado esperado"
              lead="El retorno y la confianza detrás de esta prioridad:"
            >
              <BeatSubLabel>
                ROI {roiBandLabelEs(explained.expectedRoi.band)}
              </BeatSubLabel>
              <p className="mt-1.5">{explained.expectedRoi.summary}</p>
              {explained.expectedRoi.drivers.length > 0 ? (
                <BeatList
                  items={explained.expectedRoi.drivers}
                  className="mt-1.5 space-y-1.5"
                />
              ) : null}

              <div className="mt-3">
                <BeatSubLabel>
                  Confianza {confidenceBandLabelEs(explained.confidence.band)}
                </BeatSubLabel>
                <p className="mt-1.5">{explained.confidence.summary}</p>
                {explained.confidence.factors.length > 0 ? (
                  <BeatList
                    items={explained.confidence.factors}
                    className="mt-1.5 space-y-1.5"
                  />
                ) : null}
              </div>
            </Beat>

            <Beat
              step={7}
              title="Próximo paso"
              lead="Lo que debe resolverse antes de avanzar:"
            >
              {explained.futureDependencies.length === 0 ? (
                <BeatEmpty text="Sin dependencias explícitas — puede avanzar directamente en el expediente actual." />
              ) : (
                <BeatList items={explained.futureDependencies} />
              )}
            </Beat>
          </StoryBeats>
        </ExecutiveDetail>
      </Card>
    </motion.div>
  );
}

function sourceLabelEs(source: string): string {
  const map: Record<string, string> = {
    consulting: "consultoría",
    risk: "riesgo",
    opportunity: "oportunidad",
    pattern: "patrón",
    blueprint: "blueprint",
    solution: "solución",
    process: "proceso",
    pain: "dolor",
    fact: "hecho",
    meeting: "reunión",
    knowledge: "conocimiento",
    recommendation: "recomendación",
  };
  return map[source] ?? source;
}
