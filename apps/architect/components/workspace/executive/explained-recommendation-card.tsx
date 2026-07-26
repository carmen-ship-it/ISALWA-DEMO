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
          labelExpand="Ver justificación completa"
          labelCollapse="Ocultar justificación"
        >
          <ExplanationSection title="Problema" body={explained.problem} />
          <ExplanationSection
            title="Patrón observado"
            body={explained.observedPattern}
          />
          <ExplanationSection
            title="Consecuencia de negocio"
            body={explained.businessConsequence}
          />
          <ExplanationSection
            title="Recomendación"
            body={explained.recommendation}
          />
          <ExplanationSection
            title="ROI esperado"
            body={explained.expectedRoi.summary}
          >
            {explained.expectedRoi.drivers.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {explained.expectedRoi.drivers.map((driver) => (
                  <li key={driver} className="text-sm text-neutral-700">
                    • {driver}
                  </li>
                ))}
              </ul>
            ) : null}
          </ExplanationSection>
          <ExplanationSection
            title="Confianza"
            body={explained.confidence.summary}
          >
            {explained.confidence.factors.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {explained.confidence.factors.map((factor) => (
                  <li key={factor} className="text-sm text-neutral-700">
                    • {factor}
                  </li>
                ))}
              </ul>
            ) : null}
          </ExplanationSection>
          <ExplanationSection title="Valor de negocio" body={explained.businessValue} />

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
              Evidencia
            </p>
            {explained.evidence.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Aún no hay piezas de evidencia vinculadas.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {explained.evidence.map((item, i) => (
                  <li
                    key={`${item.source}-${item.id ?? item.label}-${i}`}
                    className="text-sm text-neutral-700"
                  >
                    <span className="text-neutral-400">
                      [{sourceLabelEs(item.source)}]
                    </span>{" "}
                    {item.quote ?? item.label}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
              Hechos de soporte
            </p>
            {explained.supportingFacts.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Los hechos de soporte aparecerán con más discovery.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {explained.supportingFacts.map((fact) => (
                  <li key={fact} className="text-sm text-neutral-700">
                    • {fact}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
              Dependencias futuras
            </p>
            {explained.futureDependencies.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500">
                Sin dependencias explícitas en el expediente actual.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {explained.futureDependencies.map((dep) => (
                  <li key={dep} className="text-sm text-neutral-700">
                    • {dep}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ExecutiveDetail>
      </Card>
    </motion.div>
  );
}

function ExplanationSection({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <p className="mt-2 text-sm text-neutral-700">{body}</p>
      {children}
    </div>
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
