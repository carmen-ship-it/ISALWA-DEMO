"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LivingDeliverableArticle } from "@/components/workspace/living-deliverable-article";
import {
  buildLivingDeliverablesOverview,
  livingDeliverableCopy,
  regenerateLivingDeliverable,
} from "@/lib/deliverables/living";
// Imports the pure compose module directly (not the `export/index.ts`
// barrel) so the Node-only `pdf-lib` / `docx` renderers never enter the
// client bundle — those stay behind `app/api/deliverables/living/export`.
import { composeLivingDeliverableDocument } from "@/lib/deliverables/living/export/compose";
import { strengthBandLabelEs, toPercent } from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type {
  CompanyWorkspace,
  LivingDeliverableKind,
  LivingDeliverableOverview,
} from "@/types";

type ExportFormat = "pdf" | "docx";

/**
 * Mission 26 — Living Deliverables Center.
 *
 * Not a downloads page: the place Álvaro watches Architect keep building
 * the company's own Operating System. Every card composes strictly from
 * existing engines (Blueprint, Company Model, Process Engine, Consulting
 * Intelligence, Explained Recommendations — see `lib/deliverables/living/`)
 * and never auto-regenerates — the brain learning something new only shows
 * "Actualización disponible"; the user always chooses when to regenerate.
 *
 * UX rule (Carmen): the primary action always reads as building *this
 * company's* document ("Generar el Manual del Empleado de ISALWA"), never
 * "Download PDF" as if handing over a static template. Download buttons
 * only appear once a version has actually been generated.
 */
export function LivingDeliverablesCenter({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const overview = useMemo(() => buildLivingDeliverablesOverview(workspace), [workspace]);
  const [busyKind, setBusyKind] = useState<LivingDeliverableKind | null>(null);
  const [downloadKey, setDownloadKey] = useState<string | null>(null);
  const [expandedKind, setExpandedKind] = useState<LivingDeliverableKind | null>(null);
  const [errorByKind, setErrorByKind] = useState<Record<string, string>>({});

  const handleGenerate = async (kind: LivingDeliverableKind) => {
    setBusyKind(kind);
    setErrorByKind((prev) => ({ ...prev, [kind]: "" }));
    try {
      const result = await regenerateLivingDeliverable(workspace.id, kind);
      if (!result) {
        setErrorByKind((prev) => ({
          ...prev,
          [kind]: "Architect todavía no tiene suficiente base (Blueprint) para construir este documento.",
        }));
        return;
      }
      onUpdated(result.workspace);
      setExpandedKind(kind);
    } finally {
      setBusyKind(null);
    }
  };

  const handleDownload = async (
    item: LivingDeliverableOverview,
    format: ExportFormat,
  ) => {
    if (!item.latest) return;
    const key = `${item.kind}-${format}`;
    setDownloadKey(key);
    try {
      const document = composeLivingDeliverableDocument(
        item.latest,
        workspace.companyName,
        item.history,
      );
      const response = await fetch("/api/deliverables/living/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          document,
          fileNameHint: `${workspace.companyName}-${item.kind}-v${item.latest.version}`,
        }),
      });
      if (!response.ok) throw new Error("export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${workspace.companyName}-${item.kind}-v${item.latest.version}.${format}`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorByKind((prev) => ({
        ...prev,
        [item.kind]: "No se pudo generar el archivo en este momento. Intente de nuevo.",
      }));
    } finally {
      setDownloadKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="px-5 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Centro de Entregables Vivos
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          El Sistema Operativo de {workspace.companyName}, en construcción continua
        </h3>
        <p className="mt-3 max-w-2xl text-[var(--isalwa-slate)]">
          Cada documento se compone al instante desde lo que Architect ya sabe — Blueprint, modelo
          de la empresa, procesos, recomendaciones. Cuando el conocimiento crece, el documento
          muestra &ldquo;Actualización disponible&rdquo; — usted decide cuándo regenerarlo.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {overview.map((item) => (
          <DeliverableCard
            key={item.kind}
            item={item}
            companyName={workspace.companyName}
            busy={busyKind === item.kind}
            downloadKey={downloadKey}
            expanded={expandedKind === item.kind}
            error={errorByKind[item.kind]}
            onToggleExpand={() =>
              setExpandedKind((prev) => (prev === item.kind ? null : item.kind))
            }
            onGenerate={() => void handleGenerate(item.kind)}
            onDownload={(format) => void handleDownload(item, format)}
          />
        ))}
      </div>
    </div>
  );
}

function DeliverableCard({
  item,
  companyName,
  busy,
  downloadKey,
  expanded,
  error,
  onToggleExpand,
  onGenerate,
  onDownload,
}: {
  item: LivingDeliverableOverview;
  companyName: string;
  busy: boolean;
  downloadKey: string | null;
  expanded: boolean;
  error?: string;
  onToggleExpand: () => void;
  onGenerate: () => void;
  onDownload: (format: ExportFormat) => void;
}) {
  const copy = livingDeliverableCopy(item.kind, companyName);
  const latest = item.latest;
  const primaryLabel = busy
    ? copy.generateBusyLabel
    : !latest
      ? copy.generateLabel
      : item.updateAvailable
        ? copy.updateLabel
        : copy.regenerateLabel;

  return (
    <Card className="flex flex-col px-5 py-5">
      <div className="flex-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
          {copy.kicker}
        </p>
        <h4 className="architect-serif mt-2 text-xl text-[var(--isalwa-kiln)]">{copy.title}</h4>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]/80">{copy.description}</p>

        {latest ? (
          <div className="mt-4 space-y-1.5 text-xs text-[var(--isalwa-slate)]/70">
            <p>
              Versión {latest.version} · {formatRelativeActivity(latest.generatedAt)}
            </p>
            <p>
              {strengthBandLabelEs(latest.confidence)} · {toPercent(latest.confidence)}% de confianza ·{" "}
              {latest.evidenceCount} referencias de evidencia
            </p>
            {latest.missingInformation.length > 0 ? (
              <p className="text-[var(--isalwa-slate)]/60">
                Falta conocer: {latest.missingInformation.slice(0, 2).join("; ")}
                {latest.missingInformation.length > 2 ? "…" : ""}
              </p>
            ) : null}
            {item.updateAvailable ? (
              <p className="inline-flex items-center gap-1 rounded-full bg-[var(--isalwa-glaze)]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--isalwa-kiln)]">
                Actualización disponible
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--isalwa-slate)]/60">{copy.emptyStateNote}</p>
        )}

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={onGenerate} disabled={busy} className="gap-2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : latest ? (
            <RefreshCw className="h-4 w-4" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {primaryLabel}
        </Button>

        {latest ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={onToggleExpand} className="gap-1.5">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {expanded ? "Ocultar" : "Ver en línea"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownload("pdf")}
              disabled={downloadKey === `${item.kind}-pdf`}
              className="gap-1.5"
            >
              {downloadKey === `${item.kind}-pdf` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="h-3.5 w-3.5" aria-hidden />
              )}
              Descargar PDF
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownload("docx")}
              disabled={downloadKey === `${item.kind}-docx`}
              className="gap-1.5"
            >
              {downloadKey === `${item.kind}-docx` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              Descargar Word
            </Button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {expanded && latest ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-5 max-h-[32rem] overflow-y-auto rounded-2xl border border-[var(--isalwa-mist)]/70 bg-[var(--isalwa-porcelain)]/60 px-4 py-4">
              <LivingDeliverableArticle content={latest.content} title={latest.title} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
