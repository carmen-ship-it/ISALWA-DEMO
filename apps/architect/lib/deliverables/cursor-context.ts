import type {
  CompanyWorkspace,
  CursorContextDeliverable,
  DeliverableEvidenceRef,
} from "@/types";

/**
 * Master context document for Cursor — structured, deterministic, no LLM.
 */
export function buildCursorContext(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): CursorContextDeliverable {
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const processes = workspace.businessProcesses;
  const company = workspace.companyName;

  const purpose = `Este software existe para operar ${company} como un sistema operativo de negocio coherente — capturando clientes, pedidos, aprobaciones, operaciones y finanzas con trazabilidad, reemplazando la fragilidad evidenciada de hojas de cálculo y mensajería.`;

  const coreModules =
    solution?.modules.map((m) => `${m.name}: ${m.purpose}`) ??
    blueprint?.modules.map((m) => `${m.name}: ${m.purpose}`) ??
    [];

  const businessRules =
    solution?.businessRules.map((r) => r.statement) ??
    blueprint?.operatingRules.map((r) => r.statement) ??
    [];

  const criticalWorkflows =
    processes?.workflows.map(
      (w) => `${w.name} — disparador: ${w.trigger}; ${w.steps.length} pasos`,
    ) ??
    blueprint?.workflows.map((w) => w.name) ??
    [];

  const importantConstraints = [
    "Nunca inventar flujos de trabajo o entidades sin evidencia del Blueprint de negocio / motor de procesos",
    "Respetar las autoridades de aprobación y umbrales capturados en el descubrimiento",
    "Preferir extender el lenguaje de diseño @isalwa cuando la interfaz esté en alcance — pero este paquete de Architect es solo documentación",
    "No introducir módulos paralelos de CRM/ERP ya marcados para retiro sin un plan de migración",
    ...(solution?.approvalRules.map((r) => `Aprobación: ${r.statement}`) ?? []),
  ];

  const domainLanguage = [
    ...(solution?.entities.map((e) => e.name) ??
      blueprint?.entities.map((e) => e.name) ??
      []),
    ...(blueprint?.capabilities.map((c) => c.name) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const successMetrics = [
    ...(processes?.workflows.flatMap((w) =>
      w.metrics
        ? [
            `${w.name}: automatización ${Math.round(w.metrics.automationScore * 100)}%, cobertura ${Math.round(w.metrics.documentationScore * 100)}%`,
          ]
        : [],
    ) ?? []),
    ...(blueprint?.workflows.flatMap((w) => w.metrics) ?? []),
    "Reducir el tiempo de ciclo de aprobaciones manuales",
    "Eliminar la doble captura entre sistemas evidenciados",
  ].slice(0, 10);

  const doNot = [
    "NO generar código de producción a partir de esta app de Architect en la Misión 9",
    "NO inventar clientes, productos o políticas que no estén presentes en la evidencia",
    "NO omitir las reglas de aprobación",
    "NO reemplazar el motor de procesos con un segundo modelo de flujo de trabajo",
    "NO usar diagramas generados por LLM como fuente de verdad",
    "NO lanzar funcionalidades fuera de la hoja de ruta por fases sin actualizar el Blueprint",
  ];

  const narrative = [
    purpose,
    "",
    "Capacidades centrales:",
    ...coreModules.map((m) => `- ${m}`),
    "",
    "Reglas de negocio:",
    ...businessRules.slice(0, 12).map((r) => `- ${r}`),
    "",
    "Flujos críticos:",
    ...criticalWorkflows.slice(0, 10).map((w) => `- ${w}`),
    "",
    "Restricciones importantes:",
    ...importantConstraints.map((c) => `- ${c}`),
    "",
    "Lenguaje del dominio:",
    `- ${domainLanguage.join(", ")}`,
    "",
    "Medidas de éxito:",
    ...successMetrics.map((m) => `- ${m}`),
    "",
    "Fuera de límites:",
    ...doNot.map((d) => `- ${d}`),
  ].join("\n");

  return {
    kind: "cursor_context",
    purpose,
    coreModules,
    businessRules,
    criticalWorkflows,
    importantConstraints,
    domainLanguage,
    successMetrics,
    doNot,
    narrative,
    evidence: evidence.slice(0, 6),
  };
}
