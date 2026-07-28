"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDown,
  BookOpen,
  Brain,
  Download,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  Network,
  RefreshCw,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LivingDeliverableArticle } from "@/components/workspace/living-deliverable-article";
import {
  buildCompanyOperatingSystem,
  type OperatingSystemArtifact,
  type OsArtifactStatus,
  type OsProgressBar,
} from "@/lib/consulting-intelligence/company-operating-system";
import {
  buildLivingDeliverablesOverview,
  livingDeliverableCopy,
  regenerateLivingDeliverable,
} from "@/lib/deliverables/living";
// Imports the pure compose module directly (not the `export/index.ts`
// barrel) so the Node-only `pdf-lib` / `docx` renderers never enter the
// client bundle — those stay behind `app/api/deliverables/living/export`.
import { composeLivingDeliverableDocument } from "@/lib/deliverables/living/export/compose";
import { formatRelativeActivity } from "@/lib/workspace";
import { cn } from "@/lib/utils";
import type {
  CompanyWorkspace,
  LivingDeliverableKind,
  LivingDeliverableOverview,
} from "@/types";

type ExportFormat = "pdf" | "docx";

const PIPELINE_ICONS = [MessageSquare, BookOpen, Brain, Network, Target] as const;

const STATUS_TONE: Record<OsArtifactStatus, string> = {
  not_started:
    "bg-[var(--isalwa-mist)]/60 text-[var(--isalwa-slate)]",
  needs_knowledge:
    "bg-[var(--isalwa-tint-amber)]/70 text-[var(--isalwa-tint-amber-ink)]",
  ready_to_build:
    "bg-[var(--isalwa-tint-green)]/50 text-[var(--isalwa-kiln)]",
  update_available:
    "bg-[var(--isalwa-glaze)]/15 text-[var(--isalwa-kiln)]",
};

/**
 * Mission 27 — Company Operating System center.
 *
 * Deliverables are outputs; this surface exposes the state of the company's
 * operating system. Same Mission 26 generators — Build / Export language,
 * Business Impact, Teach, categories. Never a second catalog.
 */
