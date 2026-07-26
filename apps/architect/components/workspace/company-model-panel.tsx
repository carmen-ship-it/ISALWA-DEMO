"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import {
  resolveEffectiveLabel,
  type EffectiveTerminologyEntry,
} from "@/lib/brand";
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
  if (!model) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-600">
          El modelo de la empresa aparece cuando el blueprint está disponible.
          Es un gemelo digital operativo construido solo con evidencia —
          departamentos, relaciones, propiedad y dependencias — sin inventar
          estructura ni diagramas.
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
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Modelo de la empresa
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Gemelo digital operativo
        </h3>
        <p className="mt-3 text-neutral-600">{model.summary}</p>
        <p className="mt-2 text-sm text-neutral-500">
          {model.organization.summary}
        </p>
        <p className="mt-4 text-sm text-neutral-400">
          {recommendationStrength(model.overallConfidence)} · salud{" "}
          {strengthBandLabelEs(model.health.overallScore, "percent")} ·{" "}
          {formatRelativeActivity(model.generatedAt)} · solo lectura
        </p>
        {model.health.notes.length > 0 ? (
          <ul className="mt-4 space-y-1">
            {model.health.notes.map((note) => (
              <li key={note} className="text-sm text-neutral-600">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </Card>

      <Section title="Departamentos">
        {model.departments.length === 0 ? (
          <EmptyHint text="Aún no hay departamentos derivados del blueprint." />
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

      <Section title="Relaciones">
        {model.relationships.length === 0 ? (
          <EmptyHint text="Aún no hay relaciones entre actores, sistemas o departamentos." />
        ) : (
          <ul className="space-y-2">
            {model.relationships.slice(0, 24).map((rel) => (
              <RelationshipRow key={rel.id} rel={rel} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Propiedad">
        {model.ownership.length === 0 ? (
          <EmptyHint text="La propiedad de capacidades, flujos y sistemas aún no está clara." />
        ) : (
          <ul className="space-y-2">
            {model.ownership.slice(0, 24).map((own) => (
              <OwnershipRow key={own.id} own={own} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Flujo de información">
        {model.informationFlows.length === 0 ? (
          <EmptyHint text="Los flujos de información aparecen cuando hay handoffs de proceso." />
        ) : (
          <ul className="space-y-3">
            {model.informationFlows.slice(0, 20).map((flow) => (
              <InformationFlowRow key={flow.id} flow={flow} />
            ))}
          </ul>
        )}
      </Section>

      <Section title="Dependencias críticas">
        {criticalDeps.length === 0 ? (
          <EmptyHint text="No se detectaron dependencias críticas o altas con la evidencia actual." />
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
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        {title}
      </p>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-sm text-neutral-500">{text}</p>;
}

function DepartmentRow({
  dept,
  displayName,
}: {
  dept: CompanyDepartment;
  displayName: string;
}) {
  return (
    <li className="rounded-xl border border-neutral-200/70 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-neutral-900">{displayName}</p>
        <span className="text-xs text-neutral-400">
          {strengthBandLabelEs(dept.confidence)}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{dept.purpose}</p>
      <p className="mt-2 text-xs text-neutral-400">
        {dept.personIds.length} personas · {dept.workflowIds.length} flujos ·{" "}
        {dept.systemIds.length} sistemas
        {dept.headcountHint != null
          ? ` · ~${dept.headcountHint} personas en plantilla`
          : ""}
      </p>
    </li>
  );
}

function RelationshipRow({ rel }: { rel: CompanyRelationship }) {
  return (
    <li className="text-sm text-neutral-700">
      <span className="text-neutral-900">{rel.fromLabel}</span>
      <span className="mx-1.5 text-neutral-400">→</span>
      <span className="text-neutral-900">{rel.toLabel}</span>
      <span className="ml-2 text-xs uppercase tracking-[0.12em] text-neutral-400">
        {rel.label}
      </span>
      <span className="ml-2 text-xs text-neutral-400">
        {strengthBandLabelEs(rel.confidence)}
      </span>
    </li>
  );
}

function OwnershipRow({ own }: { own: CompanyOwnership }) {
  return (
    <li className="text-sm text-neutral-700">
      <span className="font-medium text-neutral-900">{own.ownerLabel}</span>
      <span className="mx-1.5 text-neutral-400">posee</span>
      <span className="text-neutral-900">{own.targetLabel}</span>
      <span className="ml-2 text-xs uppercase tracking-[0.12em] text-neutral-400">
        {ownershipKindLabel(own.kind)}
      </span>
      <span className="ml-2 text-xs text-neutral-400">
        {strengthBandLabelEs(own.confidence)}
      </span>
    </li>
  );
}

function InformationFlowRow({ flow }: { flow: CompanyInformationFlow }) {
  return (
    <li className="rounded-xl border border-neutral-200/70 px-4 py-3">
      <p className="text-sm font-medium text-neutral-900">{flow.name}</p>
      <p className="mt-1 text-xs text-neutral-400">
        Riesgo: {riskLevelLabel(flow.risk) || flow.risk} ·{" "}
        {strengthBandLabelEs(flow.confidence)} ·{" "}
        {flow.informationIds.length} nodos de información
      </p>
      {flow.missingInformation.length > 0 ? (
        <p className="mt-2 text-sm text-amber-800/90">
          Falta: {flow.missingInformation.join(", ")}
        </p>
      ) : null}
    </li>
  );
}

function DependencyRow({ dep }: { dep: CompanyDependency }) {
  return (
    <li className="rounded-xl border border-neutral-200/70 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-neutral-900">
          {dep.fromLabel} → {dep.toLabel}
        </p>
        <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">
          {criticalityLabel(dep.criticality)}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-600">{dep.reason}</p>
      <p className="mt-2 text-xs text-neutral-400">
        {dependencyKindLabel(dep.kind)} · {strengthBandLabelEs(dep.confidence)}
      </p>
    </li>
  );
}
