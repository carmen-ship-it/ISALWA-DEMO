"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { KnowledgeUpload } from "@/components/workspace/knowledge-upload";
import {
  INTAKE_SOURCES,
  ingestFileThroughIntake,
  ingestSource,
  type IntakeIngestReport,
} from "@/lib/intake";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";
import { coverageAreaLabel, coverageBand, coverageBandLabelEs } from "@/lib/presentation";
import type { CompanyWorkspace } from "@/types";

/**
 * Business Knowledge — the client-facing promise: help us understand faster,
 * fewer questions. Reuses `KnowledgeUpload` (drag/drop UI unchanged) routed
 * through the Unified Business Knowledge Intake pipeline (`lib/intake`), and
 * reuses the existing Knowledge Engine vault for coverage/gaps — no parallel
 * upload widget, no parallel scoring.
 */
export function BusinessKnowledge({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const notesId = useId();
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [reports, setReports] = useState<IntakeIngestReport[]>([]);

  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const processedCount = knowledge.assets.filter(
    (a) => a.status === "processed",
  ).length;
  const stillNeed = Array.from(
    new Set([
      ...workspace.openQuestions,
      ...knowledge.unknownAreas.map(coverageAreaLabel),
    ]),
  ).slice(0, 6);

  const availableSources = INTAKE_SOURCES.filter(
    (s) => s.status === "designed" && s.id !== "interview",
  );
  const futureSources = INTAKE_SOURCES.filter((s) => s.status === "planned");

  const handleReport = (report: IntakeIngestReport) => {
    setReports((prev) => [report, ...prev].slice(0, 6));
  };

  const handleSaveNotes = async () => {
    const text = notes.trim();
    if (!text || savingNotes) return;
    setSavingNotes(true);
    try {
      const result = await ingestSource(workspace.id, {
        sourceType: "manual_notes",
        label: "Notas manuales",
        textContent: text,
      });
      if (result) {
        onUpdated(result.workspace);
        handleReport(result.report);
        setNotes("");
      }
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Conocimiento del negocio
        </p>
        <h2 className="architect-serif mt-2 text-3xl leading-tight text-[var(--isalwa-kiln)]">
          Ayúdenos a entender su negocio más rápido.
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--isalwa-slate)]">
          Cuanta más información nos dé, menos preguntas necesitamos hacerle
          en la entrevista. Manuales, procedimientos, hojas de cálculo,
          contratos, transcripciones de reuniones — todo suma a lo que ya
          sabemos.
        </p>
      </div>

      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Qué puede compartir hoy
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {availableSources.map((source) => (
            <li
              key={source.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{source.titleEs}</p>
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">
                {source.descriptionEs}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Subir documentos
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          Ejemplos: manual del empleado, procedimientos (SOP), lista de
          clientes, historial de ventas, facturas, contratos, presentaciones.
        </p>
        <div className="mt-4">
          <KnowledgeUpload
            workspaceId={workspace.id}
            onUpdated={onUpdated}
            ingest={ingestFileThroughIntake}
            onReport={handleReport}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Notas manuales
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          ¿No tiene un documento a la mano? Escriba lo que sabe — políticas,
          quién hace qué, cómo funciona un proceso.
        </p>
        <div className="mt-4 space-y-3">
          <label htmlFor={notesId} className="sr-only">
            Notas sobre el negocio
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
            placeholder="Por ejemplo: 'Las aprobaciones de compra las hace siempre el gerente de operaciones antes de $5,000…'"
            className="w-full rounded-2xl border border-[var(--isalwa-mist)] bg-white/80 px-4 py-3 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--isalwa-glaze)]/45"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={!notes.trim() || savingNotes}
            onClick={handleSaveNotes}
          >
            {savingNotes ? "Guardando…" : "Guardar notas"}
          </Button>
        </div>
      </div>

      {reports.length > 0 ? (
        <Card className="px-5 py-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            Lo que acabamos de aprender
          </p>
          <ul className="mt-4 space-y-4">
            {reports.map((report, index) => (
              <li key={`${report.sourceType}_${index}`} className="space-y-1.5">
                {report.learnedLines.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-[var(--isalwa-tint-green-ink)]">
                    ✓ {line}
                  </p>
                ))}
                {report.stillNeedLines.map((line) => (
                  <p key={line} className="text-sm leading-relaxed text-[var(--isalwa-tint-amber-ink)]">
                    — {line}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Cobertura por área
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Meta label="Documentos procesados" value={String(processedCount)} />
          <Meta
            label="Reglas de negocio encontradas"
            value={String(knowledge.businessRules.length)}
          />
          <Meta
            label="Puntos a aclarar"
            value={String(knowledge.contradictions.length)}
          />
          <Meta
            label="Preguntas que podríamos evitar"
            value={String(Math.max(0, 5 - stillNeed.length))}
          />
        </div>
        <ul className="mt-5 space-y-3">
          {knowledge.coverage.map((slice) => {
            const band = coverageBand(slice.percent, "percent");
            return (
              <li key={slice.area} className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[var(--isalwa-slate)]">
                      {coverageAreaLabel(slice.area)}
                    </span>
                    <span className="text-[var(--isalwa-kiln)]">
                      {coverageBandLabelEs(band)}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--isalwa-mist)]">
                    <div
                      className="h-full rounded-full bg-[var(--isalwa-glaze-deep)] transition-all"
                      style={{ width: `${Math.max(6, slice.percent)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Aún necesitamos
        </p>
        {stillNeed.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]/80">
            Por ahora no detectamos vacíos claros — buena señal.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {stillNeed.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-[var(--isalwa-tint-amber-border)]/80 bg-[var(--isalwa-tint-amber)]/60 px-4 py-3 text-sm text-[var(--isalwa-slate)]"
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ExecutiveDetail
        labelExpand="Ver próximas fuentes de datos"
        labelCollapse="Ocultar próximas fuentes"
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            Con el tiempo, Architect podrá aprender directamente de más
            sistemas — sin que usted tenga que exportar nada a mano.
          </p>
        }
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {futureSources.map((source) => (
            <li
              key={source.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{source.titleEs}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                Próximamente
              </p>
            </li>
          ))}
        </ul>
      </ExecutiveDetail>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {label}
      </p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{value}</p>
    </div>
  );
}
