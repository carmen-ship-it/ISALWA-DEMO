"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { BLUEPRINT_FUTURE_OUTPUTS, latestBlueprint } from "@/lib/blueprint";
import { formatRelativeActivity } from "@/lib/workspace";
import type { BusinessBlueprint } from "@/types";

function blueprintRevisionLabel(indexFromNewest: number): string {
  if (indexFromNewest === 0) return "Actual";
  if (indexFromNewest === 1) return "Anterior";
  return `Más antigua · ${indexFromNewest}`;
}

export function BusinessBlueprintPanel({
  blueprints,
}: {
  blueprints: BusinessBlueprint[];
}) {
  const sorted = [...blueprints].sort((a, b) => b.version - a.version);
  const current = latestBlueprint(sorted);
  const [selectedId, setSelectedId] = useState<string | null>(
    current?.id ?? null,
  );
  const selected =
    sorted.find((b) => b.id === selectedId) ?? current ?? null;

  if (!selected) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          El plan operativo del negocio aparece cuando el descubrimiento
          produce suficiente comprensión estructurada. Se convierte en la base
          de los mapas de procesos, las propuestas y la configuración futura.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Cómo funciona su empresa
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          {selected.title}
        </h3>
        <p className="mt-3 text-neutral-600">{selected.summary}</p>
        <p className="mt-4 text-sm text-neutral-400">
          {selected.superseded ? "Revisión anterior" : "Lectura actual"} ·{" "}
          {formatRelativeActivity(selected.generatedAt)}
        </p>
      </Card>

      {sorted.length > 1 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Revisiones
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sorted.map((blueprint, index) => (
              <li key={blueprint.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(blueprint.id)}
                  className={
                    blueprint.id === selected.id
                      ? "rounded-full bg-neutral-950 px-3 py-1.5 text-xs text-white"
                      : "rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:border-neutral-400"
                  }
                >
                  {blueprintRevisionLabel(index)}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-400">
            Las lecturas anteriores se conservan — el descubrimiento nunca
            sobrescribe hallazgos previos.
          </p>
        </div>
      ) : null}

      <BlueprintBlock title="Cómo opera hoy">
        <p>{selected.currentState}</p>
      </BlueprintBlock>

      <BlueprintBlock title="Cómo debería operar">
        <p>{selected.futureState}</p>
      </BlueprintBlock>

      <BlueprintBlock title="Camino de transformación">
        <ArchitectureLine
          label="Hoy"
          summary={selected.futureArchitecture.current.summary}
        />
        <ArchitectureLine
          label="Transición"
          summary={selected.futureArchitecture.transition.summary}
        />
        <ArchitectureLine
          label="Futuro"
          summary={selected.futureArchitecture.future.summary}
        />
      </BlueprintBlock>

      <BlueprintBlock title="Capacidades">
        <ul className="space-y-4">
          {selected.capabilities.map((cap) => (
            <li key={cap.id}>
              <p className="text-neutral-950">{cap.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{cap.purpose}</p>
              {cap.painPoints.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Fricción: {cap.painPoints.slice(0, 2).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </BlueprintBlock>

      <BlueprintBlock title="Departamentos">
        <p className="text-neutral-800">
          {selected.departments.map((d) => d.name).join(" · ") || "—"}
        </p>
      </BlueprintBlock>

      <ExecutiveDetail
        labelExpand="Ver flujos de trabajo y detalle operativo"
        labelCollapse="Ocultar flujos de trabajo y detalle operativo"
        summary={
          <p className="text-sm text-neutral-600">
            Flujos de trabajo clave, reglas de operación, sistemas en uso y
            áreas de oportunidad — disponible cuando necesite el respaldo
            completo.
          </p>
        }
      >
        <div className="space-y-8">
          <BlueprintBlock title="Flujos de trabajo">
            <ul className="space-y-5">
              {selected.workflows.map((workflow) => (
                <li key={workflow.id}>
                  <p className="text-neutral-950">{workflow.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Comienza cuando: {workflow.trigger}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {workflow.steps.map((step, index) => (
                      <li
                        key={step.id}
                        className="flex gap-3 text-sm text-neutral-700"
                      >
                        <span className="text-neutral-400">{index + 1}.</span>
                        <span>
                          {step.name}
                          <span className="text-neutral-400">
                            {" "}
                            · {step.actor}
                            {step.manual ? " · manual" : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Información central del negocio">
            <ul className="flex flex-wrap gap-2">
              {selected.entities.map((entity) => (
                <li
                  key={entity.id}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600"
                >
                  {entity.name}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Reglas de operación">
            <ul className="space-y-2">
              {selected.operatingRules.map((rule) => (
                <li key={rule.id} className="text-neutral-700">
                  {rule.statement}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Sistemas en uso">
            <ul className="space-y-4">
              {selected.systems.map((system) => (
                <li key={system.id}>
                  <p className="text-neutral-950">{system.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {system.purpose}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Enfoque de reemplazo: {system.replacementStrategy}
                  </p>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Puntos de dolor">
            <ul className="space-y-2">
              {selected.painPoints.map((pain) => (
                <li key={pain.id} className="flex gap-3 text-sm">
                  <span className="w-28 shrink-0 text-neutral-400">
                    {pain.category}
                  </span>
                  <span className="text-neutral-800">{pain.title}</span>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Oportunidades">
            <ul className="space-y-3">
              {selected.opportunities.map((opp) => (
                <li key={opp.id}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                    {opp.horizon}
                  </p>
                  <p className="mt-1 text-neutral-950">{opp.title}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {opp.description}
                  </p>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Capacidades recomendadas">
            <p className="text-neutral-800">
              {selected.modules.map((m) => m.name).join(" · ") || "—"}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title="Preguntas abiertas">
            <p className="text-neutral-800">
              {selected.openQuestions.join(" · ") || "Ninguna registrada."}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title="Fuentes consultadas">
            <ul className="flex flex-wrap gap-2">
              {selected.evidence.slice(0, 10).map((ref) => (
                <li
                  key={`${ref.source}-${ref.id}`}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500"
                >
                  {ref.label}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Documentación futura">
            <ul className="grid gap-2 sm:grid-cols-2">
              {BLUEPRINT_FUTURE_OUTPUTS.map((output) => (
                <li
                  key={output.id}
                  className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
                >
                  <p className="text-sm text-neutral-900">{output.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                    {output.status === "planned" ? "Planeado" : output.status}
                  </p>
                </li>
              ))}
            </ul>
          </BlueprintBlock>
        </div>
      </ExecutiveDetail>
    </div>
  );
}

function BlueprintBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        {title}
      </h4>
      <div className="mt-3 text-base leading-relaxed text-neutral-800">
        {children}
      </div>
    </section>
  );
}

function ArchitectureLine({
  label,
  summary,
}: {
  label: string;
  summary: string;
}) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-neutral-700">{summary}</p>
    </div>
  );
}
