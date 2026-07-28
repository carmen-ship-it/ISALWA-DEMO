"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FolderSync, Loader2, RefreshCw, Unplug, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONNECTOR_CATALOG } from "@/lib/connectors";
import type {
  ConnectorAccountSummary,
  ConnectorProviderId,
  ConnectorRemoteFile,
} from "@/lib/connectors";
import { importGoogleDriveFile } from "@/lib/connectors/import";
import { formatFileSize } from "@/lib/documents";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

/**
 * Real Integrations — connectors admin panel (Mission 23).
 *
 * Consultant-only, rendered from `WorkspaceView` next to `KnowledgeCenter`
 * (see `docs/SECURITY_POSTURE.md` — Client Mode never sees this). Every
 * imported file goes through the exact same `processUploadedDocument`
 * pipeline a manual upload uses (`lib/connectors/import.ts`) — this panel
 * never writes to `workspace.knowledge` directly.
 *
 * Spanish hardcoded throughout, matching `BrandSettingsPanel` — the
 * established convention for consultant-only surfaces in this codebase.
 */
export function ConnectorsPanel({
  workspace,
  uploadedByUserId,
  uploadedByName,
  onUpdated,
  initialStatusBanner,
}: {
  workspace: CompanyWorkspace;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  onUpdated: (next: CompanyWorkspace) => void;
  /** Post-OAuth-redirect feedback (`?connector=…&connector_status=…`), if any. */
  initialStatusBanner?: { provider: ConnectorProviderId; status: string } | null;
}) {
  const [summaries, setSummaries] = useState<Record<string, ConnectorAccountSummary>>({});
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<ConnectorProviderId | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const response = await fetch(
        `/api/connectors/status?workspaceId=${encodeURIComponent(workspace.id)}`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as { summaries: ConnectorAccountSummary[] };
      const map: Record<string, ConnectorAccountSummary> = {};
      for (const summary of data.summaries) map[summary.provider] = summary;
      setSummaries(map);
    } finally {
      setLoadingStatus(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  return (
    <div className="space-y-5">
      {initialStatusBanner ? <OAuthResultBanner banner={initialStatusBanner} /> : null}

      <div className="grid gap-4">
        {CONNECTOR_CATALOG.map((connector) => {
          const summary = summaries[connector.id];
          if (connector.readiness === "scaffolded") {
            return <ScaffoldedConnectorCard key={connector.id} titleEs={connector.titleEs} descriptionEs={connector.descriptionEs} />;
          }
          return (
            <GoogleDriveConnectorCard
              key={connector.id}
              workspace={workspace}
              summary={summary}
              loadingStatus={loadingStatus}
              expanded={expandedProvider === connector.id}
              onToggleExpanded={() =>
                setExpandedProvider((prev) => (prev === connector.id ? null : connector.id))
              }
              onReload={loadStatus}
              uploadedByUserId={uploadedByUserId}
              uploadedByName={uploadedByName}
              onUpdated={onUpdated}
            />
          );
        })}
      </div>
    </div>
  );
}

function OAuthResultBanner({
  banner,
}: {
  banner: { provider: ConnectorProviderId; status: string };
}) {
  const connector = CONNECTOR_CATALOG.find((c) => c.id === banner.provider);
  const label = connector?.titleEs ?? banner.provider;

  const copy: Record<string, { tone: "ok" | "warn"; text: string }> = {
    connected: { tone: "ok", text: `${label} conectado correctamente.` },
    error: { tone: "warn", text: `No se pudo completar la conexión con ${label}. Intente de nuevo.` },
    not_configured: {
      tone: "warn",
      text: `${label} no está configurado en este entorno (faltan las credenciales OAuth o Supabase).`,
    },
  };
  const message = copy[banner.status] ?? { tone: "warn" as const, text: `${label}: ${banner.status}` };

  return (
    <Card
      className={
        message.tone === "ok"
          ? "border-[var(--isalwa-tint-green-border)]/70 bg-[var(--isalwa-tint-green)]/50 px-5 py-4"
          : "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/50 px-5 py-4"
      }
    >
      <p className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
        {message.tone === "ok" ? (
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <XCircle className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {message.text}
      </p>
    </Card>
  );
}

function ScaffoldedConnectorCard({
  titleEs,
  descriptionEs,
}: {
  titleEs: string;
  descriptionEs: string;
}) {
  return (
    <Card className="px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[var(--isalwa-kiln)]">{titleEs}</p>
          <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]/80">{descriptionEs}</p>
        </div>
        <span className="shrink-0 rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
          No conectado
        </span>
      </div>
    </Card>
  );
}

function GoogleDriveConnectorCard({
  workspace,
  summary,
  loadingStatus,
  expanded,
  onToggleExpanded,
  onReload,
  uploadedByUserId,
  uploadedByName,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  summary: ConnectorAccountSummary | undefined;
  loadingStatus: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onReload: () => Promise<void>;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const connector = CONNECTOR_CATALOG.find((c) => c.id === "google_drive")!;
  const status = summary?.status ?? "not_connected";
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      await fetch("/api/connectors/google-drive/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      await onReload();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <Card className="px-5 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[var(--isalwa-kiln)]">{connector.titleEs}</p>
          <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]/80">{connector.descriptionEs}</p>
          {status === "connected" ? (
            <p className="mt-2 text-xs text-[var(--isalwa-slate)]/70">
              Conectado como {summary?.accountLabel ?? "cuenta de Google"}
              {summary?.connectedAt ? ` · desde ${formatRelativeActivity(summary.connectedAt)}` : ""}
              {summary?.lastSyncSummary ? ` · ${summary.lastSyncSummary}` : ""}
            </p>
          ) : status === "needs_setup" ? (
            <p className="mt-2 text-xs text-[var(--isalwa-tint-amber-ink)]">
              {summary?.errorMessage ?? "Requiere configuración adicional."}
            </p>
          ) : status === "error" ? (
            <p className="mt-2 text-xs text-[var(--isalwa-tint-amber-ink)]">
              {summary?.errorMessage ?? "Ocurrió un error al leer el estado de la conexión."}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StatusPill status={status} loading={loadingStatus} />
          {status === "connected" ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={onToggleExpanded}>
                <FolderSync className="h-3.5 w-3.5" aria-hidden />
                {expanded ? "Ocultar archivos" : "Ver archivos"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleDisconnect()}
                disabled={disconnecting}
              >
                <Unplug className="h-3.5 w-3.5" aria-hidden />
                {disconnecting ? "Desconectando…" : "Desconectar"}
              </Button>
            </>
          ) : status === "needs_setup" ? null : (
            <Button asChild size="sm">
              <a href={`/api/connectors/google-drive/authorize?workspaceId=${encodeURIComponent(workspace.id)}`}>
                Conectar Google Drive
              </a>
            </Button>
          )}
        </div>
      </div>

      {expanded && status === "connected" ? (
        <div className="mt-5 border-t border-[var(--isalwa-mist)]/70 pt-5">
          <GoogleDriveFileBrowser
            workspace={workspace}
            uploadedByUserId={uploadedByUserId}
            uploadedByName={uploadedByName}
            onUpdated={onUpdated}
            onImported={() => void onReload()}
          />
        </div>
      ) : null}
    </Card>
  );
}

function StatusPill({
  status,
  loading,
}: {
  status: ConnectorAccountSummary["status"];
  loading: boolean;
}) {
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        Verificando
      </span>
    );
  }
  const styles: Record<ConnectorAccountSummary["status"], string> = {
    connected: "border-[var(--isalwa-tint-green-border)]/70 bg-[var(--isalwa-tint-green)]/60 text-[var(--isalwa-tint-green-ink)]",
    not_connected: "border-[var(--isalwa-mist)] text-[var(--isalwa-slate)]/60",
    needs_setup: "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/60 text-[var(--isalwa-tint-amber-ink)]",
    error: "border-[var(--isalwa-tint-amber-border)]/70 bg-[var(--isalwa-tint-amber)]/60 text-[var(--isalwa-tint-amber-ink)]",
  };
  const labels: Record<ConnectorAccountSummary["status"], string> = {
    connected: "Conectado",
    not_connected: "No conectado",
    needs_setup: "Requiere configuración",
    error: "Error",
  };
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

type ImportRowState = "idle" | "importing" | "done" | "error";

function GoogleDriveFileBrowser({
  workspace,
  uploadedByUserId,
  uploadedByName,
  onUpdated,
  onImported,
}: {
  workspace: CompanyWorkspace;
  uploadedByUserId: string | null;
  uploadedByName: string | null;
  onUpdated: (next: CompanyWorkspace) => void;
  onImported: () => void;
}) {
  const [files, setFiles] = useState<ConnectorRemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rowState, setRowState] = useState<Record<string, ImportRowState>>({});
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(
        `/api/connectors/google-drive/files?workspaceId=${encodeURIComponent(workspace.id)}`,
      );
      const data = (await response.json()) as {
        connected: boolean;
        files: ConnectorRemoteFile[];
        error?: string;
      };
      setFiles(data.files ?? []);
      if (data.error) setLoadError(data.error);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "No se pudo listar Google Drive.");
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImportSelected = async () => {
    const targets = files.filter((file) => selected.has(file.id) && file.importable);
    if (targets.length === 0 || importing) return;
    setImporting(true);
    setRowState((prev) => {
      const next = { ...prev };
      for (const file of targets) next[file.id] = "importing";
      return next;
    });

    try {
      const response = await fetch("/api/connectors/google-drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          files: targets.map((file) => ({ id: file.id, name: file.name, mimeType: file.mimeType })),
        }),
      });
      const data = (await response.json()) as {
        results?: Array<{
          id: string;
          name: string;
          mimeType: string;
          textContent: string | null;
          status: "read" | "empty" | "unsupported" | "error";
          reason: string | null;
        }>;
        error?: string;
      };

      if (!response.ok || !data.results) {
        setRowState((prev) => {
          const next = { ...prev };
          for (const file of targets) next[file.id] = "error";
          return next;
        });
        setRowMessage((prev) => {
          const next = { ...prev };
          for (const file of targets) next[file.id] = data.error ?? "No se pudo leer el archivo.";
          return next;
        });
        return;
      }

      let latestWorkspace = workspace;
      for (const result of data.results) {
        if (result.status !== "read" || !result.textContent) {
          setRowState((prev) => ({ ...prev, [result.id]: result.status === "read" ? "done" : "error" }));
          setRowMessage((prev) => ({
            ...prev,
            [result.id]:
              result.reason ??
              (result.status === "empty"
                ? "El archivo no tiene contenido legible."
                : "Architect aún no puede leer este tipo de archivo."),
          }));
          continue;
        }

        const run = await importGoogleDriveFile({
          workspaceId: workspace.id,
          file: {
            id: result.id,
            name: result.name,
            mimeType: result.mimeType,
            textContent: result.textContent,
            status: result.status,
            reason: result.reason,
          },
          uploadedByUserId,
          uploadedByName,
          onWorkspace: (ws) => {
            latestWorkspace = ws;
            onUpdated(ws);
          },
        });

        if (run) {
          latestWorkspace = run.workspace;
          setRowState((prev) => ({ ...prev, [result.id]: "done" }));
          setRowMessage((prev) => ({ ...prev, [result.id]: run.message }));
        } else {
          setRowState((prev) => ({ ...prev, [result.id]: "error" }));
          setRowMessage((prev) => ({ ...prev, [result.id]: "No se pudo procesar el archivo." }));
        }
      }
      onUpdated(latestWorkspace);
      onImported();
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-[var(--isalwa-slate)]/70">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando archivos de Google Drive…
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-[var(--isalwa-tint-amber-ink)]">
        No se pudieron cargar los archivos: {loadError}
      </p>
    );
  }

  if (files.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/70">
        No se encontraron archivos en esta cuenta de Google Drive.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
          {selected.size} seleccionado(s)
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => void loadFiles()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Actualizar
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selected.size === 0 || importing}
            onClick={() => void handleImportSelected()}
          >
            {importing ? "Importando…" : "Importar seleccionados"}
          </Button>
        </div>
      </div>

      <ul className="space-y-2">
        {files.map((file) => {
          const state = rowState[file.id] ?? "idle";
          return (
            <li
              key={file.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <label className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-[var(--isalwa-mist)]"
                  checked={selected.has(file.id)}
                  disabled={!file.importable}
                  onChange={() => toggle(file.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm text-[var(--isalwa-kiln)]">{file.name}</span>
                  <span className="mt-1 block text-[11px] text-[var(--isalwa-slate)]/60">
                    {[
                      file.sizeBytes ? formatFileSize(file.sizeBytes) : null,
                      file.modifiedAt ? formatRelativeActivity(file.modifiedAt) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {!file.importable ? (
                    <span className="mt-1 block text-[11px] text-[var(--isalwa-slate)]/60">
                      {file.reasonIfNotImportable ?? "No se puede leer este tipo de archivo todavía."}
                    </span>
                  ) : null}
                  {rowMessage[file.id] ? (
                    <span
                      className={`mt-1 block text-[11px] ${
                        state === "error"
                          ? "text-[var(--isalwa-tint-amber-ink)]"
                          : "text-[var(--isalwa-tint-green-ink)]"
                      }`}
                    >
                      {rowMessage[file.id]}
                    </span>
                  ) : null}
                </span>
              </label>
              <span className="shrink-0">
                {state === "importing" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--isalwa-slate)]/60" aria-hidden />
                ) : state === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--isalwa-tint-green-ink)]" aria-hidden />
                ) : state === "error" ? (
                  <XCircle className="h-4 w-4 text-[var(--isalwa-tint-amber-ink)]" aria-hidden />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
