/**
 * Unified Business Knowledge Intake — deterministic business signal detectors.
 *
 * This module is the *extraction of what already existed* in
 * `extractors.ts` (`scanTextSignals`: departments, systems, roles, pain,
 * opportunity, rules) plus the six categories the AI Document Processing
 * Pipeline needs on top of it — vendors, software, processes, risks, KPIs,
 * approvals, handoffs and policies. It is not a second extractor: the one
 * caller is `extractors.ts`, so meeting transcripts, manual notes and
 * document text all get the exact same twelve detectors.
 *
 * Everything here is deterministic keyword/pattern matching over plain text.
 * No model call, no NLP, no inference. Every detection carries an `Evidence`
 * record with the literal sentence it came from, so nothing downstream can
 * present a finding without being able to show the sentence behind it.
 *
 * Detections are filed into the *existing* `IntakeSlots` — there is no new
 * store and no new taxonomy:
 *
 *   people      → entity `Person`        vendors    → entity `Supplier`
 *   departments → entity `Department`    processes  → entity `Workflow`
 *   systems     → entity `System`        software   → entity `System`
 *   pain points → `painSignals`          risks      → `painSignals` (kind "risk")
 *   KPIs        → `facts` (key "kpi")    policies   → `businessRules`
 *   approvals   → `businessRules` + relationship `Approves`
 *   handoffs    → relationship `CommunicatesWith`
 */

import { createId, nowIso } from "@/lib/utils";
import type { KnowledgeEntity, KnowledgeEntityKind, KnowledgeRelationKind } from "@/types";
import type {
  DetectionCategory,
  DetectionCounts,
  Evidence,
  IntakeEntity,
  IntakeSlots,
  IntakeUnit,
} from "./contracts";
import {
  DETECTION_CATEGORIES,
  emptyDetectionCounts,
  emptyIntakeSlots,
} from "./contracts";

export function mergeDetectionCounts(
  a: DetectionCounts,
  b: DetectionCounts,
): DetectionCounts {
  return DETECTION_CATEGORIES.reduce((acc, category) => {
    acc[category] = a[category] + b[category];
    return acc;
  }, {} as DetectionCounts);
}

export function totalDetections(counts: DetectionCounts): number {
  return DETECTION_CATEGORIES.reduce((sum, category) => sum + counts[category], 0);
}

/**
 * A single sentence is the smallest unit we will attribute a finding to, and
 * we stop at a fixed count so a 400-page document can never turn one upload
 * into an unbounded write. Documents longer than this are still fully
 * chunked and embedded (see `lib/documents/chunking.ts`) — only the
 * keyword scan is capped.
 */
export const MAX_SCANNED_SENTENCES = 120;

/**
 * Canonical names keep the knowledge graph from growing three nodes for the
 * same department. "sales", "ventas" and "Ventas" all resolve to one
 * `Department: Ventas` node; matching is on the lowercased matched text.
 */
