"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { useTranslations } from "@/lib/i18n";
import { SOLUTION_FUTURE_OUTPUTS } from "@/lib/solution";
import {
  complexityLabel,
  entityLabel,
  futureOutputStatusLabel,
  humanizeDependencies,
  integrationStatusLabel,
  moduleLabel,
  phaseLabel,
  recommendationStrength,
  roleLabel,
  screenLabel,
  strengthHint,
} from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type { SolutionArchitecture } from "@/types";

/** `lib/solution/modules.ts` purpose sentences — deterministic, display only. */
const MODULE_PURPOSE_ES: Record<string, string> = {
  CRM: "Un solo registro de cliente con historial comercial.",
  Sales: "Embudo comercial, cotizaciones y captura de pedidos.",
  Purchasing: "Solicitudes, cotizaciones y órdenes de compra.",
  Inventory: "Verdad de inventario y visibilidad de movimientos.",
  Production: "Órdenes de trabajo y coordinación de planta.",
  Maintenance: "Planes de mantenimiento de activos y solicitudes de trabajo.",
  Finance: "Facturación y controles financieros.",
  Collections: "Seguimiento de cuentas por cobrar y antigüedad de saldos.",
  HR: "Registros de personas y asignación de roles.",
  Projects: "Organización y estado del trabajo de entrega.",
  "Customer Service": "Tickets de soporte y atención al cliente.",
  Compliance: "Cumplimiento de políticas y auditabilidad.",
  Analytics: "Reportes operativos y comerciales confiables.",
  Documents: "Repositorio controlado de documentos para evidencia y procedimientos.",
  Assets: "Seguimiento de equipos propios y su ciclo de vida.",
  Fleet: "Operación de vehículos y rutas.",
  Scheduling: "Asignación de personas, trabajos y capacidad en el tiempo.",
  "Field Service": "Visitas, tareas de campo y trabajo en sitio.",
  Approvals: "Decisiones con umbrales y rastro de auditoría.",
  Notifications: "Alertas y recordatorios operativos.",
  Knowledge: "Memoria de la empresa y evidencia con búsqueda.",
  "AI Assistant":
    "Asiste sobre datos duraderos — nunca se convierte en la fuente de verdad.",
};

/** `lib/solution/roles.ts` responsibilities — deterministic, display only. */
const ROLE_RESPONSIBILITIES_ES: Record<string, string[]> = {
  Owner: ["Definir prioridades", "Aprobar compromisos mayores"],
  Manager: ["Supervisar equipos", "Aprobar dentro del umbral"],
  Sales: ["Gestionar el embudo comercial", "Crear cotizaciones y pedidos"],
  Purchasing: ["Buscar proveedores", "Emitir órdenes de compra"],
  Production: ["Ejecutar órdenes de trabajo", "Reportar el estado de planta"],
  Accounting: ["Facturar", "Aplicar pagos", "Reportar flujo de caja"],
  Operations: ["Coordinar traspasos", "Resolver excepciones"],
  Warehouse: ["Recibir y despachar inventario", "Mantener los conteos"],
  HR: ["Mantener registros de empleados", "Asignar roles"],
  Technician: ["Realizar mantenimiento o trabajo de campo"],
  "Field Rep": ["Realizar visitas", "Registrar notas de campo"],
  Administrator: ["Configurar accesos", "Administrar usuarios"],
};

/** `lib/solution/roles.ts` PERMISSION_CATALOG — deterministic, display only. */
const PERMISSION_ES: Record<string, { capability: string; description: string }> = {
  "View Customers": { capability: "Ver clientes", description: "Consultar registros e historial de clientes." },
  "Edit Customers": { capability: "Editar clientes", description: "Crear y actualizar registros de clientes." },
  "Delete Customers": { capability: "Eliminar clientes", description: "Eliminar o archivar registros de clientes." },
  "Approve Discounts": { capability: "Aprobar descuentos", description: "Autorizar condiciones comerciales fuera de lo estándar." },
  "Approve Purchases": { capability: "Aprobar compras", description: "Autorizar solicitudes y órdenes de compra." },
  "View Financial Reports": { capability: "Ver reportes financieros", description: "Acceder a reportes de finanzas y cobranza." },
  "Export Data": { capability: "Exportar datos", description: "Exportar conjuntos de datos operativos." },
  "Manage Users": { capability: "Administrar usuarios", description: "Invitar usuarios y asignar roles." },
  "Configure AI": { capability: "Configurar IA", description: "Habilitar o limitar el comportamiento del asistente de IA." },
};

