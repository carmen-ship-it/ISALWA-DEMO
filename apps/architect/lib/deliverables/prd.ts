import { severityLabel } from "@/lib/presentation";
import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  PrdDeliverable,
} from "@/types";

export function buildPrd(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): PrdDeliverable {
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const processes = workspace.businessProcesses;
  const consulting = workspace.conversationMemory?.consulting;

  const goals = [
    `Reemplazar herramientas frágiles con un sistema operativo duradero para ${workspace.companyName}`,
    ...(blueprint?.opportunities.slice(0, 4).map((o) => o.title) ?? []),
  ];

  const users =
    solution?.roles.map((r) => r.name) ??
    blueprint?.roles ??
    ["Owner", "Manager", "Operator"]; // Spanishified via roleLabel() at render time

  const functionalRequirements = [
    ...(solution?.modules.map(
      (m) => `Dar soporte a ${m.name}: ${m.purpose}`,
    ) ?? []),
    ...(processes?.workflows.map(
      (w) => `Ejecutar el flujo «${w.name}» cuando ${w.trigger}`,
    ) ?? []),
  ].slice(0, 20);

  const nonFunctionalRequirements = [
    "Rastro de auditoría en aprobaciones y movimientos financieros",
    "Control de acceso basado en roles para todos los módulos",
    "Utilizable desde móvil para roles de campo y almacén donde haya evidencia",
    "Reportes operativos exportables",
    "Configuración determinística desde el Blueprint de negocio",
  ];

  const acceptanceCriteria = [
    "Cada módulo de la Fase 1 puede completar de extremo a extremo su flujo principal esperado",
    "Las aprobaciones respetan las reglas de autoridad capturadas en el descubrimiento",
    "Los pasos manuales en hojas de cálculo previstos para la Fase 1 se retiran o corren en paralelo con auditoría",
    "El documento de resumen de construcción se mantiene alineado con los módulos entregados",
  ];

  const futureScope = [
    ...(solution?.aiAgents.map((a) => a.name) ?? []),
    ...(blueprint?.opportunities
      .filter((o) => o.horizon === "Strategic Initiatives" || o.horizon === "Innovation")
      .map((o) => o.title) ?? []),
  ];

  const outOfScope = [
    "Reemplazo físico del ERP para sistemas marcados para conservar",
    "Integraciones sin validar y sin evidencia",
    "Modelos de IA personalizados antes de que exista calidad de datos base",
  ];

  return {
    kind: "prd",
    goals,
    users,
    requirements: [
      ...functionalRequirements.slice(0, 8),
      ...nonFunctionalRequirements.slice(0, 3),
    ],
    functionalRequirements,
    nonFunctionalRequirements,
    acceptanceCriteria,
    dependencies: [
      ...(solution?.modules.flatMap((m) => m.dependencies) ?? []),
      ...(processes?.dependencies.map((d) => d.relationship) ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    futureScope,
    outOfScope,
    risks: (consulting?.risks ?? [])
      .slice(0, 8)
      .map((r) => `${r.title} (${severityLabel(r.severity)})`),
    evidence: evidence.slice(0, 6),
  };
}
