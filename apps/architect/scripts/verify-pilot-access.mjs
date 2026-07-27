/**
 * Diagnostic: can Álvaro (client / owner member) read + write the pilot tables?
 * Run: node --env-file=.env.local scripts/verify-pilot-access.mjs
 * Non-destructive: backs up and restores anything it touches. Prints no secrets.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.DIAG_EMAIL ?? "alvaro@isalwa.demo";
const password =
  process.env.DIAG_PASSWORD ??
  process.env.ARCHITECT_PILOT_ALVARO_PASSWORD ??
  "Architect2026!";

if (!url || !anon) {
  console.log("SUPABASE_NOT_CONFIGURED");
  process.exit(1);
}

const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
console.log(
  "signIn:",
  authError ? `FAIL ${authError.message}` : `OK uid=${auth.user?.id?.slice(0, 8)}…`,
);
if (authError) process.exit(1);

const probe = async (label, fn) => {
  const { data, error } = await fn();
  console.log(
    `${label}:`,
    error
      ? `FAIL [${error.code ?? "?"}] ${error.message}`
      : `OK rows=${Array.isArray(data) ? data.length : data ? 1 : 0}`,
  );
  return { data, error };
};

await probe("profiles.select", () =>
  supabase.from("architect_profiles").select("email, role"),
);
const members = await probe("members.select", () =>
  supabase.from("architect_workspace_members").select("workspace_id, kind"),
);
console.log(
  "  memberships:",
  (members.data ?? []).map((m) => `${m.workspace_id}:${m.kind}`).join(", ") || "(none)",
);

const ws = await probe("workspaces.select", () =>
  supabase.from("architect_workspaces").select("id, company_name, updated_at"),
);
console.log("  workspace ids:", (ws.data ?? []).map((r) => r.id).join(", ") || "(none)");

// --- architect_workspaces write (non-destructive: same data back) -----------
const existing = await supabase
  .from("architect_workspaces")
  .select("id, company_name, data, updated_at")
  .eq("id", "ws_isalwa")
  .maybeSingle();

console.log(
  "  ws_isalwa data keys:",
  existing.data?.data
    ? Object.keys(existing.data.data).slice(0, 12).join(",")
    : `(${existing.error?.message ?? "missing row"})`,
);

if (existing.data) {
  await probe("workspaces.update(ws_isalwa, same data)", () =>
    supabase
      .from("architect_workspaces")
      .update({ data: existing.data.data, updated_at: existing.data.updated_at })
      .eq("id", "ws_isalwa")
      .select("id"),
  );

  await probe("workspaces.upsert(ws_isalwa, same data)", () =>
    supabase
      .from("architect_workspaces")
      .upsert(
        {
          id: "ws_isalwa",
          company_name: existing.data.company_name,
          data: existing.data.data,
          updated_at: existing.data.updated_at,
        },
        { onConflict: "id" },
      )
      .select("id"),
  );
}

// Upsert of a workspace Álvaro is NOT a member of — this is what the seed
// bundle tries to write when it contains demo workspaces.
await probe("workspaces.upsert(non-member ws_diag_other)", () =>
  supabase
    .from("architect_workspaces")
    .upsert(
      {
        id: "ws_diag_other",
        company_name: "Diag",
        data: { id: "ws_diag_other", companyName: "Diag" },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id"),
);

// --- architect_active_interviews (back up + restore) ------------------------
const interviewBefore = await supabase
  .from("architect_active_interviews")
  .select("workspace_id, data, updated_at")
  .eq("workspace_id", "ws_isalwa")
  .maybeSingle();

console.log(
  "  active_interview present:",
  interviewBefore.data ? `yes (updated_at=${interviewBefore.data.updated_at})` : "no",
  interviewBefore.error ? `err=${interviewBefore.error.message}` : "",
);

if (interviewBefore.data) {
  await probe("active_interviews.upsert(same data)", () =>
    supabase
      .from("architect_active_interviews")
      .upsert(
        {
          workspace_id: "ws_isalwa",
          data: interviewBefore.data.data,
          updated_at: interviewBefore.data.updated_at,
        },
        { onConflict: "workspace_id" },
      )
      .select("workspace_id"),
  );
} else {
  const probeWrite = await probe("active_interviews.upsert(new probe row)", () =>
    supabase
      .from("architect_active_interviews")
      .upsert(
        {
          workspace_id: "ws_isalwa",
          data: { __diag: true },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id" },
      )
      .select("workspace_id"),
  );
  if (!probeWrite.error) {
    await supabase
      .from("architect_active_interviews")
      .delete()
      .eq("workspace_id", "ws_isalwa");
    console.log("  (probe row removed)");
  }
}

await supabase.auth.signOut();
