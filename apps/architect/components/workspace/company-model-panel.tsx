"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  resolveEffectiveLabel,
  type EffectiveTerminologyEntry,
} from "@/lib/brand";
import { t, useTranslations } from "@/lib/i18n";
import {
  criticalityLabel,
  dependencyKindLabel,
  ownershipKindLabel,
  recommendationStrength,
  riskLevelLabel,
  strengthBandLabelEs,
} from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type {
  CompanyDependency,
  CompanyDepartment,
  CompanyInformationFlow,
  CompanyModel,
  CompanyOwnership,
  CompanyRelationship,
} from "@/types";

export function CompanyModelPanel({
  model,
  departmentNames,
}: {
  model: CompanyModel | null | undefined;
  /**
   * White Label Company Experience — effective (override-aware) department
   * display names, keyed by original blueprint department name. Only
   * renames the department list itself; relationship, ownership and flow
   * labels elsewhere in this model are precomputed strings from a different
   * derivation domain and are not renamed here (see WHITE_LABEL_EXPERIENCE.md gaps).
   */
  departmentNames?: EffectiveTerminologyEntry[];
}) {
  const { t } = useTranslations();
  if (!model) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-[var(--isalwa-slate)]">
          {t("companyModelPanel.empty")}
        </p>
      </Card>
    );
  }

  const criticalDeps = model.dependencies.filter(
    (d) => d.criticality === "critical" || d.criticality === "high",
  );

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("companyModelPanel.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {t("companyModelPanel.title")}
        </h3>
        <p className="mt-3 text-[var(--isalwa-slate)]">{model.summary}</p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {model.organization.summary}
        </p>
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]/60">
          {t("companyModelPanel.meta", {
            strength: recommendationStrength(model.overallConfidence),
            health: strengthBandLabelEs(model.health.overallScore, "percent"),
            activity: formatRelativeActivity(model.generatedAt),
          })}
        </p>
        {model.health.notes.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {model.health.notes.map((note) => (
              <li key={note} className="text-sm text-[var(--isalwa-slate)]">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Section title={t("companyModelPanel.departments")}>
        {model.departments.length === 0 ? (
          <EmptyHint text={t("companyModelPanel.departmentsEmpty")} />
        ) : (
          <ul className="space-y-3">
            {model.departments.map((dept) => (
              <DepartmentRow
                key={dept.id}
                dept={dept}
                displayName={
                  departmentNames
                    ? resolveEffectiveLabel(departmentNames, dept.name)
                    : dept.name
                }
              />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("companyModelPanel.relationships")}>
        {model.relationships.length === 0 ? (
          <EmptyHint text={t("companyModelPanel.relationshipsEmpty")} />
        ) : (
          <ul className="space-y-2">
            {model.relationships.slice(0, 24).map((rel) => (
              <RelationshipRow key={rel.id} rel={rel} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("companyModelPanel.ownership")}>
        {model.ownership.length === 0 ? (
          <EmptyHint text={t("companyModelPanel.ownershipEmpty")} />
        ) : (
          <ul className="space-y-2">
            {model.ownership.slice(0, 24).map((own) => (
              <OwnershipRow key={own.id} own={own} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("companyModelPanel.informationFlow")}>
        {model.informationFlows.length === 0 ? (
          <EmptyHint text={t("companyModelPanel.informationFlowEmpty")} />
        ) : (
          <ul className="space-y-3">
            {model.informationFlows.slice(0, 20).map((flow) => (
              <InformationFlowRow key={flow.id} flow={flow} />
            ))}
          </ul>
        )}
      </Section>

      <Section title={t("companyModelPanel.criticalDependencies")}>
        {criticalDeps.length === 0 ? (
          <EmptyHint text={t("companyModelPanel.criticalDependenciesEmpty")} />
        ) : (
          <ul className="space-y-3">
            {criticalDeps.map((dep) => (
              <DependencyRow key={dep.id} dep={dep} />
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-[var(--isalwa-slate)]/80">{text}</p>;
}

function DepartmentRow({
  dept,
  displayName,
}: {
  dept: CompanyDepartment;
  displayName: string;
}) {
  return (
    <li className="rounded-xl border border-[var(--isalwa-mist)]/70 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-[var(--isalwa-kiln)]">{displayName}</p>
        <span className="text-xs text-[var(--isalwa-slate)]/60">
          {strengthBandLabelEs(dept.confidence)}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{dept.purpose}</p>
      <p className="mt-2 text-xs text-[var(--isalwa-slate)]/60">
        {t("companyModelPanel.departmentSummary", {
          people: dept.personIds.length,
          workflows: dept.workflowIds.length,
          systems: dept.systemIds.length,
          headcount:
            dept.headcountHint != null
              ? t("companyModelPanel.headcountSuffix", { count: dept.headcountHint })
              : "",
        })}
      </p>
    </li>
  );
}

function RelationshipRow({ rel }: { rel: CompanyRelationship }) {
  // `knowledgeRelationshipId` is only set when this edge traces to a
  // specific relationship extracted from the client's own documents/
  // interviews (`workspace.knowledge.relationships`); everything else here
  // is synthesized from department/system/handoff structure, so it gets an
  // explicit "inferred" badge instead of reading as equally discovered.
  const isDirectEvidence = rel.knowledgeRelationshipId != null;
  return (
    <li className="text-sm text-[var(--isalwa-slate)]">
      <span className="text-[var(--isalwa-kiln)]">{rel.fromLabel}</span>
      <span className="mx-1.5 text-[var(--isalwa-slate)]/60">→</span>
      <span className="text-[var(--isalwa-kiln)]">{rel.toLabel}</span>
      <span className="ml-2 text-xs uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
        {rel.label}
      </span>
      <span className="ml-2 text-xs text-[var(--isalwa-slate)]/60">
        {strengthBandLabelEs(rel.confidence)}
      </span>
      <span className="ml-2 text-[10px] uppercase tracking-[0.1em] text-[var(--isalwa-slate)]/50">
        {isDirectEvidence
          ? t("companyModelPanel.evidenceDirect")
          : t("companyModelPanel.evidenceInferred")}
      </span>
    </li>
  );
}

function OwnershipRow({ own }: { own: CompanyOwnership }) {
  return (
    <li className="text-sm text-[var(--isalwa-slate)]">
      <span className="font-medium text-[var(--isalwa-kiln)]">{own.ownerLabel}</span>
      <span className="mx-1.5 text-[var(--isalwa-slate)]/60">{t("companyModelPanel.owns")}</span>
      <span className="text-[var(--isalwa-kiln)]">{own.targetLabel}</span>
      <span className="ml-2 text-xs uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
        {ownershipKindLabel(own.kind)}
      </span>
      <span className="ml-2 text-xs text-[var(--isalwa-slate)]/60">
        {strengthBandLabelEs(own.confidence)}
      </span>
    </li>
  );
}

function InformationFlowRow({ flow }: { flow: CompanyInformationFlow }) {
  return (
    <li className="rounded-xl border border-[var(--isalwa-mist)]/70 px-4 py-3">
      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{flow.name}</p>
      <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
        {t("companyModelPanel.risk")}: {riskLevelLabel(flow.risk) || flow.risk} ·{" "}
        {strengthBandLabelEs(flow.confidence)} ·{" "}
        {t("companyModelPanel.informationNodes", { count: flow.informationIds.length })}
      </p>
      {flow.missingInformation.length > 0 ? (
        <p className="mt-2 text-sm text-[var(--isalwa-tint-amber-ink)]/90">
          {t("companyModelPanel.missing", { items: flow.missingInformation.join(", ") })}
        </p>
      ) : null}
    </li>
  );
}

function DependencyRow({ dep }: { dep: CompanyDependency }) {
  return (
    <li className="rounded-xl border border-[var(--isalwa-mist)]/70 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
          {dep.fromLabel} → {dep.toLabel}
        </p>
        <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/80">
          {criticalityLabel(dep.criticality)}
        </span>
      </div>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{dep.reason}</p>
      <p className="mt-2 text-xs text-[var(--isalwa-slate)]/60">
        {dependencyKindLabel(dep.kind)} · {strengthBandLabelEs(dep.confidence)}
      </p>
    </li>
  );
}
