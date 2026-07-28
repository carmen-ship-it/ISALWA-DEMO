/**
 * Anonymized industry playbooks (Mission F).
 *
 * A small, curated set of generic, well-known operating patterns per
 * industry — the kind of thing any senior consultant already knows before
 * walking into the room ("manufacturers usually struggle with production
 * planning visibility"). These are **not** facts about this client, they are
 * priors that bias which gap or question the engine reaches for first.
 *
 * Hard rules (see `INDUSTRY_PLAYBOOKS.md`):
 *   - No named competitors, no cross-tenant data, no invented client facts.
 *   - A playbook only re-weights `DiscoveryDimension`s that already exist in
 *     the readiness/question engines — it never adds a dimension, a score,
 *     or a fact the client did not provide.
 *   - Every industry (including "other" / "unknown") resolves to a playbook
 *     — `GENERIC_PLAYBOOK` covers the case where ISALWA has no industry-
 *     specific pattern yet, so the bias degrades gracefully instead of
 *     doing nothing.
 */

import type { DiscoveryDimension, Industry } from "@/types";

export interface IndustryPlaybookDimensionWeight {
  dimension: DiscoveryDimension;
  /** Small additive priority nudge — same scale as the consequence engine's bias (1–4). */
  weight: number;
  /** Anonymized, generic pattern — never a specific client or competitor claim. */
  pattern: string;
}

export interface IndustryPlaybook {
  industry: Industry;
  label: string;
  /** One-line consultant framing of the industry's usual blind spot. */
  summary: string;
  dimensionWeights: IndustryPlaybookDimensionWeight[];
}

/** Applies when the industry is not yet known or does not match a named playbook. */
const GENERIC_PLAYBOOK: IndustryPlaybook = {
  industry: "unknown",
  label: "Genérico",
  summary:
    "Sin un patrón de industria específico todavía, los cuellos de botella operativos y la brecha entre el sistema declarado y el real siguen siendo el punto de partida más revelador.",
  dimensionWeights: [
    {
      dimension: "operations",
      weight: 2,
      pattern:
        "Los cuellos de botella operativos suelen ser el punto de partida más revelador, sin importar la industria.",
    },
    {
      dimension: "systems",
      weight: 1,
      pattern:
        "El sistema de registro real casi siempre difiere del declarado, sin importar la industria.",
    },
  ],
};

const MANUFACTURING_PLAYBOOK: IndustryPlaybook = {
  industry: "manufacturing",
  label: "Manufactura",
  summary:
    "En manufactura, la planificación de producción y el flujo de inventario suelen concentrar el mayor riesgo operativo.",
  dimensionWeights: [
    {
      dimension: "production",
      weight: 4,
      pattern:
        "La planificación de producción suele ser el cuello de botella más costoso en manufactura.",
    },
    {
      dimension: "operations",
      weight: 3,
      pattern:
        "El flujo de inventario desde la compra hasta la entrega concentra el mayor riesgo operativo.",
    },
    {
      dimension: "finance",
      weight: 3,
      pattern: "Las aprobaciones de compra suelen carecer de un dueño único.",
    },
    {
      dimension: "systems",
      weight: 1,
      pattern:
        "El registro de órdenes de trabajo suele vivir fuera del sistema formal.",
    },
  ],
};

const CONSTRUCTION_PLAYBOOK: IndustryPlaybook = {
  industry: "construction",
  label: "Construcción",
  summary:
    "En construcción, las órdenes de cambio y la comunicación campo-oficina suelen ser el mayor punto de fricción.",
  dimensionWeights: [
    {
      dimension: "finance",
      weight: 4,
      pattern:
        "Las órdenes de cambio y su aprobación son la fuente más común de fricción financiera.",
    },
    {
      dimension: "team",
      weight: 3,
      pattern:
        "La comunicación entre campo y oficina suele depender de una sola persona.",
    },
    {
      dimension: "operations",
      weight: 2,
      pattern: "La entrega de proyectos rara vez tiene visibilidad centralizada.",
    },
    {
      dimension: "systems",
      weight: 1,
      pattern:
        "Los documentos del proyecto suelen dispersarse entre canales informales.",
    },
  ],
};

