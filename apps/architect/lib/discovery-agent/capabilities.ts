/**
 * Capability Digital Twin — client-visible, per-capability intelligence.
 *
 * Answers, for ten business capabilities a client actually recognizes
 * (Ventas, Operaciones, Finanzas, RRHH, Marketing, Atención al Cliente,
 * Compras, Legal, Cumplimiento, Tecnología): what do we know, what don't we
 * know, how confident is that honestly, why is it low, and what would raise
 * it.
 *
 * This is presentation, not a second brain. There is no new scoring model
 * here: every confidence number is the exact `DimensionStatus.confidence`
 * `computeDiscoveryScore` already publishes (averaged only when a capability
 * spans more than one discovery dimension — a trivial aggregation, never a
 * re-weighting), every "known" fact is a real `EvidenceSignal` already
 * collected by the Readiness Engine's evidence boundary, every "unknown" gap
 * is a real evidence-fact key from `DIMENSION_EVIDENCE_KEYS`, and every "how
 * to raise it" line reuses the Missing Information Engine's own ranked
 * opportunity or upload hint for that same key.
 *
 * Capabilities that no existing engine measures yet (Legal, Cumplimiento)
 * are shown honestly as not measured — zero, never a fabricated percentage.
 *
 * Full write-up: `CAPABILITY_DIGITAL_TWIN.md`.
 */

import { missingInformationUploadHint } from "@/lib/readiness/topics";
import type { CompanyWorkspace, DiscoveryDimension } from "@/types";
import {
  buildMissingInformationReport,
  evaluateReadiness,
  missingInformationLabel,
  snapshotFromWorkspace,
  type EvidenceSnapshot,
  type MissingInformationReport,
} from "@/lib/readiness";

export type CapabilityId =
  | "sales"
  | "operations"
  | "finance"
  | "hr"
  | "marketing"
  | "customer_service"
  | "purchasing"
  | "legal"
  | "compliance"
  | "technology";

export interface CapabilityTwin {
  id: CapabilityId;
  /** Client-facing Spanish label, e.g. "Ventas" — engine-owned, same rule as the rest of `lib/readiness`. */
  label: string;
  /** ✓ real evidence statements already collected — never a generic label when a real fact exists. */
  known: string[];
  /** ✗ concrete gaps, in the words a consultant would use — same catalog `lib/readiness` uses. */
  unknown: string[];
  /** 0–100, honest and evidence-only: the same dimension confidence(s) already published elsewhere. */
  confidence: number;
  /** False only for `Empty company` / capabilities with zero known evidence — drives "Sin suficiente información". */
  hasEvidence: boolean;
  /** Human Spanish explanation of why confidence is what it is. `null` once every tracked gap is closed. */
  whyLow: string | null;
  /** Concrete next step(s), reusing the Missing Information Engine when a ranked opportunity exists. */
  howToRaise: string[];
  /** False for capabilities no current engine tracks yet (Legal, Cumplimiento). */
  measured: boolean;
}

export interface CapabilityDigitalTwinReport {
  generatedAt: string;
  capabilities: CapabilityTwin[];
  /** One-line summary of how many capabilities already have some evidence. */
  headline: string;
}

interface CapabilityKeyRef {
  key: string;
  dimension: DiscoveryDimension;
}

interface CapabilityDefinition {
  id: CapabilityId;
  label: string;
  /** Discovery dimensions this capability reads confidence from — never recomputed. */
  dimensions: DiscoveryDimension[];
  /**
   * Evidence-fact keys this capability is about, each already owned by one of
   * `dimensions` in `DIMENSION_EVIDENCE_KEYS` (`lib/reasoning/confidence/score.ts`).
   * Capabilities that share a dimension (e.g. Marketing and Atención al
   * Cliente both read `customers`) point at different keys so their
   * known/unknown lists never just repeat each other.
   */
  keys: CapabilityKeyRef[];
}

/**
 * Ten client-facing capabilities mapped onto the eight discovery dimensions
 * the platform already reasons about. No parallel taxonomy: every key below
 * is one `computeDiscoveryScore` already counts. Legal and Cumplimiento have
 * no dimension today — shown honestly as not measured rather than guessed.
 */
