/**
 * Read-only inspection of the pilot rows (service role). Prints no secrets.
 * Run: node --env-file=.env.local scripts/inspect-pilot-state.mjs
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const { data: members } = await supabase
  .from("architect_workspace_members")
  .select("workspace_id, kind, user_id");
const { data: profiles } = await supabase
  .from("architect_profiles")
  .select("id, email, role");
console.log("profiles:", profiles?.map((p) => `${p.email}=${p.role}`).join(", "));
console.log(
  "members:",
  members
    ?.map((m) => {
      const p = profiles?.find((x) => x.id === m.user_id);
      return `${p?.email ?? m.user_id}@${m.workspace_id}:${m.kind}`;
    })
    .join(", "),
);

const { data: rows } = await supabase
  .from("architect_workspaces")
  .select("id, company_name, data, updated_at");
for (const row of rows ?? []) {
  const d = row.data ?? {};
  console.log(`\nworkspace ${row.id} (updated ${row.updated_at})`);
  console.log("  seedPending:", Boolean(d._seedPending));
  console.log("  businessUnderstanding:", d.businessUnderstanding);
  console.log("  knownFacts:", d.conversationMemory?.knownFacts?.length ?? "(no conversationMemory)");
  console.log("  meetings:", d.meetings?.length, "documents:", d.documents?.length);
  console.log("  activeInterviewId:", d.activeInterviewId);
  console.log("  timeline entries:", d.timeline?.length);
}

const { data: interviews } = await supabase
  .from("architect_active_interviews")
  .select("workspace_id, data, updated_at");
for (const row of interviews ?? []) {
  const d = row.data ?? {};
  console.log(`\nactive_interview ${row.workspace_id} (updated ${row.updated_at})`);
  console.log("  interviewId:", d.id, "workspaceId:", d.workspaceId, "phase:", d.phase);
  console.log("  turns:", d.conversation?.turns?.length);
  console.log("  currentQuestion:", d.conversation?.currentQuestion?.questionKey ?? null);
  console.log("  knownFacts:", d.memory?.knownFacts?.length);
  console.log(
    "  factKeys:",
    (d.memory?.knownFacts ?? []).map((f) => f.key).join(", ") || "(none)",
  );
  console.log("  score.overall:", d.memory?.score?.overall);
}

const { data: convos } = await supabase
  .from("architect_conversations")
  .select("id, workspace_id, updated_at");
console.log("\nconversations:", convos?.length ?? 0);