const CANONICAL_NAMES: Record<string, string> = {
  // Departments
  ventas: "Ventas",
  sales: "Ventas",
  finanzas: "Finanzas",
  finance: "Finanzas",
  contabilidad: "Finanzas",
  accounting: "Finanzas",
  operaciones: "Operaciones",
  operations: "Operaciones",
  "recursos humanos": "Recursos Humanos",
  rrhh: "Recursos Humanos",
  hr: "Recursos Humanos",
  compras: "Compras",
  purchasing: "Compras",
  procurement: "Compras",
  produccion: "Producción",
  producción: "Producción",
  production: "Producción",
  logistica: "Logística",
  logística: "Logística",
  logistics: "Logística",
  almacen: "Almacén",
  almacén: "Almacén",
  warehouse: "Almacén",
  bodega: "Almacén",
  marketing: "Marketing",
  "atencion al cliente": "Atención al Cliente",
  "atención al cliente": "Atención al Cliente",
  "customer service": "Atención al Cliente",
  soporte: "Atención al Cliente",
  // Roles
  gerente: "Gerente",
  manager: "Gerente",
  director: "Director",
  directora: "Director",
  encargado: "Encargado",
  encargada: "Encargado",
  supervisor: "Supervisor",
  supervisora: "Supervisor",
  jefe: "Jefe",
  jefa: "Jefe",
  coordinador: "Coordinador",
  coordinadora: "Coordinador",
  responsable: "Responsable",
  dueno: "Dueño",
  dueño: "Dueño",
  duena: "Dueño",
  dueña: "Dueño",
  owner: "Dueño",
  founder: "Fundador",
  fundador: "Fundador",
  fundadora: "Fundador",
  ceo: "CEO",
  cfo: "CFO",
  coo: "COO",
  cto: "CTO",
  contador: "Contador",
  contadora: "Contador",
  vendedor: "Vendedor",
  vendedora: "Vendedor",
  // Systems (categories, not products)
  erp: "ERP",
  crm: "CRM",
  wms: "WMS",
  pos: "Punto de venta",
  "punto de venta": "Punto de venta",
  "base de datos": "Base de datos",
  database: "Base de datos",
  sistema: "Sistema interno",
  plataforma: "Plataforma interna",
  intranet: "Intranet",
  // Software (named products)
  excel: "Excel",
  sheets: "Google Sheets",
  "google sheets": "Google Sheets",
  whatsapp: "WhatsApp",
  quickbooks: "QuickBooks",
  sap: "SAP",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  odoo: "Odoo",
  zoho: "Zoho",
  xero: "Xero",
  monday: "Monday",
  jira: "Jira",
  shopify: "Shopify",
  notion: "Notion",
  trello: "Trello",
  asana: "Asana",
  slack: "Slack",
  dropbox: "Dropbox",
  drive: "Google Drive",
  "google drive": "Google Drive",
  onedrive: "OneDrive",
  sharepoint: "SharePoint",
  outlook: "Outlook",
  teams: "Microsoft Teams",
  zoom: "Zoom",
  access: "Microsoft Access",
  correo: "Correo electrónico",
  email: "Correo electrónico",
  // Vendors
  proveedor: "Proveedor",
  proveedores: "Proveedor",
  vendor: "Proveedor",
  supplier: "Proveedor",
  contratista: "Contratista",
  subcontratista: "Contratista",
  outsourcing: "Servicio tercerizado",
  tercerizado: "Servicio tercerizado",
  "un tercero": "Tercero",
  agencia: "Agencia externa",
  distribuidor: "Distribuidor",
  mayorista: "Distribuidor",
  // Processes
  proceso: "Proceso operativo",
  procedimiento: "Procedimiento",
  flujo: "Flujo de trabajo",
  workflow: "Flujo de trabajo",
  onboarding: "Onboarding",
  "cierre de mes": "Cierre de mes",
  facturacion: "Facturación",
  facturación: "Facturación",
  factura: "Facturación",
  facturas: "Facturación",
  invoice: "Facturación",
  invoicing: "Facturación",
  billing: "Facturación",
  cobranza: "Cobranza",
  inventario: "Inventario",
  despacho: "Despacho",
  sop: "Procedimiento",
};

interface EntityDetector {
  category: DetectionCategory;
  kind: KnowledgeEntityKind;
  pattern: RegExp;
  confidence: number;
}

/**
 * Entity detectors run in this order and each contributes at most one entity
 * per sentence — first match wins for that category. Patterns are the ones
 * this codebase already shipped (`DEPARTMENT_PATTERN`, `SYSTEM_PATTERN`,
 * `ROLE_PATTERN`), widened, plus the four new entity categories.
 */
