"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SOLUTION_FUTURE_OUTPUTS } from "@/lib/solution";
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
          Solution Architecture appears once a Business Blueprint exists. It
          designs the operating system the company needs — without building it.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Solution Architecture
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Software design · Blueprint v{architecture.blueprintVersion}
        </h3>
        <p className="mt-3 text-neutral-600">{architecture.summary}</p>
        <p className="mt-4 text-sm text-neutral-400">
          Confidence {Math.round(architecture.overallConfidence * 100)}% ·{" "}
          {formatRelativeActivity(architecture.generatedAt)} · read-only
        </p>
      </Card>

      <Block title="Detected Modules">
        <ul className="space-y-3">
          {architecture.modules.map((mod) => (
            <li key={mod.id}>
              <p className="text-neutral-950">
                {mod.name}{" "}
                <span className="text-xs text-neutral-400">
                  {Math.round(mod.confidence * 100)}%
                </span>
              </p>
              <p className="mt-1 text-sm text-neutral-500">{mod.purpose}</p>
              {mod.dependencies.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Depends on: {mod.dependencies.join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Detected Roles">
        <ul className="space-y-3">
          {architecture.roles.map((role) => (
            <li key={role.id}>
              <p className="text-neutral-950">{role.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {role.responsibilities.join(" · ")}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Screens: {role.primaryScreens.join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Detected Entities">
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

      <Block title="Relationships">
        <ul className="space-y-2">
          {architecture.relationships.map((rel) => (
            <li key={rel.id} className="text-sm text-neutral-700">
              {rel.fromEntity}{" "}
              <span className="text-neutral-400">{rel.cardinality}</span>{" "}
              {rel.toEntity}
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Navigation">
        <p className="text-neutral-800">
          {architecture.navigation.map((n) => n.label).join(" · ")}
        </p>
      </Block>

      <Block title="Permissions">
        <ul className="space-y-2">
          {architecture.permissions.map((perm) => (
            <li key={perm.id} className="text-sm text-neutral-700">
              {perm.capability}
              <span className="text-neutral-400"> — {perm.description}</span>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Conceptual APIs">
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

      <Block title="Implementation Roadmap">
        <ol className="space-y-5">
          {architecture.roadmap.map((phase) => (
            <li key={phase.id}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                Phase {phase.phase} · {phase.estimatedComplexity}
              </p>
              <p className="mt-1 text-neutral-950">{phase.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {phase.businessValue}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Modules: {phase.modules.join(" · ") || "—"}
              </p>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Future Integrations">
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
        <Block title="Future AI Agents">
          <ul className="space-y-2">
            {architecture.aiAgents.map((agent) => (
              <li key={agent.id}>
                <p className="text-neutral-950">{agent.name}</p>
                <p className="mt-1 text-sm text-neutral-500">{agent.purpose}</p>
              </li>
            ))}
          </ul>
        </Block>
      ) : null}

      <Block title="Future Outputs">
        <p className="mb-3 text-sm text-neutral-500">
          Designed generation targets — nothing generated in Mission 6.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SOLUTION_FUTURE_OUTPUTS.map((output) => (
            <li
              key={output.id}
              className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-neutral-900">{output.title}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                {output.status}
              </p>
            </li>
          ))}
        </ul>
      </Block>
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
