"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Clock,
  Compass,
  Eye,
  Network,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { formatTimelineDate } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import type {
  BusinessDnaTrait,
  ExecutiveInsights,
  InsightEvidence,
} from "@/lib/insights";

const STRENGTH_DOT: Record<BusinessDnaTrait["strength"], string> = {
  alta: "bg-emerald-500",
  media: "bg-amber-500",
  baja: "bg-rose-500",
  emergente: "bg-neutral-300",
};

const RISK_DOT: Record<"alta" | "media" | "baja", string> = {
  alta: "bg-rose-500",
  media: "bg-amber-500",
  baja: "bg-emerald-500",
};

function GroupHeader({
  icon: Icon,
  kicker,
  title,
  description,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
          {kicker}
        </p>
        <h3 className="architect-serif mt-1.5 text-2xl leading-tight text-neutral-950">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-4 py-3 text-sm text-neutral-500">
      {children}
    </p>
  );
}

function EvidenceList({ evidence }: { evidence: InsightEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {evidence.map((item, i) => (
        <li key={`${item.kind}-${item.id}-${i}`} className="text-sm text-neutral-600">
          <span className="text-neutral-400">— </span>
          {item.quote ?? item.label}
        </li>
      ))}
    </ul>
  );
}

export function ExecutiveInsightsPanel({
  insights,
}: {
  insights: ExecutiveInsights;
}) {
  if (insights.isEarlyStage) {
    return (
      <Card className="px-6 py-8 text-center">
        <p className="architect-serif text-2xl text-neutral-950">
          Las perspectivas ejecutivas aparecen con la primera evidencia.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600">
          Continúe el diagnóstico o suba conocimiento del negocio — en cuanto
          haya hechos y hallazgos, esta área se llena con observaciones
          respaldadas, nunca con relleno genérico.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Business DNA */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Brain}
          kicker="ADN del negocio"
          title="Cómo se comporta esta empresa"
          description="Siete rasgos deducidos de la evidencia recogida — nunca supuestos genéricos de industria."
        />
        {insights.businessDna.length === 0 ? (
          <EmptyNote>
            Aún no hay suficiente evidencia para describir el ADN del negocio.
          </EmptyNote>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {insights.businessDna.map((trait) => (
              <div
                key={trait.id}
                className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">
                    {trait.label}
                  </p>
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        STRENGTH_DOT[trait.strength],
                      )}
                      aria-hidden
                    />
                    {trait.strength}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {trait.observation}
                </p>
                <EvidenceList evidence={trait.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Business Blind Spots */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Eye}
          kicker="Puntos ciegos"
          title="Lo que la empresa probablemente no ve"
          description="No son riesgos ni recomendaciones — son cosas que probablemente nadie ha nombrado todavía."
        />
        {insights.blindSpots.length === 0 ? (
          <EmptyNote>
            Por ahora no detectamos puntos ciegos claros con la evidencia disponible.
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.blindSpots.map((spot) => (
              <div
                key={spot.id}
                className="rounded-2xl border border-violet-100/80 bg-violet-50/40 px-4 py-4"
              >
                <p className="text-sm font-medium text-neutral-900">{spot.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">
                  {spot.observation}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.1em] text-neutral-400">
                  Por qué importa
                </p>
                <p className="mt-1 text-sm text-neutral-600">{spot.whyItMatters}</p>
                <EvidenceList evidence={spot.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Who Should We Talk To Next */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Users}
          kicker="Próxima conversación"
          title="¿Con quién deberíamos hablar ahora?"
          description="La persona (o el rol) que puede cerrar el vacío de evidencia más grande hoy."
        />
        {insights.nextConversations.length === 0 ? (
          <EmptyNote>
            La cobertura actual no muestra un vacío claro — buena señal.
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.nextConversations.map((next) => (
              <div
                key={next.id}
                className="rounded-2xl border border-sky-100/80 bg-sky-50/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900">
                    {next.personName ?? next.roleHint}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    Ganancia de información: {next.infoGainLabel}
                  </span>
                </div>
                {next.departmentHint ? (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {next.departmentHint}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {next.reason}
                </p>
                <EvidenceList evidence={next.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Three Things That Surprised Us */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Sparkles}
          kicker="Hallazgos"
          title="Tres cosas que nos sorprendieron"
          description="Observaciones que se salen de lo esperado — cada una con su evidencia."
        />
        {insights.surprises.length === 0 ? (
          <EmptyNote>
            Aún no hay hallazgos que se distingan claramente de lo esperado.
          </EmptyNote>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {insights.surprises.map((surprise, i) => (
              <div
                key={surprise.id}
                className="rounded-2xl border border-amber-100/80 bg-amber-50/40 px-4 py-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-amber-700">
                  Hallazgo {i + 1}
                </p>
                <p className="mt-1.5 text-sm font-medium text-neutral-900">
                  {surprise.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  {surprise.narrative}
                </p>
                <EvidenceList evidence={surprise.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Institutional Memory */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Network}
          kicker="Memoria institucional"
          title="Por qué creemos lo que recomendamos"
          description="Cada recomendación expandida: por qué la creemos y el camino de evidencia que la sostiene."
        />
        {insights.institutionalMemory.length === 0 ? (
          <EmptyNote>
            Las recomendaciones aún no tienen suficiente respaldo para expandir su memoria.
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-4">
            {insights.institutionalMemory.map((entry) => (
              <ExecutiveDetail
                key={entry.id}
                summary={
                  <p className="text-sm font-medium text-neutral-900">
                    {entry.recommendationTitle}
                  </p>
                }
                labelExpand="Ver por qué lo creemos"
                labelCollapse="Ocultar"
                className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-4"
              >
                <div className="space-y-3">
                  {entry.whyWeBelieve.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed text-neutral-700">
                      {line}
                    </p>
                  ))}
                  {entry.evidenceQuotes.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                        Evidencia
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {entry.evidenceQuotes.map((q, i) => (
                          <li key={i} className="text-sm text-neutral-600">
                            — {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-2">
                    {entry.chain.map((step, i) => (
                      <span key={step.id} className="flex items-center gap-2">
                        <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-700">
                          {step.label} · {step.count}
                        </span>
                        {i < entry.chain.length - 1 ? (
                          <span className="text-neutral-300" aria-hidden>
                            →
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              </ExecutiveDetail>
            ))}
          </div>
        )}
      </Card>

      {/* 6. Business Evolution */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={TrendingUp}
          kicker="Evolución del negocio"
          title="Cómo mejoró nuestra comprensión"
          description="Nunca borramos lo anterior — esto muestra cómo creció el conocimiento visita tras visita."
        />
        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {insights.businessEvolution.narrative}
        </p>
        {insights.businessEvolution.moments.length > 0 ? (
          <ol className="mt-4 space-y-3 border-l border-neutral-200 pl-4">
            {insights.businessEvolution.moments.map((moment) => (
              <li key={moment.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full",
                    moment.polarity === "progress"
                      ? "bg-emerald-500"
                      : moment.polarity === "regression"
                        ? "bg-rose-500"
                        : "bg-neutral-300",
                  )}
                  aria-hidden
                />
                <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-400">
                  {formatTimelineDate(moment.at)}
                </p>
                <p className="text-sm font-medium text-neutral-900">{moment.title}</p>
                <p className="text-sm text-neutral-600">{moment.description}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </Card>

      {/* 7. Future Readiness */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Compass}
          kicker="Preparación futura"
          title="Dónde se atorará el crecimiento"
          description="Predicciones respaldadas por evidencia sobre lo que se romperá primero al crecer — con el porqué."
        />
        {insights.futureReadiness.length === 0 ? (
          <EmptyNote>
            No hay suficientes patrones de riesgo para proyectar dónde se atorará el crecimiento.
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.futureReadiness.map((prediction) => (
              <div
                key={prediction.id}
                className="rounded-2xl border border-orange-100/80 bg-orange-50/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900">
                    {prediction.struggle}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">
                    {prediction.horizon}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                  <span className="text-neutral-400">Por qué: </span>
                  {prediction.why}
                </p>
                <EvidenceList evidence={prediction.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 8. Knowledge Concentration */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Network}
          kicker="Concentración de conocimiento"
          title="Dónde vive el conocimiento hoy"
          description="Quién sostiene qué — y dónde ese conocimiento depende de una sola persona."
        />
        <p className="mt-4 text-sm leading-relaxed text-neutral-700">
          {insights.knowledgeConcentration.headline}
        </p>
        {insights.knowledgeConcentration.nodes.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {insights.knowledgeConcentration.nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-neutral-900">
                    {node.kind === "sin_dueño_claro" ? `${node.holder} · sin dueño` : node.holder}
                  </p>
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", RISK_DOT[node.concentrationRisk])}
                      aria-hidden
                    />
                    {node.concentrationRisk}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-neutral-600">
                  {node.knowledgeAreas.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* 9. Business Intelligence Timeline */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Clock}
          kicker="Lo que aprendimos"
          title="Bitácora de inteligencia de negocio"
          description="Un flujo de lo que fuimos aprendiendo, en orden — sin editar el pasado."
        />
        {insights.learnedTimeline.length === 0 ? (
          <EmptyNote>
            Aún no hay suficiente actividad registrada para armar la bitácora.
          </EmptyNote>
        ) : (
          <ol className="mt-4 space-y-3">
            {insights.learnedTimeline.map((entry, i) => (
              <li key={entry.id}>
                <div className="flex items-baseline gap-3">
                  <p className="w-20 shrink-0 text-[11px] uppercase tracking-[0.1em] text-neutral-400">
                    {formatTimelineDate(entry.at)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      Aprendimos: {entry.headline}
                    </p>
                    <p className="text-sm text-neutral-600">{entry.detail}</p>
                  </div>
                </div>
                {i < insights.learnedTimeline.length - 1 ? (
                  <Separator className="mt-3" />
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