const ENTITY_DETECTORS: readonly EntityDetector[] = [
  {
    category: "departments",
    kind: "Department",
    pattern:
      /ventas|sales|finanzas|contabilidad|accounting|finance|operaciones|operations|recursos humanos|\brrhh\b|\bhr\b|compras|purchasing|procurement|producci[oó]n|production|log[ií]stica|logistics|almac[eé]n|warehouse|bodega|marketing|atenci[oó]n al cliente|customer service|soporte/i,
    confidence: 0.6,
  },
  {
    category: "software",
    kind: "System",
    pattern:
      /excel|google sheets|sheets|whatsapp|quickbooks|\bsap\b|salesforce|hubspot|odoo|zoho|xero|monday|jira|shopify|notion|trello|asana|slack|dropbox|google drive|onedrive|sharepoint|outlook|teams|zoom|access|correo|email/i,
    confidence: 0.62,
  },
  {
    category: "systems",
    kind: "System",
    pattern:
      /\berp\b|\bcrm\b|\bwms\b|\bpos\b|punto de venta|base de datos|database|intranet|sistema|plataforma/i,
    confidence: 0.58,
  },
  {
    category: "people",
    kind: "Person",
    pattern:
      /gerente|director[a]?|encargad[oa]|supervisor[a]?|jef[ea]|coordinador[a]?|responsable|due[nñ]{1,2}[oa]|owner|founder|fundador[a]?|\bceo\b|\bcfo\b|\bcoo\b|\bcto\b|contador[a]?|vendedor[a]?|manager/i,
    confidence: 0.5,
  },
  {
    category: "vendors",
    kind: "Supplier",
    pattern:
      /proveedor(?:es)?|vendor|supplier|contratista|subcontratista|outsourcing|terceriz[a-z]*|un tercero|agencia|distribuidor|mayorista/i,
    confidence: 0.55,
  },
  {
    category: "processes",
    kind: "Workflow",
    pattern:
      /proceso|procedimiento|\bflujo\b|workflow|onboarding|cierre de mes|facturaci[oó]n|facturas?|invoic(?:e|ing)|billing|cobranza|inventario|despacho|\bsop\b/i,
    confidence: 0.55,
  },
] as const;

/** Existing pain vocabulary, unchanged, plus the ways clients actually phrase it. */
const PAIN_PATTERN =
  /problema|lento|demora|\berror\b|falla|cuello de botella|se pierde|manual(mente)?|duplicad[oa]|no hay visibilidad|retraso|reproces|a mano|dos veces|se nos pasa|no sabemos cu[aá]nto/i;

const OPPORTUNITY_PATTERN =
  /oportunidad|podr[ií]amos|deber[ií]amos|automatizar|mejorar|ahorrar|reducir tiempo|falta un sistema|ser[ií]a [uú]til/i;

/**
 * Risks are distinct from pain points: a pain point is something that hurts
 * today, a risk is something that would hurt if it happened. Both land in the
 * existing PainPoint engine (`mergePainSignalsIntoWorkspace`) — risks carry
 * `kind: "risk"` so the merge can file them at critical severity instead of
 * inventing a parallel risk register.
 */
const RISK_PATTERN =
  /\briesgo(?:s)?\b|dependencia cr[ií]tica|punto [uú]nico de falla|single point of failure|sin respaldo|sin backup|incumplimiento|multa|sanci[oó]n|penalizaci[oó]n|vulnerab|expuesto|rotaci[oó]n de personal|solo una persona|[uú]nica persona que sabe|si se va|se cae el sistema|fuga de (?:datos|informaci[oó]n|clientes)/i;

/**
 * A KPI needs a name *and* something measurable next to it — a bare mention
 * of "métrica" is not a KPI. Requiring a number or a percentage keeps this
 * from turning every sentence into an indicator.
 */
const KPI_NAME_PATTERN =
  /\bkpi\b|indicador|m[eé]trica|\bmetric\b|\bsla\b|\bnps\b|churn|conversi[oó]n|margen|ticket promedio|tiempo promedio|tasa de|porcentaje de|productividad|meta (?:mensual|anual|del mes)|objetivo de/i;
const MEASURE_PATTERN = /\d+(?:[.,]\d+)?\s*%|\d+(?:[.,]\d+)?\s*(?:d[ií]as|horas|minutos|semanas|meses|unidades|pedidos|clientes|usd|mxn|eur|dop)|\$\s*\d/i;

const APPROVAL_PATTERN =
  /aprobaci[oó]n|aprueba|aprobar|autoriza(?:ci[oó]n|r)?|visto bueno|firma de|sign-?off|requiere (?:el )?ok de|approval|approve/i;

const HANDOFF_PATTERN =
  /pasa a|se env[ií]a a|env[ií]a a|entrega a|se entrega a|deriva a|traspasa|hand-?off|reenv[ií]a a|escala a|coordina con|le manda a|se lo pasa/i;