export function LivingDeliverablesCenter({
  workspace,
  onUpdated,
  focusKind,
  onFocusConsumed,
  onTeach,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
  focusKind?: LivingDeliverableKind | null;
  onFocusConsumed?: () => void;
  /** Navigate to Knowledge / Teach Architect. */
  onTeach?: () => void;
}) {
  const report = useMemo(
    () => buildCompanyOperatingSystem(workspace),
    [workspace],
  );
  const overviewByKind = useMemo(() => {
    const map = new Map<LivingDeliverableKind, LivingDeliverableOverview>();
    for (const item of buildLivingDeliverablesOverview(workspace)) {
      map.set(item.kind, item);
    }
    return map;
  }, [workspace]);

  const [busyKind, setBusyKind] = useState<LivingDeliverableKind | null>(null);
  const [downloadKey, setDownloadKey] = useState<string | null>(null);
  const [expandedKind, setExpandedKind] = useState<LivingDeliverableKind | null>(null);
  const [errorByKind, setErrorByKind] = useState<Record<string, string>>({});
  const [highlightedKind, setHighlightedKind] = useState<LivingDeliverableKind | null>(null);

  useEffect(() => {
    if (!focusKind) return;
    setExpandedKind(focusKind);
    setHighlightedKind(focusKind);
    onFocusConsumed?.();
    const el = document.getElementById(`living-deliverable-${focusKind}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusKind, onFocusConsumed]);

  const handleBuild = async (kind: LivingDeliverableKind) => {
    setBusyKind(kind);
    setErrorByKind((prev) => ({ ...prev, [kind]: "" }));
    try {
      const result = await regenerateLivingDeliverable(workspace.id, kind);
      if (!result) {
        setErrorByKind((prev) => ({
          ...prev,
          [kind]:
            "Architect todavía no tiene suficiente base (Blueprint) para construir esta parte del sistema operativo.",
        }));
        return;
      }
      onUpdated(result.workspace);
      setExpandedKind(kind);
    } finally {
      setBusyKind(null);
    }
  };

  const handleExport = async (
    kind: LivingDeliverableKind,
    format: ExportFormat,
  ) => {
    const item = overviewByKind.get(kind);
    if (!item?.latest) return;
    const key = `${kind}-${format}`;
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
          fileNameHint: `${workspace.companyName}-${kind}-v${item.latest.version}`,
        }),
      });
      if (!response.ok) throw new Error("export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${workspace.companyName}-${kind}-v${item.latest.version}.${format}`;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setErrorByKind((prev) => ({
        ...prev,
        [kind]: "No se pudo exportar el archivo en este momento. Intente de nuevo.",
      }));
    } finally {
      setDownloadKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="px-5 py-6 sm:px-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Sistema operativo de la empresa
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {report.promise}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {report.pipelineNote}
        </p>

        <ol className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {report.pipeline.map((step, index) => {
            const Icon = PIPELINE_ICONS[index] ?? Target;
            return (
              <li key={step.id} className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-[var(--isalwa-kiln)] ring-1 ring-[var(--isalwa-mist)]">
                  <span className="isalwa-icon-chip isalwa-ink-blue !h-8 !w-8">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {step.label}
                </span>
                {index < report.pipeline.length - 1 ? (
                  <ArrowDown
                    className="hidden h-4 w-4 shrink-0 text-[var(--isalwa-slate)]/40 sm:block sm:rotate-[-90deg]"
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
            Tu empresa · {workspace.companyName}
          </p>
          {report.progress.map((bar) => (
            <ProgressRow key={bar.id} bar={bar} />
          ))}
          <p className="pt-1 text-sm text-[var(--isalwa-kiln)]">
            Architect entiende tu negocio; aún hay trabajo para documentar y operar.
          </p>
        </div>
      </Card>

      {report.categories.map((category) => (
        <section key={category.id} className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/70">
              {category.label}
            </p>
            <h4 className="mt-1 text-lg text-[var(--isalwa-kiln)]">
              {category.systemLabel}
            </h4>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {category.artifacts.map((artifact) => (
              <OsArtifactCard
                key={artifact.kind}
                artifact={artifact}
                companyName={workspace.companyName}
                overview={overviewByKind.get(artifact.kind)}
                busy={busyKind === artifact.kind}
                downloadKey={downloadKey}
                expanded={expandedKind === artifact.kind}
                highlighted={highlightedKind === artifact.kind}
                error={errorByKind[artifact.kind]}
                onToggleExpand={() =>
                  setExpandedKind((prev) =>
                    prev === artifact.kind ? null : artifact.kind,
                  )
                }
                onBuild={() => void handleBuild(artifact.kind)}
                onExport={(format) => void handleExport(artifact.kind, format)}
                onTeach={onTeach}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProgressRow({ bar }: { bar: OsProgressBar }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-[var(--isalwa-kiln)]">{bar.label}</span>
        <span className="tabular-nums text-[var(--isalwa-slate)]">{bar.percent}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[var(--isalwa-mist)]/70"
        role="progressbar"
        aria-valuenow={bar.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={bar.label}
      >
        <div
          className="h-full rounded-full bg-[var(--isalwa-kiln)]/80 transition-[width] duration-500"
          style={{ width: `${Math.max(0, Math.min(100, bar.percent))}%` }}
        />
      </div>
    </div>
  );
}

function OsArtifactCard({
  artifact,
  companyName,
  overview,
  busy,
  downloadKey,
  expanded,
  highlighted,
  error,
  onToggleExpand,
  onBuild,
  onExport,
  onTeach,
}: {
  artifact: OperatingSystemArtifact;
  companyName: string;
  overview?: LivingDeliverableOverview;
  busy: boolean;
  downloadKey: string | null;
  expanded: boolean;
  highlighted?: boolean;
  error?: string;
  onToggleExpand: () => void;
  onBuild: () => void;
  onExport: (format: ExportFormat) => void;
  onTeach?: () => void;
}) {
  const copy = livingDeliverableCopy(artifact.kind, companyName);
  const latest = overview?.latest ?? null;
  const primaryLabel = busy ? artifact.buildBusyLabel : artifact.buildLabel;
  const bf = artifact.builtFrom;

  return (
    <Card
      id={`living-deliverable-${artifact.kind}`}
      className={cn(
        "flex flex-col px-5 py-5",
        highlighted && "ring-2 ring-[var(--isalwa-glaze)]/50",
      )}
    >
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em]",
              STATUS_TONE[artifact.status],
            )}
          >
            {artifact.statusLabel}
          </span>
          {artifact.hasVersion && artifact.version != null ? (
            <span className="text-[11px] text-[var(--isalwa-slate)]/70">
              Versión {artifact.version}
              {artifact.lastUpdatedAt
                ? ` · ${formatRelativeActivity(artifact.lastUpdatedAt)}`
                : ""}
            </span>
          ) : null}
        </div>

        <h4 className="architect-serif mt-3 text-xl text-[var(--isalwa-kiln)]">
          {artifact.title}
        </h4>
        <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/55">
          {artifact.capabilitySystem}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]/85">
          {artifact.whyMatters}
        </p>

        <p className="mt-4 text-sm text-[var(--isalwa-kiln)]">
          {artifact.confidencePercent}% completo
        </p>

        <div className="mt-3 space-y-1 text-xs text-[var(--isalwa-slate)]/75">
          <p className="font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/55">
            Construido desde
          </p>
          <ul className="space-y-0.5">
            <li>
              {bf.interviewFacts > 0 ? "✓" : "○"} {bf.interviewFacts}{" "}
              {bf.interviewFacts === 1 ? "hecho de entrevista" : "hechos de entrevista"}
            </li>
            <li>
              {bf.documents > 0 ? "✓" : "○"} {bf.documents}{" "}
              {bf.documents === 1 ? "documento" : "documentos"}
            </li>
            <li>
              {bf.meetings > 0 ? "✓" : "○"} {bf.meetings}{" "}
              {bf.meetings === 1 ? "reunión" : "reuniones"}
            </li>
          </ul>
        </div>

        {artifact.missingInformation.length > 0 ? (
          <div className="mt-3 space-y-1 text-xs text-[var(--isalwa-slate)]/75">
            <p className="font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/55">
              Falta
            </p>
            <ul className="space-y-0.5">
              {artifact.missingInformation.slice(0, 4).map((gap) => (
                <li key={gap}>⚠ {gap}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-3 space-y-1 text-xs text-[var(--isalwa-slate)]/75">
          <p className="font-medium uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/55">
            Impacto en el negocio
          </p>
          <ul className="space-y-0.5">
            {artifact.businessImpact.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
        </div>

        {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={onBuild} disabled={busy} className="gap-2">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : artifact.hasVersion ? (
            <RefreshCw className="h-4 w-4" aria-hidden />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden />
          )}
          {primaryLabel}
        </Button>

        {onTeach ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onTeach}
            className="gap-2"
          >
            <Upload className="h-4 w-4" aria-hidden />
            Enseñar a Architect
          </Button>
        ) : null}

        {latest ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onToggleExpand}
              className="gap-1.5"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {expanded ? "Ocultar" : "Ver en línea"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExport("pdf")}
              disabled={downloadKey === `${artifact.kind}-pdf`}
              className="gap-1.5"
            >
              {downloadKey === `${artifact.kind}-pdf` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Download className="h-3.5 w-3.5" aria-hidden />
              )}
              {copy.exportPdfLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onExport("docx")}
              disabled={downloadKey === `${artifact.kind}-docx`}
              className="gap-1.5"
            >
              {downloadKey === `${artifact.kind}-docx` ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <FileText className="h-3.5 w-3.5" aria-hidden />
              )}
              {copy.exportWordLabel}
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
              <LivingDeliverableArticle
                content={latest.content}
                title={latest.title}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}

/** @deprecated alias — Mission 27 center is LivingDeliverablesCenter. */
export { LivingDeliverablesCenter as CompanyOperatingSystemCenter };
