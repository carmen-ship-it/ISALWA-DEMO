/**
 * Proves the heal in lib/repositories/migrate.ts no longer deletes real
 * answers alongside legacy fabricated seed facts.
 * Run: npx tsx scripts/verify-migrate-heal.ts
 */
import { migrateBundle } from "@/lib/repositories/migrate";
import { createEmptyWorkspace } from "@/lib/workspace/seed";
import { createEmptyMemory } from "@/lib/reasoning";
import { PILOT_COMPANY_WORKSPACE_ID } from "@/lib/auth/constants";
import type { CompanyWorkspace, KnownFact } from "@/types";

const now = new Date().toISOString();

function fact(key: string, evidence: string[]): KnownFact {
  return {
    id: `fact_${key}`,
    key,
    statement: `Statement for ${key}`,
    evidence,
    confidence: 0.9,
    dimension: "sales",
    createdAt: now,
  };
}

function pilotWith(facts: KnownFact[]): CompanyWorkspace {
  const base = createEmptyWorkspace("ISALWA", "unknown", PILOT_COMPANY_WORKSPACE_ID);
  return {
    ...base,
    businessUnderstanding: 71,
    conversationMemory: {
      ...createEmptyMemory(),
      knownFacts: facts,
    },
  };
}

function run(label: string, workspace: CompanyWorkspace) {
  const [out] = migrateBundle({ workspaces: [workspace], conversations: [] })
    .workspaces;
  const keys = out.conversationMemory?.knownFacts.map((f) => f.key) ?? [];
  console.log(
    `${label}\n  survivingFacts: [${keys.join(", ")}]\n  businessUnderstanding: ${out.businessUnderstanding}\n`,
  );
  return keys;
}

// Álvaro's real answers sitting next to two legacy fabricated seed facts —
// exactly the live ws_isalwa shape that was being wiped on every reload.
const mixed = run(
  "mixed (legacy seed facts + real answers):",
  pilotWith([
    fact("seed_fact_0", ["Sesión de descubrimiento anterior"]),
    fact("seed_fact_1", ["Sesión de descubrimiento anterior"]),
    fact("sales_motion", ["«Vendemos por licitación pública»"]),
    fact("team_size", ["«Somos 42 personas»"]),
  ]),
);

// Nothing real to keep: the honest reset must still fire.
const onlyFabricated = run(
  "only fabricated seed facts:",
  pilotWith([
    fact("seed_fact_0", ["Sesión de descubrimiento anterior"]),
    fact("seed_fact_1", ["Sesión de descubrimiento anterior"]),
  ]),
);

// Real answers only: untouched.
const onlyReal = run(
  "only real answers:",
  pilotWith([fact("sales_motion", ["«Vendemos por licitación pública»"])]),
);

const expectations: Array<[string, boolean]> = [
  ["real answers survive the heal", mixed.includes("sales_motion") && mixed.includes("team_size")],
  ["fabricated facts are pruned", !mixed.includes("seed_fact_0") && !mixed.includes("seed_fact_1")],
  ["purely fabricated memory is reset", onlyFabricated.length === 0],
  ["untouched real memory is preserved", onlyReal.includes("sales_motion")],
];

let failed = false;
for (const [label, ok] of expectations) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