const POLICY_PATTERN =
  /pol[ií]tica|policy|reglamento|normativa|lineamiento|manual de|c[oó]digo de conducta|cumplimiento|compliance|siempre se debe|nunca se debe|es pol[ií]tica|no se permite|\bregla\b|obligatorio/i;

/**
 * Global twins of the detector patterns, compiled once. Relationship
 * detection needs *where* in the sentence each entity appears, not just
 * whether it appears, and `exec` on a non-global regex only ever reports the
 * first match.
 */
const GLOBAL_ENTITY_PATTERNS: readonly RegExp[] = ENTITY_DETECTORS.map(
  (detector) => new RegExp(detector.pattern.source, "gi"),
);

interface SentenceEntity {
  category: DetectionCategory;
  kind: KnowledgeEntityKind;
  name: string;
  confidence: number;
  start: number;
  end: number;
}

/**
 * Every entity mention in one sentence, in reading order, with overlapping
 * matches resolved in favour of the earlier detector (departments before
 * software before systems, and so on). Reading order is what lets a handoff
 * become a directed edge instead of an unordered pair.
 */
function entitiesInSentence(sentence: string): SentenceEntity[] {
  const found: SentenceEntity[] = [];

  ENTITY_DETECTORS.forEach((detector, detectorIndex) => {
    const pattern = GLOBAL_ENTITY_PATTERNS[detectorIndex]!;
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(sentence)) !== null) {
      found.push({
        category: detector.category,
        kind: detector.kind,
        name: canonicalName(match[0]!),
        confidence: detector.confidence,
        start: match.index,
        end: match.index + match[0]!.length,
      });
      if (match.index === pattern.lastIndex) pattern.lastIndex += 1;
    }
  });

  // Stable order: position first, detector priority second.
  found.sort((a, b) => a.start - b.start);

  const accepted: SentenceEntity[] = [];
  for (const candidate of found) {
    const overlaps = accepted.some(
      (taken) => candidate.start < taken.end && taken.start < candidate.end,
    );
    if (!overlaps) accepted.push(candidate);
  }
  return accepted;
}

/**
 * Turn "A … verb … B" into a directed edge. Spanish reads subject-first, so
 * the first entity before the verb is the actor and the first one after it
 * is the target. When either end is missing the edge is not created — a
 * one-sided mention is a statement, not a structure, and inventing the other
 * endpoint would be exactly the kind of fabrication this codebase refuses.
 */
function directedPair(
  entities: SentenceEntity[],
  verbIndex: number,
): { from: SentenceEntity; to: SentenceEntity } | null {
  const from = entities.find((entity) => entity.end <= verbIndex);
  const to = entities.find((entity) => entity.start >= verbIndex);
  if (!from || !to) return null;
  if (from.kind === to.kind && from.name === to.name) return null;
  return { from, to };
}

/**
 * Knowledge Memory Links — the living graph. `directedPair` alone only ever
 * connects two entities that share a sentence, so "We use QuickBooks."
 * stays an orphan mention (there is no explicit subject — "we" is implicit).
 * An anchor is the most recently named entity of a given kind, carried
 * forward sentence by sentence within one scan and seeded, at the start of
 * the scan, from every entity this workspace already knows about — so the
 * same resolution works across turns and across separate uploads, not just
 * within one paragraph. Related evidence keeps linking into one graph
 * instead of resetting on every new document.
 */
export type EntityAnchor = { kind: KnowledgeEntityKind; name: string };
type AnchorMap = Partial<Record<KnowledgeEntityKind, EntityAnchor>>;

/** Only kinds that plausibly act as the subject *or* object of a business relationship anchor. */
const ANCHOR_KINDS: readonly KnowledgeEntityKind[] = [
  "Department",
  "Person",
  "System",
  "Workflow",
  "Supplier",
];

/**
 * Seed anchors from the workspace's already-merged Knowledge Engine entities.
 * `KnowledgeEntity[]` is append-only (see `entities.ts`), so array order is
 * chronological — the last entity of a given kind is the one most recently
 * discussed, whether that was three sentences ago or in last week's upload.
 */
