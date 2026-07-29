"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { BLUEPRINT_FUTURE_OUTPUTS, latestBlueprint } from "@/lib/blueprint";
import { t, useTranslations } from "@/lib/i18n";
import {
  actorNameLabel,
  capabilityPurposeLabel,
  departmentLabel,
  entityLabel,
  futureOutputStatusLabel,
  moduleLabel,
  opportunityDescriptionLabel,
  opportunityHorizonLabel,
  opportunityTitleLabel,
  painCategoryLabel,
  replacementStrategyLabel,
  ruleStatementLabel,
  stepNameLabel,
  systemPurposeLabel,
  triggerLabel,
  workflowNameLabel,
} from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import { ProvenanceFootnote } from "@/components/workspace/provenance-footnote";
import type { BusinessBlueprint } from "@/types";

function blueprintRevisionLabel(indexFromNewest: number): string {
  if (indexFromNewest === 0) return t("businessBlueprintPanel.revisionCurrent");
  if (indexFromNewest === 1) return t("businessBlueprintPanel.revisionPrevious");
  return t("businessBlueprintPanel.revisionOlder", { index: indexFromNewest });
}

export function BusinessBlueprintPanel({
  blueprints,
}: {
  blueprints: BusinessBlueprint[];
}) {
  const { t } = useTranslations();
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
        <p className="text-sm text-[var(--isalwa-slate)]">
          {t("businessBlueprintPanel.empty")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("businessBlueprintPanel.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {selected.title}
        </h3>
        <p className="mt-3 text-[var(--isalwa-slate)]">{selected.summary}</p>
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]/60">
          {selected.superseded
            ? t("businessBlueprintPanel.supersededReading")
            : t("businessBlueprintPanel.currentReading")}{" "}
          ·{" "}
          {formatRelativeActivity(selected.generatedAt)}
        </p>
      </Card>

      {sorted.length > 1 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            {t("businessBlueprintPanel.revisions")}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {sorted.map((blueprint, index) => (
              <li key={blueprint.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(blueprint.id)}
                  className={
                    blueprint.id === selected.id
                      ? "rounded-full bg-[var(--isalwa-kiln)] px-3 py-1.5 text-xs text-white"
                      : "rounded-full border border-[var(--isalwa-mist)] px-3 py-1.5 text-xs text-[var(--isalwa-slate)] hover:border-[var(--isalwa-glaze)]"
                  }
                >
                  {blueprintRevisionLabel(index)}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--isalwa-slate)]/60">
            {t("businessBlueprintPanel.revisionsHint")}
          </p>
        </div>
      ) : null}

      <BlueprintBlock title={t("businessBlueprintPanel.howItOperatesToday")}>
        <p>{selected.currentState}</p>
      </BlueprintBlock>

      <BlueprintBlock title={t("businessBlueprintPanel.howItShouldOperate")}>
        <p>{selected.futureState}</p>
        <ProvenanceFootnote tier="inferred" />
      </BlueprintBlock>

      <BlueprintBlock title={t("businessBlueprintPanel.transformationPath")}>
        <ArchitectureLine
          label={t("businessBlueprintPanel.today")}
          summary={selected.futureArchitecture.current.summary}
        />
        <ArchitectureLine
          label={t("businessBlueprintPanel.transition")}
          summary={selected.futureArchitecture.transition.summary}
        />
        <ArchitectureLine
          label={t("businessBlueprintPanel.future")}
          summary={selected.futureArchitecture.future.summary}
        />
        <ProvenanceFootnote tier="inferred" />
      </BlueprintBlock>

      <BlueprintBlock title={t("businessBlueprintPanel.capabilities")}>
        <ul className="space-y-4">
          {selected.capabilities.map((cap) => (
            <li key={cap.id}>
              <p className="text-[var(--isalwa-kiln)]">{moduleLabel(cap.name)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                {capabilityPurposeLabel(cap.name, cap.purpose)}
              </p>
              {cap.painPoints.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                  {t("businessBlueprintPanel.frictionPrefix", {
                    items: cap.painPoints.slice(0, 2).join(" · "),
                  })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </BlueprintBlock>

      <BlueprintBlock title={t("businessBlueprintPanel.departments")}>
        <p className="text-[var(--isalwa-slate)]">
          {selected.departments.map((d) => departmentLabel(d.name)).join(" · ") ||
            "—"}
        </p>
      </BlueprintBlock>

      <ExecutiveDetail
        labelExpand={t("businessBlueprintPanel.expandWorkflows")}
        labelCollapse={t("businessBlueprintPanel.collapseWorkflows")}
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("businessBlueprintPanel.workflowsSummary")}
          </p>
        }
      >
        <div className="space-y-8">
          <BlueprintBlock title={t("businessBlueprintPanel.workflows")}>
            <ul className="space-y-5">
              {selected.workflows.map((workflow) => (
                <li key={workflow.id}>
                  <p className="text-[var(--isalwa-kiln)]">
                    {workflowNameLabel(workflow.name)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                    {t("businessBlueprintPanel.startsWhen", {
                      trigger: triggerLabel(workflow.trigger),
                    })}
                  </p>
                  <ol className="mt-3 space-y-2">
                    {workflow.steps.map((step, index) => (
                      <li
                        key={step.id}
                        className="flex gap-3 text-sm text-[var(--isalwa-slate)]"
                      >
                        <span className="text-[var(--isalwa-slate)]/60">{index + 1}.</span>
                        <span>
                          {stepNameLabel(step.name)}
                          <span className="text-[var(--isalwa-slate)]/60">
                            {" "}
                            · {actorNameLabel(step.actor)}
                            {step.manual ? t("businessBlueprintPanel.manualSuffix") : ""}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.coreBusinessInfo")}>
            <ul className="flex flex-wrap gap-2">
              {selected.entities.map((entity) => (
                <li
                  key={entity.id}
                  className="rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
                >
                  {entityLabel(entity.name)}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.operatingRules")}>
            <ul className="space-y-2">
              {selected.operatingRules.map((rule) => (
                <li key={rule.id} className="text-[var(--isalwa-slate)]">
                  {ruleStatementLabel(rule.statement)}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.systemsInUse")}>
            <ul className="space-y-4">
              {selected.systems.map((system) => (
                <li key={system.id}>
                  <p className="text-[var(--isalwa-kiln)]">{system.name}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                    {systemPurposeLabel(system.name, system.purpose)}
                  </p>
                  <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                    {t("businessBlueprintPanel.replacementApproach", {
                      strategy: replacementStrategyLabel(system.replacementStrategy),
                    })}
                  </p>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.painPoints")}>
            <ul className="space-y-2">
              {selected.painPoints.map((pain) => (
                <li key={pain.id} className="flex gap-3 text-sm">
                  <span className="w-28 shrink-0 text-[var(--isalwa-slate)]/60">
                    {painCategoryLabel(pain.category)}
                  </span>
                  <span className="text-[var(--isalwa-slate)]">{pain.title}</span>
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.opportunities")}>
            <ul className="space-y-3">
              {selected.opportunities.map((opp) => (
                <li key={opp.id}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                    {opportunityHorizonLabel(opp.horizon)}
                  </p>
                  <p className="mt-1 text-[var(--isalwa-kiln)]">
                    {opportunityTitleLabel(opp.title)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                    {opportunityDescriptionLabel(opp.description)}
                  </p>
                </li>
              ))}
            </ul>
            <ProvenanceFootnote tier="suggested" />
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.recommendedCapabilities")}>
            <p className="text-[var(--isalwa-slate)]">
              {selected.modules.map((m) => moduleLabel(m.name)).join(" · ") ||
                "—"}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.openQuestions")}>
            <p className="text-[var(--isalwa-slate)]">
              {selected.openQuestions.join(" · ") || t("businessBlueprintPanel.noneRegistered")}
            </p>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.sourcesConsulted")}>
            <ul className="flex flex-wrap gap-2">
              {selected.evidence.slice(0, 10).map((ref) => (
                <li
                  key={`${ref.source}-${ref.id}`}
                  className="rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]/80"
                >
                  {ref.label}
                </li>
              ))}
            </ul>
          </BlueprintBlock>

          <BlueprintBlock title={t("businessBlueprintPanel.futureDocumentation")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {BLUEPRINT_FUTURE_OUTPUTS.map((output) => (
                <li
                  key={output.id}
                  className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
                >
                  <p className="text-sm text-[var(--isalwa-kiln)]">{output.title}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                    {futureOutputStatusLabel(output.status)}
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
      <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        {title}
      </h4>
      <div className="mt-3 text-base leading-relaxed text-[var(--isalwa-slate)]">
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
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {label}
      </p>
      <p className="mt-1 text-[var(--isalwa-slate)]">{summary}</p>
    </div>
  );
}
