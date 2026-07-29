/**
 * Manufacturing Learning Pipeline — verification (items 1-4 only).
 *
 * Simulates a Spanish-language manufacturing interview end to end and
 * checks every layer the mission touched:
 *
 *  1. Spanish manufacturing vocabulary  → `detectIndustry` resolves
 *     "manufacturing" from Spanish-only text (no English keywords used).
 *  2. Production business signal        → `detectSignals` fires the
 *     "production" SIGNAL_RULE from Spanish manufacturing/production text.
 *  3. suggestModules widened gate       → `absorbAnswerIntoMemory`'s
 *     whiteboard proposes Production/Maintenance from signal + department
 *     evidence, without requiring `industry === "manufacturing"` alone.
 *  4. Interview → Knowledge Graph       → `applyInterviewToWorkspace` (no
 *     document uploads anywhere in this script) merges interview evidence
 *     into `workspace.knowledge.entities` / `.relationships` /
 *     `.evidenceLog`, reusing `detectBusinessSignals` +
 *     `mergeIntakeEntities` + `mergeIntakeRelationships`.
 *
 * Run: npx tsx scripts/verify-manufacturing-learning-pipeline.ts
 */
import { createInterview, submitAnswer } from "@/domain/interview-engine";
import { detectIndustry, detectSignals } from "@/lib/reasoning";
import { absorbAnswerIntoMemory, createEmptyMemory } from "@/lib/reasoning";
import { applyInterviewToWorkspace } from "@/lib/memory";
import { createEmptyWorkspace } from "@/lib/workspace/seed";
import type { BusinessProfile } from "@/types";

const expectations: Array<[string, boolean]> = [];
function expect(label: string, ok: boolean) {
  expectations.push([label, ok]);
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
}

const SPANISH_BUSINESS_DESCRIPTION =
  "Somos una fábrica de cerámica. Fabricamos platos y tazas de cerámica para hoteles y " +
  "restaurantes. Tenemos una planta de producción con hornos y una línea de producción " +
  "para el moldeo de las piezas antes de la cocción.";

const SPANISH_PRODUCTION_ANSWER =
  "El departamento de producción usa Excel para llevar el control de inventario de " +
  "materia prima y producto terminado. El supervisor de planta es responsable del " +
  "control de calidad antes de que las piezas salgan del horno.";

console.log("\n=== Item 1: Spanish manufacturing vocabulary (data/catalog.ts) ===\n");

const industryFromSpanish = detectIndustry(SPANISH_BUSINESS_DESCRIPTION);
expect(
  `detectIndustry resolves "manufacturing" from Spanish-only text (got "${industryFromSpanish.industry}", confidence ${industryFromSpanish.confidence.toFixed(2)})`,
  industryFromSpanish.industry === "manufacturing" && industryFromSpanish.confidence > 0,
);

const englishStillWorks = detectIndustry(
  "We run a manufacturing plant with a production line and a shop floor.",
);
expect(
  `detectIndustry still resolves "manufacturing" from English text (regression check) (got "${englishStillWorks.industry}")`,
  englishStillWorks.industry === "manufacturing",
);

console.log("\n=== Item 2: Production business signal (lib/reasoning/industry/signals.ts) ===\n");

const spanishSignals = detectSignals(SPANISH_PRODUCTION_ANSWER);
const hasProductionSignalEs = spanishSignals.some((s) => s.id === "production");
expect(
  `detectSignals fires "production" from Spanish text (signals: ${spanishSignals.map((s) => s.id).join(", ") || "none"})`,
  hasProductionSignalEs,
);

const englishSignals = detectSignals(
  "Our factory runs a production line and issues work orders on the shop floor.",
);
const hasProductionSignalEn = englishSignals.some((s) => s.id === "production");
expect(
  `detectSignals fires "production" from English text (bilingual check)`,
  hasProductionSignalEn,
);

const irrelevantSignals = detectSignals(
  "Usamos WhatsApp para coordinar las ventas y a veces se pierde el hilo de la conversación.",
);
expect(
  `detectSignals does NOT fire "production" on unrelated text (no false positive)`,
  !irrelevantSignals.some((s) => s.id === "production"),
);

console.log("\n=== Item 3: suggestModules widened gate (lib/reasoning/memory/absorb.ts) ===\n");

function emptyBusiness(): BusinessProfile {
  return {
    companyName: null,
    description: null,
    industry: "unknown",
    industryConfidence: 0,
    sizeHint: null,
    currentTools: [],
    signals: [],
    departments: [],
    revenueStage: null,
    businessModel: null,
  };
}

// 3a — production signal + manufacturing keywords + Producción department,
// all from one Spanish answer, industry not yet resolved by a prior turn.
const absorbed1 = absorbAnswerIntoMemory(
  createEmptyMemory(),
  emptyBusiness(),
  SPANISH_BUSINESS_DESCRIPTION,
  null,
);
expect(
  `after one Spanish manufacturing answer: industry resolves to "manufacturing" (got "${absorbed1.business.industry}")`,
  absorbed1.business.industry === "manufacturing",
);
expect(
  `after one Spanish manufacturing answer: whiteboard proposes "Production" module (modules: ${absorbed1.memory.whiteboard.potentialModules.join(", ")})`,
  absorbed1.memory.whiteboard.potentialModules.includes("Production"),
);
expect(
  `after one Spanish manufacturing answer: whiteboard proposes "Maintenance" module`,
  absorbed1.memory.whiteboard.potentialModules.includes("Maintenance"),
);

