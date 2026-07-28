/**
 * Connector credential storage — server-only (Mission 23).
 *
 * Never imported from a Client Component: it reads/writes OAuth tokens.
 * Uses the same pattern every other approved Supabase write path in this
 * app already uses (`createServerSupabaseClient()` — the signed-in user's
 * own verified session, RLS via `architect_is_member`, see
 * `docs/SECURITY_POSTURE.md` §1) extended to one new table
 * (`architect_connector_credentials`, migration
 * `supabase/migrations/004_connector_credentials.sql`) instead of a second
 * Supabase client construction site. No `SUPABASE_SERVICE_ROLE_KEY` use.
 *
 * That migration must be applied by a human per §11 of the Security
 * Posture (schema changes require review) before this becomes live in a
 * given environment. Until then every function here degrades honestly to
 * a "needs_setup" status instead of throwing — a missing table is a
 * supported, documented state, matching the "missing AI key" / "missing
 * Supabase" honesty convention already established in
 * `docs/SECURITY_POSTURE.md` §4.
 */

import { isSupabaseConfigured } from "@/lib/auth/config";
import { createServerSupabaseClient } from "@/lib/auth/supabase/server";
import type { ConnectorAccountSummary, ConnectorProviderId } from "./types";
import { emptyConnectorAccountSummary } from "./types";

const TABLE = "architect_connector_credentials";

export interface ConnectorCredentials {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  accountLabel: string | null;
  scopes: string | null;
}

type SaveResult = { ok: true } | { ok: false; reason: string };

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

const MIGRATION_NOT_APPLIED =
  "La migración de conectores (004_connector_credentials.sql) aún no se ha aplicado en Supabase — ver supabase/OPERATOR_GUIDE.md.";

export async function getConnectorAccountSummary(
  workspaceId: string,
  provider: ConnectorProviderId,
): Promise<ConnectorAccountSummary> {
  if (!isSupabaseConfigured()) {
    return {
      ...emptyConnectorAccountSummary(provider, "needs_setup"),
      errorMessage: "Requiere Supabase configurado para guardar la conexión de forma segura.",
    };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("account_label, connected_at, last_sync_at, last_sync_summary")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .maybeSingle();

    if (error) {
      return {
        ...emptyConnectorAccountSummary(provider, isMissingTableError(error) ? "needs_setup" : "error"),
        errorMessage: isMissingTableError(error) ? MIGRATION_NOT_APPLIED : error.message,
      };
    }
    if (!data) return emptyConnectorAccountSummary(provider, "not_connected");

    return {
      provider,
      status: "connected",
      accountLabel: data.account_label,
      connectedAt: data.connected_at,
      lastSyncAt: data.last_sync_at,
      lastSyncSummary: data.last_sync_summary,
      errorMessage: null,
    };
  } catch (error) {
    return {
      ...emptyConnectorAccountSummary(provider, "error"),
      errorMessage: error instanceof Error ? error.message : "No se pudo leer el estado del conector.",
    };
  }
}

export async function saveConnectorCredentials(
  workspaceId: string,
  provider: ConnectorProviderId,
  credentials: ConnectorCredentials,
): Promise<SaveResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, reason: "Supabase no está configurado." };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from(TABLE).upsert(
      {
        workspace_id: workspaceId,
        provider,
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expires_at: credentials.expiresAt,
        account_label: credentials.accountLabel,
        scopes: credentials.scopes,
        connected_at: now,
        updated_at: now,
      },
      { onConflict: "workspace_id,provider" },
    );
    if (error) {
      return { ok: false, reason: isMissingTableError(error) ? MIGRATION_NOT_APPLIED : error.message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "No se pudo guardar la conexión.",
    };
  }
}

export async function getConnectorCredentials(
  workspaceId: string,
  provider: ConnectorProviderId,
): Promise<ConnectorCredentials | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select("access_token, refresh_token, expires_at, account_label, scopes")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .maybeSingle();
    if (error || !data) return null;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      accountLabel: data.account_label,
      scopes: data.scopes,
    };
  } catch {
    return null;
  }
}

/** Best-effort — a refreshed token that fails to persist is simply refreshed again next call; never fatal. */
export async function updateConnectorAccessToken(
  workspaceId: string,
  provider: ConnectorProviderId,
  accessToken: string,
  expiresAt: string | null,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from(TABLE)
      .update({ access_token: accessToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);
  } catch {
    // best-effort, see doc comment above.
  }
}

/** Best-effort audit trail for the connectors panel's "última sincronización" line. */
export async function recordConnectorSync(
  workspaceId: string,
  provider: ConnectorProviderId,
  summary: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = await createServerSupabaseClient();
    await supabase
      .from(TABLE)
      .update({ last_sync_at: new Date().toISOString(), last_sync_summary: summary })
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);
  } catch {
    // best-effort — a lost sync note never blocks the import itself.
  }
}

export async function deleteConnectorCredentials(
  workspaceId: string,
  provider: ConnectorProviderId,
): Promise<SaveResult> {
  if (!isSupabaseConfigured()) return { ok: false, reason: "Supabase no está configurado." };
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "No se pudo desconectar." };
  }
}