export function SolutionArchitecturePanel({
  architecture,
}: {
  architecture: SolutionArchitecture | null | undefined;
}) {
  const { t } = useTranslations();
  if (!architecture) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-[var(--isalwa-slate)]">
          {t("solutionArchitecturePanel.empty")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("solutionArchitecturePanel.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {t("solutionArchitecturePanel.title")}
        </h3>
        <p className="mt-3 text-[var(--isalwa-slate)]">{architecture.summary}</p>
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]/80">
          {t("solutionArchitecturePanel.meta", {
            strength: recommendationStrength(architecture.overallConfidence),
            activity: formatRelativeActivity(architecture.generatedAt),
          })}
        </p>
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
          {strengthHint(architecture.overallConfidence)}
        </p>
      </Card>

      <Block title={t("solutionArchitecturePanel.recommendedCapabilities")}>
        <ul className="space-y-3">
          {architecture.modules.map((mod) => (
            <li key={mod.id}>
              <p className="text-[var(--isalwa-kiln)]">{moduleLabel(mod.name)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                {MODULE_PURPOSE_ES[mod.name] ?? mod.purpose}
              </p>
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                {recommendationStrength(mod.confidence)}
              </p>
              {mod.dependencies.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">
                  {humanizeDependencies(mod.dependencies)}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={t("solutionArchitecturePanel.rolesThatWillUseIt")}>
        <ul className="space-y-3">
          {architecture.roles.map((role) => (
            <li key={role.id}>
              <p className="text-[var(--isalwa-kiln)]">{roleLabel(role.name)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                {(ROLE_RESPONSIBILITIES_ES[role.name] ?? role.responsibilities).join(
                  " · ",
                )}
              </p>
              {role.primaryScreens.length > 0 ? (
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                  {t("solutionArchitecturePanel.usedIn", {
                    screens: role.primaryScreens.map(screenLabel).join(" · "),
                  })}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </Block>

      <ExecutiveDetail
        labelExpand={t("solutionArchitecturePanel.expandDataModel")}
        labelCollapse={t("solutionArchitecturePanel.collapseDataModel")}
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("solutionArchitecturePanel.dataModelSummary")}
          </p>
        }
      >
        <div className="space-y-6">
          <Block title={t("solutionArchitecturePanel.coreBusinessInfo")}>
            <ul className="flex flex-wrap gap-2">
              {architecture.entities.map((entity) => (
                <li
                  key={entity.id}
                  className="rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
                >
                  {entityLabel(entity.name)}
                </li>
              ))}
            </ul>
          </Block>

          <Block title={t("solutionArchitecturePanel.howInfoConnects")}>
            <ul className="space-y-2">
              {architecture.relationships.map((rel) => (
                <li key={rel.id} className="text-sm text-[var(--isalwa-slate)]">
                  {entityLabel(rel.fromEntity)}{" "}
                  <span className="text-[var(--isalwa-slate)]/60">
                    {t("solutionArchitecturePanel.relatesTo")}
                  </span>{" "}
                  {entityLabel(rel.toEntity)}
                </li>
              ))}
            </ul>
          </Block>

          <Block title={t("solutionArchitecturePanel.mainNavigation")}>
            <p className="text-[var(--isalwa-slate)]">
              {architecture.navigation.map((n) => n.label).join(" · ")}
            </p>
          </Block>

          <Block title={t("solutionArchitecturePanel.accessPrinciples")}>
            <ul className="space-y-2">
              {architecture.permissions.map((perm) => {
                const es = PERMISSION_ES[perm.capability];
                return (
                  <li key={perm.id} className="text-sm text-[var(--isalwa-slate)]">
                    {es?.capability ?? perm.capability}
                    <span className="text-[var(--isalwa-slate)]/60">
                      {" "}
                      — {es?.description ?? perm.description}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Block>
        </div>
      </ExecutiveDetail>

      <Block title={t("solutionArchitecturePanel.implementationSequence")}>
        <ol className="space-y-5">
          {architecture.roadmap.map((phase) => (
            <li key={phase.id}>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                {t("solutionArchitecturePanel.phase", { number: phase.phase })}
                {phase.estimatedComplexity
                  ? t("solutionArchitecturePanel.complexitySuffix", {
                      level: complexityLabel(phase.estimatedComplexity),
                    })
                  : ""}
              </p>
              <p className="mt-1 text-[var(--isalwa-kiln)]">{phaseLabel(phase.name)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                {phase.businessValue}
              </p>
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                {t("solutionArchitecturePanel.capabilities", {
                  modules: phase.modules.map(moduleLabel).join(" · ") || "—",
                })}
              </p>
            </li>
          ))}
        </ol>
      </Block>

      <ExecutiveDetail
        labelExpand={t("solutionArchitecturePanel.expandFutureIntegrations")}
        labelCollapse={t("solutionArchitecturePanel.collapseFutureIntegrations")}
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("solutionArchitecturePanel.futureIntegrationsSummary")}
          </p>
        }
      >
        <div className="space-y-6">
          <Block title={t("solutionArchitecturePanel.futureIntegrations")}>
            <ul className="space-y-2">
              {architecture.integrations.map((integ) => (
                <li
                  key={integ.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--isalwa-slate)]">{integ.name}</span>
                  <span className="text-[var(--isalwa-slate)]/60">
                    {integrationStatusLabel(integ.status)}
                  </span>
                </li>
              ))}
            </ul>
          </Block>

          {architecture.aiAgents.length > 0 ? (
            <Block title={t("solutionArchitecturePanel.futureAiAssistants")}>
              <ul className="space-y-2">
                {architecture.aiAgents.map((agent) => (
                  <li key={agent.id}>
                    <p className="text-[var(--isalwa-kiln)]">{agent.name}</p>
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
                      {agent.purpose}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          {architecture.apis.length > 0 ? (
            <Block title={t("solutionArchitecturePanel.systemConnectivityConcepts")}>
              <ul className="flex flex-wrap gap-2">
                {architecture.apis.map((api) => (
                  <li
                    key={api.id}
                    className="rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
                  >
                    {api.resource}
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}

          <Block title={t("solutionArchitecturePanel.futureDocumentation")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {SOLUTION_FUTURE_OUTPUTS.map((output) => (
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
          </Block>
        </div>
      </ExecutiveDetail>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        {title}
      </h4>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </section>
  );
}
