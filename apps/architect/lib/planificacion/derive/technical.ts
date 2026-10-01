import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  governanceFromConfidence,
  itemDerivationMeta,
  mapSolutionEvidence,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

const TECHNICAL_BASELINE: Array<{
  key: string;
  title: string;
  body: string;
  when: (workspace: CompanyWorkspace) => boolean;
}> = [
  {
    key: "auth",
    title: "Autenticación",
    body: "Inicio de sesión seguro para usuarios de ISALWA antes de datos reales.",
    when: (ws) => ws.businessUnderstanding > 0 || ws.solutionArchitecture !== null,
  },
  {
    key: "rbac",
    title: "Roles y permisos (RBAC)",
    body: "Control de acceso por rol — decisión de ingeniería; ISALWA solo define quién opera qué.",
    when: (ws) =>
      Boolean(ws.solutionArchitecture?.roles?.length) ||
      Boolean(ws.solutionArchitecture?.permissions?.length),
  },
  {
    key: "tenant",
    title: "Separación de datos por empresa",
    body: "Aislamiento multi-tenant para proteger la información de ISALWA.",
    when: (ws) => ws.solutionArchitecture !== null,
  },
  {
    key: "api",
    title: "Protección de API",
    body: "Las APIs del sistema operativo deben autenticarse antes del piloto con datos reales.",
    when: (ws) => Boolean(ws.solutionArchitecture?.apis?.length),
  },
  {
    key: "database",
    title: "Base de datos",
    body: "Almacenamiento persistente para clientes, operaciones y documentos.",
    when: (ws) => Boolean(ws.solutionArchitecture?.database?.length),
  },
  {
    key: "storage",
    title: "Almacenamiento de archivos",
    body: "PDFs, cotizaciones y documentos adjuntos.",
    when: (ws) =>
      Boolean(ws.solutionArchitecture?.entities?.some((e) => e.name === "Document")),
  },
  {
    key: "backups",
    title: "Respaldos y recuperación",
    body: "Copias de seguridad antes de producción con datos reales.",
    when: (ws) => ws.businessUnderstanding >= 20,
  },
  {
    key: "monitoring",
    title: "Monitoreo y errores",
    body: "Detección de fallas antes de que afecten usuarios.",
    when: (ws) => ws.businessUnderstanding >= 30,
  },
  {
    key: "audit",
    title: "Registro de auditoría",
    body: "Trazabilidad de acciones críticas en el sistema operativo.",
    when: (ws) => Boolean(ws.solutionArchitecture?.approvalRules?.length),
  },
];

export function deriveTechnicalRequirements(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];
  const solution = workspace.solutionArchitecture;

  for (const req of TECHNICAL_BASELINE) {
    if (!req.when(workspace)) continue;
    const stableKey = stableKeyFor("technical_requirement", req.key);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title: req.title,
      body: req.body,
      rationale: "Requisito de ingeniería — no es una decisión de diseño para dirección.",
      evidenceRefs: solution
        ? mapSolutionEvidence(solution.evidence.slice(0, 2))
        : [quoteEvidence("workspace", "Derivado del alcance de implementación")],
      governanceStatus: governanceFromConfidence(
        solution?.overallConfidence ?? 60,
        "technical_requirement",
      ),
      sourceEngines: solution ? ["solution"] : ["workspace"],
      ...meta,
    });
  }

  for (const integration of solution?.integrations ?? []) {
    const stableKey = stableKeyFor(
      "technical_requirement",
      `integration-${integration.name}`,
    );
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title: `Integración: ${integration.name}`,
      body: integration.purpose,
      rationale: `Estado: ${integration.status}`,
      evidenceRefs: mapSolutionEvidence(integration.evidence),
      governanceStatus: governanceFromConfidence(
        integration.confidence,
        "technical_requirement",
      ),
      sourceEngines: ["solution"],
      ...meta,
    });
  }

  return items;
}