function seedAnchors(priorEntities: readonly KnowledgeEntity[]): AnchorMap {
  const anchors: AnchorMap = {};
  for (const entity of priorEntities) {
    if (ANCHOR_KINDS.includes(entity.kind)) {
      anchors[entity.kind] = { kind: entity.kind, name: entity.name };
    }
  }
  return anchors;
}

function updateAnchors(anchors: AnchorMap, found: readonly SentenceEntity[]): void {
  for (const entity of found) {
    if (ANCHOR_KINDS.includes(entity.kind)) {
      anchors[entity.kind] = { kind: entity.kind, name: entity.name };
    }
  }
}

interface ResolvedPair {
  fromName: string;
  fromKind: KnowledgeEntityKind;
  toName: string;
  toKind: KnowledgeEntityKind;
  /** True when one endpoint came from context (an earlier sentence or an earlier document) instead of this sentence — carries a lower confidence, never the same as an explicit pair. */
  anchored: boolean;
}

/**
 * Same directed-pair contract as `directedPair`, widened in two steps before
 * ever inventing structure:
 *
 *  1. Both a subject-kind and an object-kind entity are named somewhere in
 *     the sentence, just not in the strict before-verb/after-verb shape
 *     `directedPair` requires (e.g. "We use QuickBooks for accounting" — the
 *     department trails the object). Still fully explicit, so no confidence
 *     penalty.
 *  2. Only one side is named in the sentence at all — the other resolves
 *     from the running anchor context. This only fires when there is
 *     exactly one candidate for the missing role, so an ambiguous sentence
 *     (two systems, no clear one) is left alone rather than guessed.
 */
function directedPairWithAnchor(
  entities: SentenceEntity[],
  verbIndex: number,
  anchors: AnchorMap,
  subjectKinds: readonly KnowledgeEntityKind[],
  objectKinds: readonly KnowledgeEntityKind[],
): ResolvedPair | null {
  const exact = directedPair(entities, verbIndex);
  if (exact) {
    return {
      fromName: exact.from.name,
      fromKind: exact.from.kind,
      toName: exact.to.name,
      toKind: exact.to.kind,
      anchored: false,
    };
  }

  const subjectCandidates = entities.filter((e) => subjectKinds.includes(e.kind));
  const objectCandidates = entities.filter((e) => objectKinds.includes(e.kind));

  if (subjectCandidates.length === 1 && objectCandidates.length === 1) {
    const subject = subjectCandidates[0]!;
    const object = objectCandidates[0]!;
    if (!(subject.kind === object.kind && subject.name === object.name)) {
      return {
        fromName: subject.name,
        fromKind: subject.kind,
        toName: object.name,
        toKind: object.kind,
        anchored: false,
      };
    }
  }

  if (objectCandidates.length === 1 && subjectCandidates.length === 0) {
    const only = objectCandidates[0]!;
    const subject = subjectKinds
      .map((kind) => anchors[kind])
      .find((anchor): anchor is EntityAnchor => Boolean(anchor));
    if (subject && !(subject.kind === only.kind && subject.name === only.name)) {
      return {
        fromName: subject.name,
        fromKind: subject.kind,
        toName: only.name,
        toKind: only.kind,
        anchored: true,
      };
    }
  }

  if (subjectCandidates.length === 1 && objectCandidates.length === 0) {
    const only = subjectCandidates[0]!;
    const object = objectKinds
      .map((kind) => anchors[kind])
      .find((anchor): anchor is EntityAnchor => Boolean(anchor));
    if (object && !(object.kind === only.kind && object.name === only.name)) {
      return {
        fromName: only.name,
        fromKind: only.kind,
        toName: object.name,
        toKind: object.kind,
        anchored: true,
      };
    }
  }

  return null;
}

/**
 * Beyond approvals and handoffs, four more relationship shapes turn isolated
 * mentions into a graph: who uses which system, what depends on what, who
 * owns a process/system/department, and who a department or person buys
 * from. Same deterministic-keyword contract as every other detector here —
 * no model call, every hit still carries the literal sentence as evidence.
 */
const USES_PATTERN =
  /\busa(?:mos)?\b|\butiliza(?:mos)?\b|trabaja(?:mos)? con|se (?:usa|utiliza)|manejamos (?:con|en)|\buses?\b|\busing\b/i;
