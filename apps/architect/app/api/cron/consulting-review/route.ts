import { NextResponse } from "next/server";
import type { CompanyWorkspace } from "@/types";

/**
 * Mission 24 — Autonomous Consulting Cycle: the scheduled review endpoint.
 *
 * Intended trigger: Vercel Cron (see `vercel.json`'s `crons` entry and
 * `docs/OPERATIONS_RUNBOOK.md`), once nightly. Nothing about this route is
 * Vercel-specific beyond that convention — any scheduler that can send a
 * GET request with `Authorization: Bearer <CRON_SECRET>` works.
 *
 * What it does, in order, for every workspace row in `architect_workspaces`:
 *   1. Heal/normalize the stored JSON the same way every other load does
 *      (`migrateBundle` — never a second migration path for this route).
 *   2. `runOvernightReview` — a no-op, honestly reported, when the workspace
 *      was reviewed recently; otherwise re-runs
 *      `runConsultingIntelligenceCycle` exactly as the interview/document
 *      hooks already do, and composes the client-safe overnight digest.
 *   3. Record the same append-only evolution history every save already
 *      gets (`evolveCompanyHistory`), then persist.
 *
 * No new business logic lives in this file — it is orchestration over
 * engines that existed before Mission 24.
 */
export const runtime = "nodejs";

interface WorkspaceRow {
  id: string;
  company_name: string;
  data: (CompanyWorkspace & { _seedPending?: boolean }) | null;
  updated_at: string;
}

interface ReviewResult {
  workspaceId: string;
  due: boolean;
  changed: boolean;
  headline?: string;
  error?: string;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  const { isAdminSupabaseConfigured, createAdminSupabaseClient } = await import(
    "@/lib/auth/supabase/admin"
  );

  if (!isAdminSupabaseConfigured()) {
    return NextResponse.json({
      ran: false,
      reviewedAt: new Date().toISOString(),
      reason:
        "Supabase is not configured on this deployment (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — there is no shared workspace to review yet. This is an honest no-op, not an error.",
      results: [] as ReviewResult[],
    });
  }

  const [{ runOvernightReview }, { migrateBundle }, { evolveCompanyHistory }] =
    await Promise.all([
      import("@/lib/consulting-intelligence"),
      import("@/lib/repositories/migrate"),
      import("@/lib/history"),
    ]);

  const supabase = createAdminSupabaseClient();
  const { data: rows, error } = await supabase
    .from("architect_workspaces")
    .select("id, company_name, data, updated_at")
    .limit(50);

  if (error) {
    return NextResponse.json(
      { ran: false, reviewedAt: new Date().toISOString(), error: error.message },
      { status: 500 },
    );
  }

  const results: ReviewResult[] = [];
  const now = new Date();

  for (const row of (rows ?? []) as WorkspaceRow[]) {
    const raw = row.data;
    if (!raw || typeof raw !== "object" || !("companyName" in raw) || raw._seedPending) {
      continue;
    }

    const healed = migrateBundle({
      workspaces: [
        { ...raw, id: row.id, companyName: row.company_name || raw.companyName },
      ],
      conversations: [],
    });
    const workspace = healed.workspaces[0];
    if (!workspace) continue;

    const outcome = runOvernightReview(workspace, now);
    if (!outcome.ran) {
      results.push({ workspaceId: workspace.id, due: false, changed: false });
      continue;
    }

    const { workspace: evolved } = evolveCompanyHistory(outcome.workspace);
    const { error: saveError } = await supabase.from("architect_workspaces").upsert(
      {
        id: evolved.id,
        company_name: evolved.companyName,
        data: evolved,
        updated_at: now.toISOString(),
      },
      { onConflict: "id" },
    );

    results.push({
      workspaceId: workspace.id,
      due: true,
      changed: outcome.digest?.changed ?? false,
      headline: outcome.digest?.headline,
      ...(saveError ? { error: saveError.message } : {}),
    });
  }

  return NextResponse.json({
    ran: true,
    reviewedAt: now.toISOString(),
    results,
  });
}