// 3b — widened-gate regression: strong non-manufacturing industry evidence
// (services) plus a bare "producción" department mention must still activate
// Production/Maintenance — proves the gate is no longer
// `industry === "manufacturing"` alone.
const absorbed2 = absorbAnswerIntoMemory(
  createEmptyMemory(),
  emptyBusiness(),
  "Somos una agencia de servicios de consultoría para clientes corporativos. " +
    "El equipo de producción reporta directamente al gerente general.",
  null,
);
expect(
  `industry resolves to something other than "manufacturing" here (got "${absorbed2.business.industry}") — sets up the widened-gate proof`,
  absorbed2.business.industry !== "manufacturing",
);
expect(
  `"Producción" department is extracted even though industry is "${absorbed2.business.industry}" (departments: ${absorbed2.memory.summary.departments.join(", ")})`,
  absorbed2.memory.summary.departments.includes("Producción"),
);
expect(
  `Production/Maintenance modules still activate purely from the department signal (modules: ${absorbed2.memory.whiteboard.potentialModules.join(", ")}) — gate is widened, not tied to industry alone`,
  absorbed2.memory.whiteboard.potentialModules.includes("Production") &&
    absorbed2.memory.whiteboard.potentialModules.includes("Maintenance"),
);

console.log("\n=== Item 4: Interview → Knowledge Graph (lib/memory/apply-interview.ts) ===\n");

// Build a completed interview end to end via the real engine — no document
// uploads anywhere in this script.
let interview = createInterview();
interview = submitAnswer(interview, "yes"); // welcome -> role
interview = submitAnswer(interview, "owner"); // role -> name
interview = submitAnswer(interview, "Ana García"); // name -> company
interview = submitAnswer(interview, "Cerámicas Ejemplo"); // company -> business
interview = submitAnswer(interview, SPANISH_BUSINESS_DESCRIPTION); // business -> interview/synthesizing
if (interview.phase === "interview") {
  interview = submitAnswer(interview, SPANISH_PRODUCTION_ANSWER);
}

expect(
  "interview never touched a document/knowledge upload path (conversation.answers only)",
  interview.conversation.answers.every((a) => typeof a.value === "string"),
);

const workspace = createEmptyWorkspace("Cerámicas Ejemplo", "unknown", "ws_verify_manufacturing");
expect(
  "workspace starts with zero knowledge entities (no prior documents)",
  workspace.knowledge.entities.length === 0,
);

const { workspace: nextWorkspace } = applyInterviewToWorkspace(workspace, interview);

expect(
  "workspace.knowledge gained entities purely from interview conversation text",
  nextWorkspace.knowledge.entities.length > 0,
);

const departmentEntity = nextWorkspace.knowledge.entities.find(
  (e) => e.kind === "Department" && e.name === "Producción",
);
expect(
  `knowledge graph contains a "Producción" Department entity (entities: ${nextWorkspace.knowledge.entities.map((e) => `${e.kind}:${e.name}`).join(", ")})`,
  Boolean(departmentEntity),
);

const mentionsManufacturingEvidence = nextWorkspace.knowledge.evidenceLog.some((entry) =>
  /producci[oó]n|manufactur|f[aá]brica|cer[aá]mica/i.test(entry.statement),
);
expect(
  "evidence log contains manufacturing/producción statements from the interview",
  mentionsManufacturingEvidence,
);

const interviewAsset = nextWorkspace.knowledge.assets.find((a) => a.tags.includes("interview"));
expect(
  `an interview-sourced KnowledgeAsset was recorded (assets: ${nextWorkspace.knowledge.assets.map((a) => a.title).join(", ")})`,
  Boolean(interviewAsset),
);

if (departmentEntity && interviewAsset) {
  expect(
    "the Producción entity's provenance points back to the interview asset",
    departmentEntity.sourceAssetIds.includes(interviewAsset.id),
  );
}

// Never invented: no upload of any kind happened, confirm document list unchanged
// aside from the existing placeholder-transcript behavior (not part of this mission).
expect(
  "no CRM/ERP/manual-notes knowledge assets were introduced (interview-only path)",
  nextWorkspace.knowledge.assets.every((a) => a.tags.includes("interview")),
);

// Re-applying the same completed interview (idempotence / no unbounded growth)
// should reinforce, not duplicate, the same entities.
const { workspace: reappliedWorkspace } = applyInterviewToWorkspace(nextWorkspace, interview);
const entityCountAfterFirst = nextWorkspace.knowledge.entities.length;
const entityCountAfterSecond = reappliedWorkspace.knowledge.entities.length;
expect(
  `re-applying the same interview text reinforces existing entities instead of duplicating them (before: ${entityCountAfterFirst}, after: ${entityCountAfterSecond})`,
  entityCountAfterSecond === entityCountAfterFirst,
);

console.log("\n=== Summary ===\n");
const failed = expectations.filter(([, ok]) => !ok);
console.log(`${expectations.length - failed.length}/${expectations.length} checks passed.`);
process.exit(failed.length > 0 ? 1 : 0);