const DEPENDS_PATTERN =
  /depende(?:mos)? de|dependencia de|requiere(?:mos)?|necesita(?:mos)?|\bdepends? on\b|\brequires?\b/i;
const OWNS_PATTERN =
  /es responsable de|est[aá] a cargo de|encargad[oa] de|due[nñ]{1,2}[oa] de|a cargo de|\bowns?\b|is responsible for|in charge of/i;
const PURCHASES_PATTERN =
  /compra(?:mos)? a|le compramos a|adquiere(?:mos)? de|\bpurchases? from\b|\bbuys? from\b/i;

interface RelationVerbDetector {
  kind: KnowledgeRelationKind;
  pattern: RegExp;
  subjectKinds: readonly KnowledgeEntityKind[];
  objectKinds: readonly KnowledgeEntityKind[];
  confidence: number;
}

const RELATION_VERB_DETECTORS: readonly RelationVerbDetector[] = [
  {
    kind: "Uses",
    pattern: USES_PATTERN,
    subjectKinds: ["Department", "Person", "Workflow"],
    objectKinds: ["System"],
    confidence: 0.5,
  },
  {
    kind: "DependsOn",
    pattern: DEPENDS_PATTERN,
    subjectKinds: ["Workflow", "System"],
    objectKinds: ["System", "Supplier"],
    confidence: 0.5,
  },
  {
    kind: "Owns",
    pattern: OWNS_PATTERN,
    subjectKinds: ["Person"],
    objectKinds: ["Workflow", "System", "Department"],
    confidence: 0.5,
  },
  {
    kind: "Purchases",
    pattern: PURCHASES_PATTERN,
    subjectKinds: ["Department", "Person"],
    objectKinds: ["Supplier"],
    confidence: 0.5,
  },
] as const;

/**
 * Cadence is not a new relationship kind — it is the context that turns a
 * process from a bare noun into an operating rhythm ("Facturación" → runs
 * weekly). Every hit is captured as an auditable fact and, when a process is
 * named in the same sentence, tagged onto that Workflow entity's own
 * metadata (already a free-form string map) so the graph can show
 * "Facturación · Semanal" without a new store or a new relationship type.
 * Spanish canonical values only — client-visible graph labels stay Spanish
 * regardless of which language the source sentence was written in.
 */
function cadenceLabel(sentence: string): string | null {
  const lower = sentence.toLowerCase();
  if (/diari|todos los d[ií]as|cada d[ií]a|\bdaily\b|every day/.test(lower)) {
    return "Diario";
  }
  if (/quincenal|cada quince d[ií]as|\bbiweekly\b/.test(lower)) {
    return "Quincenal";
  }
  if (
    /semanal|cada semana|cada (lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)|\bweekly\b|every (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/.test(
      lower,
    )
  ) {
    return "Semanal";
  }
  if (/mensual|cada mes|cada fin de mes|\bmonthly\b|every month/.test(lower)) {
    return "Mensual";
  }
  if (/anual|cada a[nñ]o|\bannually\b|\byearly\b|every year/.test(lower)) {
    return "Anual";
  }
  return null;
}

export interface DetectionResult {
  slots: IntakeSlots;
  evidence: Evidence[];
  detections: DetectionCounts;
  /** How many sentences were actually scanned — honest input for the run log. */
  scannedSentences: number;
}

function evidenceFor(
  unit: IntakeUnit,
  statement: string,
  confidence: number,
  slot: Evidence["slot"],
): Evidence {
  return {
    id: createId("evidence"),
    workspaceId: unit.workspaceId,
    sourceType: unit.sourceType,
    sourceId: unit.id,
    sourceLabel: unit.label,
    capturedAt: nowIso(),
    statement,
    confidence,
    slot,
  };
}

function canonicalName(match: string): string {
  const normalized = match.trim().toLowerCase().replace(/\s+/g, " ");
  const canonical = CANONICAL_NAMES[normalized];
  if (canonical) return canonical;
  return normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\n;])\s+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length > 3);
}