const DISTRIBUTION_PLAYBOOK: IndustryPlaybook = {
  industry: "distribution",
  label: "Distribución",
  summary:
    "En distribución, la exactitud de inventario y las decisiones de compra suelen ser el punto más débil.",
  dimensionWeights: [
    {
      dimension: "operations",
      weight: 4,
      pattern: "La exactitud de inventario y el picking suelen ser el punto más débil.",
    },
    {
      dimension: "finance",
      weight: 3,
      pattern:
        "Las decisiones de compra y reposición rara vez tienen un proceso formal.",
    },
    {
      dimension: "systems",
      weight: 2,
      pattern:
        "El ruteo y el despacho suelen coordinarse fuera del sistema de registro.",
    },
    {
      dimension: "production",
      weight: 1,
      pattern: "La reposición rara vez sigue un plan formal.",
    },
  ],
};

const HEALTHCARE_PLAYBOOK: IndustryPlaybook = {
  industry: "healthcare",
  label: "Salud",
  summary:
    "En salud, el agendamiento y la continuidad de la atención al paciente suelen ser los mayores cuellos de botella.",
  dimensionWeights: [
    {
      dimension: "operations",
      weight: 4,
      pattern: "El agendamiento y la admisión concentran los cuellos de botella diarios.",
    },
    {
      dimension: "customers",
      weight: 3,
      pattern: "El seguimiento a pacientes suele fragmentarse entre roles.",
    },
    {
      dimension: "systems",
      weight: 2,
      pattern:
        "La documentación clínica y administrativa rara vez vive en un solo lugar.",
    },
  ],
};

const RETAIL_PLAYBOOK: IndustryPlaybook = {
  industry: "retail",
  label: "Retail",
  summary:
    "En retail, el inventario entre canales y el historial de clientes suelen ser el punto más débil.",
  dimensionWeights: [
    {
      dimension: "operations",
      weight: 4,
      pattern: "El inventario entre canales suele ser el punto más débil.",
    },
    {
      dimension: "customers",
      weight: 3,
      pattern: "El historial de clientes rara vez se centraliza entre canales.",
    },
    {
      dimension: "systems",
      weight: 1,
      pattern: "Las devoluciones y los ajustes suelen gestionarse de forma manual.",
    },
  ],
};

const SERVICES_PLAYBOOK: IndustryPlaybook = {
  industry: "services",
  label: "Servicios",
  summary:
    "En servicios profesionales, la utilización del equipo y la continuidad del contexto del cliente suelen ser el mayor riesgo.",
  dimensionWeights: [
    {
      dimension: "team",
      weight: 3,
      pattern: "La utilización y la asignación del equipo suele carecer de visibilidad.",
    },
    {
      dimension: "customers",
      weight: 3,
      pattern:
        "El contexto del cliente entre personas es el riesgo de continuidad más común.",
    },
    {
      dimension: "operations",
      weight: 2,
      pattern:
        "Los traspasos entre la toma del encargo y la entrega generan la mayoría de los retrasos.",
    },
  ],
};

/**
 * The full curated set. Deliberately small — one playbook per industry the
 * product already recognizes (`data/catalog.ts` → `INDUSTRY_PROFILES`), plus
 * the generic fallback. Growing this list is a content change, not a new
 * ranking engine.
 */
export const INDUSTRY_PLAYBOOKS: Record<Industry, IndustryPlaybook> = {
  manufacturing: MANUFACTURING_PLAYBOOK,
  construction: CONSTRUCTION_PLAYBOOK,
  distribution: DISTRIBUTION_PLAYBOOK,
  healthcare: HEALTHCARE_PLAYBOOK,
  retail: RETAIL_PLAYBOOK,
  services: SERVICES_PLAYBOOK,
  other: GENERIC_PLAYBOOK,
  unknown: GENERIC_PLAYBOOK,
};

/** Every industry resolves to a playbook — generic when nothing more specific applies. */
export function getIndustryPlaybook(industry: Industry): IndustryPlaybook {
  return INDUSTRY_PLAYBOOKS[industry] ?? GENERIC_PLAYBOOK;
}

/** Additive priority nudge for one dimension under this industry's playbook, or 0. */
export function industryDimensionWeight(
  industry: Industry,
  dimension: DiscoveryDimension,
): number {
  const playbook = getIndustryPlaybook(industry);
  const match = playbook.dimensionWeights.find((item) => item.dimension === dimension);
  return match?.weight ?? 0;
}

/** The anonymized pattern behind a dimension's weight, when one exists. */
export function industryDimensionPattern(
  industry: Industry,
  dimension: DiscoveryDimension,
): string | null {
  const playbook = getIndustryPlaybook(industry);
  const match = playbook.dimensionWeights.find((item) => item.dimension === dimension);
  return match?.pattern ?? null;
}
