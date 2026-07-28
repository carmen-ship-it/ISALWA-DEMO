/**
 * Proves the in-flight interview heal (lib/persistence/index.ts) strips
 * fabricated seed_fact_* facts and rewrites a frozen pre-Spanish-fix
 * architect turn — exactly the live ws_isalwa active-interview shape
 * (Confidence: 71%, English resume bridge) described in
 * PILOT_FAKE_PCT_AND_ENGLISH_FIX.md.
 * Run: npx tsx scripts/verify-interview-heal.ts
 */
import { createInterview } from "@/domain/interview-engine";
import { createEmptyMemory } from "@/lib/reasoning";
import { healConversationMemory } from "@/lib/memory/heal";
import type { Interview, KnownFact } from "@/types";

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

// Mirrors the live ws_isalwa active_interviews row: two fabricated seed
// facts inflating the score, plus a frozen English turn from before the
// resume-engine Spanish hotfix.
const staleInterview: Interview = {
  ...createInterview(),
  memory: {
    ...createEmptyMemory(),
    knownFacts: [
      fact("seed_fact_0", ["Sesión de descubrimiento anterior"]),
      fact("seed_fact_1", ["Sesión de descubrimiento anterior"]),
      fact("sales_motion", ["«Vendemos por licitación pública»"]),
    ],
  },
};
staleInterview.conversation.turns.push({
  id: "turn_stale",
  role: "architect",
  content: "Good. Let's continue with Sales.\n\nConfidence: 71%\n\nStill need: Sales, Customers, Geography",
  createdAt: now,
});

const healedMemory = healConversationMemory(staleInterview.memory);
const survivingKeys = healedMemory.knownFacts.map((f) => f.key);

const expectations: Array<[string, boolean]> = [
  [
    "fabricated seed facts pruned from active interview",
    !survivingKeys.includes("seed_fact_0") && !survivingKeys.includes("seed_fact_1"),
  ],
  ["real fact survives the heal", survivingKeys.includes("sales_motion")],
  [
    "score is recomputed, not left at the fabricated value",
    healedMemory.score.overall !== staleInterview.memory.score.overall,
  ],
];

let failed = false;
for (const [label, ok] of expectations) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failed = true;
}
console.log(
  `\nsurvivingFacts: [${survivingKeys.join(", ")}]\nscore.overall: ${healedMemory.score.overall}`,
);
process.exit(failed ? 1 : 0);
