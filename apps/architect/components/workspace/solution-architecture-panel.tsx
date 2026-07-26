"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { SOLUTION_FUTURE_OUTPUTS } from "@/lib/solution";
import {
  humanizeDependencies,
  recommendationStrength,
  strengthHint,
} from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type { SolutionArchitecture } from "@/types";

export function SolutionArchitecturePanel({
  architecture,
}: {
  architecture: SolutionArchitecture | null | undefined;
}) {
  if (!architecture) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          El sistema recomendado aparece una vez que el plan de negocio está
          listo. Describe el sistema operativo que la empresa necesita — sin
          construirlo todavía.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Sistema recomendado
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          El software diseñado para cómo opera el negocio
        </h3>
        <p className="mt-3 text-neutral-600">{architecture.summary}</p>
        <p className="mt-4 text-sm text-neutral-500">
          {recommendationStrength(architecture.overallConfidence)} ·{" "}
          {formatRelativeActivity(architecture.generatedAt)}
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          {strengthHint(architecture.overallConfidence)}
        </p>
      </Card>

      <Block title="Capacidades recomendadas">
        <ul className="space-y-3">
          {architecture.modules.map((mod) => (
            <li key={mod.id}>
              <p className="text-neutral-950">{mod.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{mod.purpose}</p>
              <p className="mt-1 text-xs text-neutral-400">
                {recommendationStrength(mod.confidence)}
              </p>
              {mod.dependencies.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-500">
                  {humanizeDependencies(mod.dependencies)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Roles que lo usarán">
        <ul className="space-y-3">
          {architecture.roles.map((role) => (
            <li key={role.id}>
              <p className="text-neutral-950">{role.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {role.responsibilities.join(" · ")}
              </p>
              {role.primaryScreens.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Usado en: {role.primaryScreens.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <ExecutiveDetail
        labelExpand="Ver modelo de información y accesos"
        labelCollapse="Ocultar modelo de información y accesos"
        summary={
          <p className="text-sm text-neutral-600">
            Objetos de negocio centrales, relaciones, navegación y principios
            de acceso que dan soporte a las capacidades recomendadas.
          </p>
        }
      >
        <div className="space-y-6">
          <Block title="Información central del negocio">
            <ul className="flex flex-wrap gap-2">
              {architecture.entities.map((entity) => (
                <li
                  key={entity.id}
                  className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600"
                >
                  {entity.name}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Cómo se conecta la información">
            <ul className="space-y-2">
              {architecture.relationships.map((rel) => (
                <li key={rel.id} className="text-sm text-neutral-700">
                  {rel.fromEntity}{" "}
                  <span className="text-neutral-400">se relaciona con</span>{" "}
                  {rel.toEntity}
                </li>
              ))}
            </ul>
          </Block>

          <Block title="Navegación principal">
            <p className="text-neutral-800">
              {architecture.navigation.map((n) => n.label).join(" · ")}
            </p>
          </Block>

          <Block title="Principios de acceso">
            <ul className="space-y-2">
              {architecture.permissions.map((perm) => (
                <li key={perm.id} className="text-sm text-neutral-700">
                  {perm.capability}
                  <span className="text-neutral-400"> — {perm.description}</span>
                </li>
              ))}
            </ul>
          </Block>
        </div>
      </ExecutiveDetail>

      <Block title="Secuencia de implementación">
        <ol className="space-y-5">
          {architecture.roadmap.map((phase) => (
            <li key={phase.id}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                Fase {phase.phase}
                {phase.estimatedComplexity
                  ? ` · complejidad ${phase.estimatedComplexity}`
                  : ""}
              </p>
              <p className="mt-1 text-neutral-950">{phase.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {phase.businessValue}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Capacidades: {phase.modules.join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ol>
      </Block>

      <ExecutiveDetail
        labelExpand="Ver integraciones y extensiones futuras"
        labelCollapse="Ocultar integraciones futuras"
        summary={
          <p className="text-sm text-neutral-600">
            Integraciones planeadas y extensiones futuras — pensadas para
            fases posteriores, no necesarias para la primera versión.
          </p>
        }
      >
        <div className="space-y-6">
          <Block title="Integraciones futuras">
            <ul className="space-y-2">
              {architecture.integrations.map((integ) => (
                <li
                  key={integ.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-neutral-800">{integ.name}</span>
                  <span className="text-neutral-400">{integ.status}</span>
                </li>
              ))}
            </ul>
          </Block>

          {architecture.aiAgents.length > 0 ? (
            <Block title="Futuros asistentes de IA">
              <ul className="space-y-2">
                {architecture.aiAgents.map((agent) => (
                  <li key={agent.id}>
                    <p className="text-neutral-950">{agent.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {agent.purpose}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          {architecture.apis.length > 0 ? (
            <Block title="Conceptos de conectividad del sistema">
              <ul className="flex flex-wrap gap-2">
                {architecture.apis.map((api) => (
                  <li
                    key={api.id}
                    className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-600"
                  >
                    {api.resource}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          <Block title="Documentación futura">
            <ul className="grid gap-2 sm:grid-cols-2">
              {SOLUTION_FUTURE_OUTPUTS.map((output) => (
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
          </Block>
        </div>
      </ExecutiveDetail>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        {title}
      </h4>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}