/**
 * Run all twelve detectors over free text. The only caller is
 * `extractors.ts`; document text, meeting transcripts and manual notes all
 * arrive here, so a finding means the same thing regardless of which door
 * the evidence came through.
 *
 * `priorEntities` is the Knowledge Memory Links seam: pass the workspace's
 * already-merged Knowledge Engine entities and pronoun-style references
 * ("we", "el proceso", a bare system name with no named owner) resolve
 * against whatever department/person/system/process this workspace already
 * has on record, so systems, processes, people, cadence and owners keep
 * linking into one graph across turns instead of starting cold every scan.
 * Omit it (or pass []) for a scan with no workspace context yet — every
 * relationship then falls back to same-sentence pairing only, exactly as
 * before this seam existed.
 */
export function detectBusinessSignals(
  unit: IntakeUnit,
  text: string,
  priorEntities: readonly KnowledgeEntity[] = [],
): DetectionResult {
  const slots = emptyIntakeSlots();
  const evidence: Evidence[] = [];
  const detections = emptyDetectionCounts();
  const seenEntities = new Set<string>();
  const anchors = seedAnchors(priorEntities);

  const sentences = splitSentences(text).slice(0, MAX_SCANNED_SENTENCES);

  for (const sentence of sentences) {
    const factEv = evidenceFor(unit, sentence, 0.55, "fact");
    evidence.push(factEv);
    slots.facts.push({
      id: createId("fact"),
      key: null,
      statement: sentence,
      evidenceIds: [factEv.id],
      confidence: 0.55,
    });

    const sentenceEntities = entitiesInSentence(sentence);
    const sentenceEntityRefs: IntakeEntity[] = [];
    for (const found of sentenceEntities) {
      const added = addEntity(
        slots,
        evidence,
        unit,
        seenEntities,
        found.kind,
        found.name,
        sentence,
        found.confidence,
        found.category,
      );
      if (added) detections[found.category] += 1;
      const ref = slots.entities.find(
        (entity) =>
          entity.kind === found.kind &&
          entity.name.toLowerCase() === found.name.toLowerCase(),
      );
      if (ref) sentenceEntityRefs.push(ref);
    }

    if (KPI_NAME_PATTERN.test(sentence) && MEASURE_PATTERN.test(sentence)) {
      const kpiEv = evidenceFor(unit, sentence, 0.6, "fact");
      evidence.push(kpiEv);
      slots.facts.push({
        id: createId("fact"),
        key: "kpi",
        statement: sentence,
        evidenceIds: [kpiEv.id],
        confidence: 0.6,
      });
      detections.kpis += 1;
    }

    if (POLICY_PATTERN.test(sentence)) {
      const policyEv = evidenceFor(unit, sentence, 0.6, "business_rule");
      evidence.push(policyEv);
      slots.businessRules.push({
        id: createId("rule"),
        statement: sentence,
        evidenceIds: [policyEv.id],
        confidence: 0.6,
      });
      detections.policies += 1;
    }

    const approvalMatch = APPROVAL_PATTERN.exec(sentence);
    if (approvalMatch) {
      const approvalEv = evidenceFor(unit, sentence, 0.62, "business_rule");
      evidence.push(approvalEv);
      slots.businessRules.push({
        id: createId("rule"),
        statement: sentence,
        evidenceIds: [approvalEv.id],
        confidence: 0.62,
      });
      detections.approvals += 1;

      const pair = directedPair(sentenceEntities, approvalMatch.index);
      if (pair) {
        slots.relationships.push({
          id: createId("relationship"),
          kind: "Approves",
          fromEntityName: pair.from.name,
          toEntityName: pair.to.name,
          label: sentence.slice(0, 120),
          evidenceIds: [approvalEv.id],
          confidence: 0.55,
        });
      }
    }

    const handoffMatch = HANDOFF_PATTERN.exec(sentence);
    if (handoffMatch) {
      const pair = directedPair(sentenceEntities, handoffMatch.index);
      if (pair) {
        const handoffEv = evidenceFor(unit, sentence, 0.55, "relationship");
        evidence.push(handoffEv);
        slots.relationships.push({
          id: createId("relationship"),
          kind: "CommunicatesWith",
          fromEntityName: pair.from.name,
          toEntityName: pair.to.name,
          label: sentence.slice(0, 120),
          evidenceIds: [handoffEv.id],
          confidence: 0.55,
        });
        detections.handoffs += 1;
      }
    }

    for (const detector of RELATION_VERB_DETECTORS) {
      const verbMatch = detector.pattern.exec(sentence);
      if (!verbMatch) continue;
      const pair = directedPairWithAnchor(
        sentenceEntities,
        verbMatch.index,
        anchors,
        detector.subjectKinds,
        detector.objectKinds,
      );
      if (!pair) continue;
      const relEv = evidenceFor(unit, sentence, detector.confidence, "relationship");
      evidence.push(relEv);
      slots.relationships.push({
        id: createId("relationship"),
        kind: detector.kind,
        fromEntityName: pair.fromName,
        toEntityName: pair.toName,
        label: sentence.slice(0, 120),
        evidenceIds: [relEv.id],
        // Anchor-resolved edges (the subject or object came from context,
        // not this sentence) carry less confidence than an explicit pair.
        confidence: pair.anchored ? detector.confidence * 0.75 : detector.confidence,
      });
    }

    const cadence = cadenceLabel(sentence);
    if (cadence) {
      const cadenceEv = evidenceFor(unit, sentence, 0.55, "fact");
      evidence.push(cadenceEv);
      slots.facts.push({
        id: createId("fact"),
        key: "cadence",
        statement: sentence,
        evidenceIds: [cadenceEv.id],
        confidence: 0.55,
      });
      const workflowRef = sentenceEntityRefs.find(
        (entity) => entity.kind === "Workflow",
      );
      if (workflowRef && !workflowRef.metadata.cadence) {
        workflowRef.metadata = { ...workflowRef.metadata, cadence };
      }
    }

    if (RISK_PATTERN.test(sentence)) {
      const riskEv = evidenceFor(unit, sentence, 0.58, "pain_signal");
      evidence.push(riskEv);
      slots.painSignals.push({
        id: createId("pain"),
        kind: "risk",
        title: sentence.slice(0, 80),
        description: sentence,
        evidenceIds: [riskEv.id],
        confidence: 0.58,
      });
      detections.risks += 1;
    } else if (PAIN_PATTERN.test(sentence)) {
      const painEv = evidenceFor(unit, sentence, 0.55, "pain_signal");
      evidence.push(painEv);
      slots.painSignals.push({
        id: createId("pain"),
        kind: "pain",
        title: sentence.slice(0, 80),
        description: sentence,
        evidenceIds: [painEv.id],
        confidence: 0.55,
      });
      detections.pain_points += 1;
    }

    if (OPPORTUNITY_PATTERN.test(sentence)) {
      const oppEv = evidenceFor(unit, sentence, 0.5, "opportunity");
      evidence.push(oppEv);
      slots.opportunities.push({
        id: createId("opportunity"),
        title: sentence.slice(0, 80),
        description: sentence,
        evidenceIds: [oppEv.id],
        confidence: 0.5,
      });
    }

    updateAnchors(anchors, sentenceEntities);
  }

  return { slots, evidence, detections, scannedSentences: sentences.length };
}

/** Returns true when this is the first time the entity is seen in this scan. */
function addEntity(
  slots: IntakeSlots,
  evidence: Evidence[],
  unit: IntakeUnit,
  seen: Set<string>,
  kind: KnowledgeEntityKind,
  name: string,
  sentence: string,
  confidence: number,
  category: DetectionCategory,
): boolean {
  const key = `${kind}:${name.toLowerCase()}`;
  const entityEvidence = evidenceFor(unit, sentence, confidence, "entity");
  evidence.push(entityEvidence);

  if (seen.has(key)) {
    const existing = slots.entities.find(
      (entity) => entity.kind === kind && entity.name.toLowerCase() === name.toLowerCase(),
    );
    existing?.evidenceIds.push(entityEvidence.id);
    return false;
  }

  seen.add(key);
  const entity: IntakeEntity = {
    id: createId("entity"),
    kind,
    name,
    summary: sentence,
    evidenceIds: [entityEvidence.id],
    confidence,
    metadata: { detectedAs: category },
  };
  slots.entities.push(entity);
  return true;
}
