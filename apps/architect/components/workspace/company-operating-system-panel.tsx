"use client";

import { ArrowRight, BookOpen, Brain, MessageSquare, Network, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
} from "@/components/workspace/section-shell";
import { buildCompanyOperatingSystem } from "@/lib/consulting-intelligence/company-operating-system";
import { formatRelativeActivity } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type { CompanyWorkspace, LivingDeliverableKind } from "@/types";

/**
 * Mission 25 — Company Operating System hub.
 * Frames Mission 26 Living Deliverables as the company's OS — no second catalog.
 */
export function CompanyOperatingSystemPanel({
  workspace,
  onOpenDeliverables,
  onFocusDeliverable,
}: {
  workspace: CompanyWorkspace;
  onOpenDeliverables: () => void;
  onFocusDeliverable?: (kind: LivingDeliverableKind) => void;
}) {
  const report = buildCompanyOperatingSystem(workspace);

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "border px-5 py-6 sm:px-6",
          SECTION_TONE_SURFACE.blueprint,
        )}
      >
        <p className={cn("isalwa-kicker", SECTION_TONE_INK.blueprint)}>
          Sistema operativo de la empresa
        </p>
        <h2 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {report.headline}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {report.pipelineNote}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-kiln)]">
          Qué tanto entiende Architect tu empresa:{" "}
          <span className="font-medium">{report.understandingPercent}%</span>
        </p>

        <ol className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { icon: MessageSquare, label: "Conversación" },
            { icon: BookOpen, label: "Conocimiento" },
            { icon: Brain, label: "Company Brain" },
            { icon: Network, label: "Operating System" },
          ].map((step, index) => (
            <li
              key={step.label}
              className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-3 text-sm text-[var(--isalwa-kiln)] ring-1 ring-[var(--isalwa-mist)]"
            >
              <span className="isalwa-icon-chip isalwa-ink-blue !h-8 !w-8">
                <step.icon className="h-4 w-4" aria-hidden />
              </span>
              <span>
                <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                  {index + 1}
                </span>
                <br />
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {report.modules.map((module) => (
          <Card key={module.id} className="flex flex-col px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/70">
                  {module.readinessLabel}
                </p>
                <h3 className="mt-2 text-lg text-[var(--isalwa-kiln)]">{module.title}</h3>
              </div>
              {module.updateAvailable ? (
                <span className="shrink-0 rounded-full bg-[var(--isalwa-tint-amber)]/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-tint-amber-ink)]">
                  Actualización
                </span>
              ) : null}
            </div>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              {module.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-[var(--isalwa-slate)]">
              <div>
                <dt className="uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                  Confianza
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{module.confidence}%</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                  Evidencia
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">{module.evidenceCount}</dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                  Generado desde
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">
                  {module.generatedFrom.join(" · ")}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                  Actualizado
                </dt>
                <dd className="mt-0.5 text-[var(--isalwa-kiln)]">
                  {module.lastUpdatedAt
                    ? formatRelativeActivity(module.lastUpdatedAt)
                    : "Aún no generado"}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-[var(--isalwa-kiln)]">{module.becauseWeUnderstand}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {module.deliverableKind ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onFocusDeliverable?.(module.deliverableKind!);
                    onOpenDeliverables();
                  }}
                >
                  {module.generateLabel}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Button>
              ) : module.id === "evolution_timeline" ? (
                <Button type="button" size="sm" variant="secondary" onClick={onOpenDeliverables}>
                  Ver entregables vivos
                </Button>
              ) : (
                <Button type="button" size="sm" variant="secondary" disabled>
                  {module.generateLabel}
                </Button>
              )}
              {module.hasVersion && module.deliverableKind ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onFocusDeliverable?.(module.deliverableKind!);
                    onOpenDeliverables();
                  }}
                >
                  Vista previa
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {report.evolutionEvents.length > 0 ? (
        <Card className="px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="isalwa-icon-chip isalwa-ink-gray">
              <Sparkles className="h-4 w-4" aria-hidden />
            </span>
            <p className="isalwa-kicker">Evolución reciente</p>
          </div>
          <ol className="mt-4 space-y-3">
            {report.evolutionEvents.map((event) => (
              <li key={event.id} className="border-l-2 border-[var(--isalwa-mist)] pl-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                  {formatRelativeActivity(event.date)}
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{event.title}</p>
                <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]">{event.description}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}
    </div>
  );
}
