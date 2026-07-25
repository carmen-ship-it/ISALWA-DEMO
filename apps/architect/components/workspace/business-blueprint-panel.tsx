"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { BLUEPRINT_FUTURE_OUTPUTS, latestBlueprint } from "@/lib/blueprint";
import { formatRelativeActivity } from "@/lib/workspace";
import type { BusinessBlueprint } from "@/types";

function blueprintRevisionLabel(indexFromNewest: number): string {
  if (indexFromNewest === 0) return "Current";
  if (indexFromNewest === 1) return "Previous";
  return `Older · ${indexFromNewest}`;
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
          The business operating blueprint appears after discovery produces
          enough structured understanding. It becomes the foundation for process
          maps, proposals, and future configuration.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Business operating blueprint
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          {selected.title}
        </h3>
        <p className="mt-3 text-neutral-600">{selected.summary}</p>
        <p className="mt-4 text-sm text-neutral-400">
          {selected.superseded ? "Earlier revision" : "Current assessment"} ·{" "}
          {formatRelativeActivity(selected.generatedAt)}
        </p>
      </Card>

      {sorted.length > 1 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Revisions
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
            Earlier assessments are preserved — discovery never overwrites prior
            findings.
          </p>
        </div>
      ) : null}

      <BlueprintBlock title="Current state">
        <p>{selected.currentState}</p>
      </BlueprintBlock>

      <BlueprintBlock title="Future state">
        <p>{selected.futureState}</p>
      </BlueprintBlock>

      <BlueprintBlock title="Transformation path">
        <ArchitectureLine
          label="Today"
          summary={selected.futureArchitecture.current.summary}
        />
        <ArchitectureLine
          label="Transition"
          summary={selected.futureArchitecture.transition.summary}
        />
        <ArchitectureLine
          label="Future"
          summary={selected.futureArchitecture.future.summary}
        />
      </BlueprintBlock>

      <BlueprintBlock title="Capabilities">
        <ul className="space-y-4">
          {selected.capabilities.map((cap) => (
            <li key={cap.id}>
              <p className="text-neutral-950">{cap.name}</p>
              <p className="mt-1 text-sm text-neutral-500">{cap.purpose}</p>
              {cap.painPoints.length > 0 ? (
                <p className="mt-1 text-xs text-neutral-400">
                  Friction: {cap.painPoints.slice(0, 2).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </BlueprintBlock>

      <BlueprintBlock title="Departments">
        <p className="text-neutral-800">
          {selected.departments.map((d) => d.name).join(" · ") || "—"}
        </p>
      </BlueprintBlock>

      <ExecutiveDetail
        labelExpand="View workflows & operating detail"
        labelCollapse="Hide workflows & operating detail"
        summary={
          <p className="text-sm text-neutral-600">
            Key workflows, operating rules, systems in use, and opportunity
            areas — available when you need the supporting detail.
          </p>
        }
      >
        <div className="space-y-8">
          <BlueprintBlock title="Workflows">
            <ul className="space-y-5">
              {selected.workflows.map((workflow) => (
                <li key={workflow.id}>
                  <p className="text-neutral-950">{workflow.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    Starts when: {workflow.trigger}
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

          <BlueprintBlock title="Core business information">
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

          <BlueprintBlock title="Operating rules">
            <ul className="space-y-2">
              {selected.operatingRules.map((rule) => (
                <li key={rule.id} className="text-neutral-700">
                  {rule.statement}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Systems in use">
            <ul className="space-y-4">
              {selected.systems.map((system) => (
                <li key={system.id}>
                  <p className="text-neutral-950">{system.name}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {system.purpose}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Replacement approach: {system.replacementStrategy}
                  </p>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title="Pain points">
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

          <BlueprintBlock title="Opportunities">
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

          <BlueprintBlock title="Recommended capabilities">
            <p className="text-neutral-800">
              {selected.modules.map((m) => m.name).join(" · ") || "—"}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title="Open questions">
            <p className="text-neutral-800">
              {selected.openQuestions.join(" · ") || "None recorded."}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title="Sources consulted">
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

          <BlueprintBlock title="Future documentation">
            <ul className="grid gap-2 sm:grid-cols-2">
              {BLUEPRINT_FUTURE_OUTPUTS.map((output) => (
                <li
                  key={output.id}
                  className="rounded-2xl border border-neutral-200/80 bg-white/70 px-4 py-3"
                >
                  <p className="text-sm text-neutral-900">{output.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                    {output.status === "planned" ? "Planned" : output.status}
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
