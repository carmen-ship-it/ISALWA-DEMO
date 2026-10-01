import type { CompanyWorkspace, PlanificacionPlanItem, SolutionRoleName } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  PLANIFICACION_PROTOTYPE_DISCLAIMER,
} from "../constants";
import {
  governanceFromConfidence,
  hasDiscoveryContent,
  itemDerivationMeta,
  mapSolutionEvidence,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

const LOCKED_OPERATIONAL_AREAS: Array<{ key: string; title: string; body: string }> = [
  {
    key: "finance-deep",
    title: "Finanzas y cobranzas (área no activada)",
    body:
      "No mostrar métricas financieras fabricadas en el centro de comando hasta que Architect apruebe requisitos y exista fuente de datos real.",
  },
  {
    key: "warehouse",
    title: "Almacén e inventario (área no activada)",
    body:
      "Capacidad bloqueada hasta aprobación e integración — sin actividad o stock simulado en el centro de comando.",
  },
  {
    key: "operations",
    title: "Operaciones y logística (área no activada)",
    body:
      "Sin estados cruzados inventados entre áreas. Se activará cuando existan procesos y datos aprobados.",
  },
  {
    key: "production",
    title: "Producción (área no activada)",
    body:
      "No representar producción en el centro de comando sin capacidad aprobada y datos reales.",
  },
  {
    key: "purchasing",
    title: "Compras (área no activada)",
    body:
      "Órdenes y aprobaciones de compra solo cuando la capacidad esté aprobada e conectada a datos.",
  },
  {
    key: "hr",
    title: "RRH / personas (área no activada)",
    body:
      "Sin métricas de personal fabricadas — activación futura bajo el mismo centro de comando.",
  },
];

const COMMERCIAL_MODULE_NAMES = new Set([
  "Sales",
  "CRM",
  "Collections",
  "Customer Service",
]);

function audienceForRole(name: SolutionRoleName): "owner" | "manager" | "frontline" | "other" {
  if (name === "Owner") return "owner";
  if (name === "Manager") return "manager";
  if (
    name === "Field Rep" ||
    name === "Technician" ||
    name === "Sales" ||
    name === "Warehouse" ||
    name === "Operations"
  ) {
    return "frontline";
  }
  return "other";
}

/**
 * Command Center requirements for Planificación — not OS implementation.
 * Derives role-aware, capability-bounded front-door needs from discovery.
 */
export function deriveCommandCenterRequirements(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];
  const solution = workspace.solutionArchitecture;
  const hasDiscovery = hasDiscoveryContent(workspace);

  const frontDoorKey = stableKeyFor("capability", "command-center-front-door");
  items.push({
    id: planificacionItemId(frontDoorKey),
    stableKey: frontDoorKey,
    kind: "capability",
    title: "Centro de comando del sistema operativo",
    body:
      "Puerta de entrada role-aware y capability-aware para dirección, gerencia y ejecución. " +
      "No pretende que toda la empresa ya esté digitalizada.",
    recommendation:
      "Mostrar solo información y acciones respaldadas por capacidades activas y datos reales. " +
      "Permitir activar futuras áreas sin rediseñar el centro de comando.",
    rationale: "Principio: front door por capacidad — no representación falsa del negocio completo.",
    evidenceRefs: solution
      ? mapSolutionEvidence(solution.evidence.slice(0, 2))
      : [quoteEvidence("workspace", "Requisito de arquitectura Planificación")],
    governanceStatus: hasDiscovery ? "requiere_confirmacion" : "propuesta",
    sourceEngines: solution ? ["solution"] : ["workspace"],
    osModuleHint: "CommandCenter",
    ...meta,
  });

  const pulsoDistinctionKey = stableKeyFor("understanding", "command-center-not-pulso-demo");
  items.push({
    id: planificacionItemId(pulsoDistinctionKey),
    stableKey: pulsoDistinctionKey,
    kind: "understanding",
    title: "Centro de comando ≠ prototipo Pulso",
    body:
      "El prototipo comercial actual (incl. Pulso) es referencia visual para conversación. " +
      PLANIFICACION_PROTOTYPE_DISCLAIMER,
    recommendation:
      "Derivar el centro de comando final desde descubrimiento, roles, procesos y capacidades aprobadas — no copiar Pulso como verdad.",
    evidenceRefs: [quoteEvidence("demo_prototype", "Prototipo comercial — pendiente de validación")],
    governanceStatus: "requiere_confirmacion",
    demoPrototypeRef: "pulso",
    sourceEngines: ["demo_prototype"],
    ...meta,
  });

  const commercialMods =
    solution?.modules.filter((m) => COMMERCIAL_MODULE_NAMES.has(m.name)) ?? [];
  if (commercialMods.length > 0) {
    const commercialKey = stableKeyFor("capability", "command-center-commercial-lane");
    items.push({
      id: planificacionItemId(commercialKey),
      stableKey: commercialKey,
      kind: "capability",
      title: "Primer carril operativo: comercial",
      body:
        "El área comercial puede ser la primera capacidad plenamente activa en el centro de comando " +
        "cuando existan datos y requisitos aprobados.",
      recommendation: commercialMods.map((m) => m.name).join(", "),
      rationale: "Módulos detectados en arquitectura de solución — no equivalen a aprobación automática.",
      evidenceRefs: commercialMods.flatMap((m) => mapSolutionEvidence(m.evidence)),
      governanceStatus: governanceFromConfidence(
        Math.max(...commercialMods.map((m) => m.confidence)),
        "capability",
      ),
      sourceEngines: ["solution"],
      osModuleHint: "CommercialLane",
      ...meta,
    });
  } else if (hasDiscovery) {
    const gapKey = stableKeyFor("information_gap", "command-center-commercial-evidence");
    items.push({
      id: planificacionItemId(gapKey),
      stableKey: gapKey,
      kind: "information_gap",
      title: "Alcance comercial en el centro de comando",
      body:
        "Aún no hay módulos comerciales suficientemente evidenciados para definir qué mostrar primero en dirección y campo.",
      governanceStatus: "requiere_confirmacion",
      evidenceRefs: [quoteEvidence("readiness", "Alcance comercial no evidenciado")],
      sourceEngines: ["readiness"],
      ...meta,
    });
  }

  const roles = solution?.roles ?? [];
  const byAudience = new Map<string, typeof roles>();
  for (const role of roles) {
    const audience = audienceForRole(role.name);
    const list = byAudience.get(audience) ?? [];
    list.push(role);
    byAudience.set(audience, list);
  }

  for (const [audience, audienceRoles] of byAudience) {
    const label =
      audience === "owner"
        ? "Vista dirección / propietarios"
        : audience === "manager"
          ? "Vista gerencia"
          : audience === "frontline"
            ? "Vista ejecución / campo"
            : "Vista otros roles";
    const needs = audienceRoles.flatMap((r) => r.needs).slice(0, 6);
    if (needs.length === 0) continue;
    const key = stableKeyFor("capability", `command-center-audience-${audience}`);
    const confidence = Math.max(...audienceRoles.map((r) => r.confidence));
    items.push({
      id: planificacionItemId(key),
      stableKey: key,
      kind: "capability",
      title: label,
      body: needs.join(" · "),
      recommendation:
        "Superficie distinta sobre la misma verdad de negocio — sin inventar información cruzada.",
      evidenceRefs: audienceRoles.flatMap((r) => mapSolutionEvidence(r.evidence)).slice(0, 4),
      governanceStatus: governanceFromConfidence(confidence, "capability"),
      sourceEngines: ["solution"],
      osModuleHint: `CommandCenter:${audience}`,
      ...meta,
    });
  }

  if (hasDiscovery) {
    for (const area of LOCKED_OPERATIONAL_AREAS) {
      const key = stableKeyFor("capability", `command-center-locked-${area.key}`);
      items.push({
        id: planificacionItemId(key),
        stableKey: key,
        kind: "technical_requirement",
        title: area.title,
        body: area.body,
        rationale: "Regla de activación: requisito aprobado + fuente de datos antes de UI activa.",
        evidenceRefs: [quoteEvidence("workspace", "Política centro de comando capability-aware")],
        governanceStatus: "propuesta",
        sourceEngines: ["workspace"],
        dependencies: ["Capacidad aprobada en Planificación", "Fuente de datos real"],
        ...meta,
      });
    }
  }

  return items;
}
