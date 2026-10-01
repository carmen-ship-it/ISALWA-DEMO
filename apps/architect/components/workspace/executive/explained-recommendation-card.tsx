"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import {
  confidenceBandLabelEs,
  priorityLabelEs,
  roiBandLabelEs,
  type ExplainedRecommendation,
} from "@/lib/explanations";
import { cn } from "@/lib/utils";

/**
 * Mission "Executive Storytelling" — presentation only.
 *
 * Every recommendation is told as a McKinsey-style story with a fixed spine:
 * Qué encontramos (what happened) → Por qué importa (why) → La evidencia →
 * Impacto en el negocio → Solución recomendada → Resultado esperado → Próximo paso.
 *
 * The spine renders the SAME `ExplainedRecommendation` fields produced by
 * `lib/explanations/` (Mission 14). No new facts, scores, or copy are invented
 * here — only structure, sequencing, and Spanish connective tissue between beats.
 * When an underlying list is empty, the beat says so honestly instead of hiding
 * or fabricating content.
 */
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

        <ExecutiveDetail
          className="mt-2"
          labelExpand="Ver la historia completa"
          labelCollapse="Ocultar la historia"
        >
          <ol className="space-y-5">
            <StoryBeat step={1} title="Qué encontramos">
              <p>{explained.problem}</p>
            </StoryBeat>

            <StoryBeat
              step={2}
              title="Por qué importa"
              lead="El patrón detrás del hallazgo:"
            >
              <p>{explained.observedPattern}</p>
            </StoryBeat>

            <StoryBeat
              step={3}
              title="La evidencia"
              lead="No es una opinión — así se documentó en el expediente:"
            >
              {explained.evidence.length === 0 ? (
                <EmptyBeat text="Aún no hay piezas de evidencia vinculadas a esta recomendación." />
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                    Hechos de soporte
                  </p>
                  <ul className="mt-1.5 space-y-1.5">
                    {explained.supportingFacts.map((fact) => (
                      <li key={fact}>• {fact}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </StoryBeat>

            <StoryBeat
              step={4}
              title="Impacto en el negocio"
              lead="Esto es lo que está en juego:"
            >
              <p>{explained.businessConsequence}</p>
              <p className="mt-2">{explained.businessValue}</p>
            </StoryBeat>

            <StoryBeat step={5} title="Solución recomendada">
              <p>{explained.recommendation}</p>
            </StoryBeat>

            <StoryBeat
              step={6}
              title="Resultado esperado"
              lead="Así medimos el retorno y qué tan firme es la evidencia:"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                  ROI {roiBandLabelEs(explained.expectedRoi.band)}
                </span>
              </div>
              <p className="mt-1.5">{explained.expectedRoi.summary}</p>
              {explained.expectedRoi.drivers.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {explained.expectedRoi.drivers.map((driver) => (
                    <li key={driver}>• {driver}</li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-4 border-t border-neutral-100 pt-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                  Confianza {confidenceBandLabelEs(explained.confidence.band)}
                </span>
                <p className="mt-1.5">{explained.confidence.summary}</p>
                {explained.confidence.factors.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {explained.confidence.factors.map((factor) => (
                      <li key={factor}>• {factor}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </StoryBeat>

            <StoryBeat
              step={7}
              title="Próximo paso"
              lead="Para avanzar, esto debe resolverse primero:"
            >
              {explained.futureDependencies.length === 0 ? (
                <EmptyBeat text="Sin dependencias explícitas en el expediente — puede avanzar directamente con el equipo responsable." />
              ) : (
                <ul className="space-y-1.5">
                  {explained.futureDependencies.map((dep) => (
                    <li key={dep}>• {dep}</li>
                  ))}
                </ul>
              )}
            </StoryBeat>
          </ol>
        </ExecutiveDetail>
      </Card>
    </motion.div>
  );
}

function StoryBeat({
  step,
  title,
  lead,
  children,
}: {
  step: number;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-300 text-[11px] font-medium text-neutral-500"
      >
        {step}
      </span>
      <div className="min-w-0 flex-1 border-b border-neutral-100 pb-5 last:border-b-0 last:pb-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          {title}
        </p>
        {lead ? (
          <p className="mt-1.5 text-xs italic text-neutral-400">{lead}</p>
        ) : null}
        <div className="mt-2 space-y-0 text-sm leading-relaxed text-neutral-700">
          {children}
        </div>
      </div>
    </li>
  );
}

function EmptyBeat({ text }: { text: string }) {
  return <p className="text-neutral-500">{text}</p>;
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