const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  {
    id: "sales",
    label: "Ventas",
    dimensions: ["sales"],
    keys: [
      { key: "sales_motion", dimension: "sales" },
      { key: "order_intake", dimension: "sales" },
    ],
  },
  {
    id: "operations",
    label: "Operaciones",
    dimensions: ["operations"],
    keys: [
      { key: "bottlenecks", dimension: "operations" },
      { key: "fulfillment", dimension: "operations" },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    dimensions: ["finance"],
    keys: [
      { key: "finance_process", dimension: "finance" },
      { key: "collections", dimension: "finance" },
      { key: "revenue_stage", dimension: "finance" },
    ],
  },
  {
    id: "hr",
    label: "Recursos Humanos",
    dimensions: ["team"],
    keys: [
      { key: "team_structure", dimension: "team" },
      { key: "departments", dimension: "team" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    dimensions: ["customers", "geography"],
    keys: [
      { key: "customer_contact", dimension: "customers" },
      { key: "geography", dimension: "geography" },
    ],
  },
  {
    id: "customer_service",
    label: "Atención al Cliente",
    dimensions: ["customers"],
    keys: [{ key: "customer_count", dimension: "customers" }],
  },
  {
    id: "purchasing",
    label: "Compras",
    dimensions: ["finance", "operations"],
    keys: [
      { key: "approvals", dimension: "finance" },
      { key: "inventory_flow", dimension: "operations" },
    ],
  },
  {
    id: "legal",
    label: "Legal",
    dimensions: [],
    keys: [],
  },
  {
    id: "compliance",
    label: "Cumplimiento",
    dimensions: [],
    keys: [],
  },
  {
    id: "technology",
    label: "Tecnología",
    dimensions: ["systems"],
    keys: [
      { key: "current_software", dimension: "systems" },
      { key: "information_storage", dimension: "systems" },
      { key: "excel_depth", dimension: "systems" },
      { key: "whatsapp_depth", dimension: "systems" },
      { key: "paper_depth", dimension: "systems" },
    ],
  },
];

/**
 * Discovery dimensions a capability is read from — reused by the guided
 * interview deep link (Mission 20) to know which stage to jump straight to
 * for a given missing capability, without inventing a second taxonomy.
 * Empty for capabilities no engine measures yet (Legal, Cumplimiento).
 */
export function capabilityDimensions(id: CapabilityId): DiscoveryDimension[] {
  return CAPABILITY_DEFINITIONS.find((def) => def.id === id)?.dimensions ?? [];
}

const MAX_KNOWN_ITEMS = 5;

function isKeyMissing(snapshot: EvidenceSnapshot, ref: CapabilityKeyRef): boolean {
  return (snapshot.missingEvidenceKeys[ref.dimension] ?? []).includes(ref.key);
}

/** Real evidence statements already collected for these dimensions — never a generic label. */
function knownStatementsFor(
  snapshot: EvidenceSnapshot,
  dimensions: DiscoveryDimension[],
  limit: number,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const signal of snapshot.signals) {
    if (!signal.topic || !dimensions.includes(signal.topic)) continue;
    const text = signal.statement.trim();
    if (!text || seen.has(text.toLowerCase())) continue;
    seen.add(text.toLowerCase());
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
}

function buildNotMeasured(def: CapabilityDefinition): CapabilityTwin {
  return {
    id: def.id,
    label: def.label,
    known: [],
    unknown: [],
    confidence: 0,
    hasEvidence: false,
    whyLow:
      "ISALWA todavía no tiene un motor de evidencia dedicado a esta capacidad — cualquier lectura aquí sería una suposición, no evidencia real.",
    howToRaise: [
      "Documentar esta área manualmente (contratos, políticas, obligaciones normativas) hasta que el motor de evidencia la incorpore.",
    ],
    measured: false,
  };
}

function buildCapability(
  def: CapabilityDefinition,
  snapshot: EvidenceSnapshot,
  missing: MissingInformationReport,
): CapabilityTwin {
  if (def.dimensions.length === 0) return buildNotMeasured(def);

  const knownKeys = def.keys.filter((ref) => !isKeyMissing(snapshot, ref));
  const unknownKeys = def.keys.filter((ref) => isKeyMissing(snapshot, ref));

  const unknownLabels = unknownKeys
    .map((ref) => missingInformationLabel(ref.key))
    .filter((label): label is string => label !== null);

  let known = knownStatementsFor(snapshot, def.dimensions, MAX_KNOWN_ITEMS);
  if (known.length === 0 && knownKeys.length > 0) {
    // No raw statement carried the fact through, but the evidence exists —
    // fall back to the same label catalog `lib/readiness` uses, reframed as
    // known rather than missing.
    known = knownKeys
      .map((ref) => missingInformationLabel(ref.key))
      .filter((label): label is string => label !== null)
      .map((label) => `Sabemos ${label}.`);
  }

  const relevantDimensions = snapshot.dimensions.filter((dimension) =>
    def.dimensions.includes(dimension.id),
  );
  const confidence =
    relevantDimensions.length > 0
      ? Math.round(
          relevantDimensions.reduce((sum, dimension) => sum + dimension.confidence, 0) /
            relevantDimensions.length,
        )
      : 0;

  const hasEvidence = knownKeys.length > 0;

  let whyLow: string | null;
  if (!hasEvidence) {
    whyLow = `Todavía no hay evidencia registrada sobre ${def.label.toLowerCase()}.`;
  } else if (unknownLabels.length > 0) {
    const rest = unknownLabels.length - 1;
    whyLow =
      rest > 0
        ? `Necesitamos entender ${unknownLabels[0]}, y ${rest} tema${rest === 1 ? "" : "s"} más.`
        : `Necesitamos entender ${unknownLabels[0]}.`;
  } else {
    whyLow = null;
  }

  const howToRaise: string[] = [];
  if (unknownLabels.length > 0) {
    const opportunity = missing.opportunities.find((item) =>
      def.dimensions.includes(item.topic),
    );
    if (opportunity) {
      howToRaise.push(opportunity.headline);
    } else {
      const hints = unknownKeys
        .map((ref) => missingInformationUploadHint(ref.key))
        .filter((hint): hint is string => hint !== null);
      howToRaise.push(
        hints.length > 0
          ? `Sube ${hints[0]}${hints[1] ? ` o ${hints[1]}` : ""} para cerrar este vacío.`
          : "Cuéntanos esto en la próxima conversación con el equipo.",
      );
    }
  }

  return {
    id: def.id,
    label: def.label,
    known,
    unknown: unknownLabels,
    confidence,
    hasEvidence,
    whyLow,
    howToRaise,
    measured: true,
  };
}

/** Build the report from an already-computed snapshot and Missing Information report. */
export function buildCapabilityDigitalTwin(
  snapshot: EvidenceSnapshot,
  missing: MissingInformationReport,
): CapabilityDigitalTwinReport {
  const capabilities = CAPABILITY_DEFINITIONS.map((def) =>
    buildCapability(def, snapshot, missing),
  );
  const withEvidence = capabilities.filter((capability) => capability.hasEvidence).length;

  const headline =
    withEvidence === 0
      ? "Todavía no hay evidencia suficiente para calificar ninguna capacidad — esto se irá completando con respuestas, documentos y reuniones."
      : `Ya tenemos alguna lectura en ${withEvidence} de ${capabilities.length} capacidades del negocio.`;

  return {
    generatedAt: snapshot.capturedAt,
    capabilities,
    headline,
  };
}

/** Capability Digital Twin for a company workspace — the entry point every screen uses. */
export function assessCapabilityDigitalTwin(
  workspace: CompanyWorkspace,
): CapabilityDigitalTwinReport {
  const snapshot = snapshotFromWorkspace(workspace);
  const assessment = evaluateReadiness(snapshot);
  const missing = buildMissingInformationReport(snapshot, assessment, workspace.industry);
  return buildCapabilityDigitalTwin(snapshot, missing);
}
