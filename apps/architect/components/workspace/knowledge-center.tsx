"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { KnowledgeUpload } from "@/components/workspace/knowledge-upload";
import {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_CONNECTORS,
  KNOWLEDGE_PIPELINE,
  ensureWorkspaceKnowledge,
  summarizeKnowledgeEntities,
} from "@/lib/knowledge";
import { coverageAreaLabel, coverageBand, coverageBandLabelEs } from "@/lib/presentation";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace, KnowledgeCategory, WorkspaceKnowledge } from "@/types";

const PIPELINE_LABELS_ES: Record<
  string,
  { title: string; description: string }
> = {
  upload: {
    title: "Carga",
    description: "Recibir archivos hacia el Centro de Conocimiento.",
  },
  parser: {
    title: "Lectura de formato",
    description:
      "Clasificar PDF, Excel, Word, PowerPoint e imágenes por nombre y tipo de archivo.",
  },
  knowledge_extraction: {
    title: "Extracción de conocimiento",
    description:
      "Registrar el documento como evidencia y estimar su área de cobertura.",
  },
  memory: {
    title: "Memoria",
    description:
      "Fusionar la evidencia con la Memoria de la Empresa al reanudar el descubrimiento.",
  },
  recommendations: {
    title: "Recomendaciones",
    description: "Sugerir módulos, riesgos y próximas preguntas — próxima etapa.",
  },
  reasoning_engine: {
    title: "Motor de razonamiento",
    description:
      "El cerebro consultor combina conversación, conocimiento y memoria.",
  },
};

const CATEGORY_LABELS_ES: Record<KnowledgeCategory, string> = {
  "Company Documents": "Documentos de la empresa",
  "Meeting Transcripts": "Transcripciones de reuniones",
  "Customer Lists": "Listas de clientes",
  "Sales Data": "Datos de ventas",
  Invoices: "Facturas",
  Presentations: "Presentaciones",
  Images: "Imágenes",
  "Process Documents": "Documentos de procesos",
  Policies: "Políticas",
  "Manual Notes": "Notas manuales",
  "Future Imports": "Futuras importaciones",
};

const STATUS_LABELS_ES: Record<string, string> = {
  designed: "Diseñado",
  queued: "En cola",
  parsing: "Leyendo",
  extracting: "Extrayendo",
  processed: "Procesado",
  failed: "Sin lector",
};

export function KnowledgeCenter({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const vault = ensureWorkspaceKnowledge(workspace.knowledge);
  const processed = vault.assets.filter((a) => a.status === "processed");
  const queued = vault.assets.filter((a) => a.status === "queued");
  const byCategory = groupByCategory(vault);
  const entitySummary = summarizeKnowledgeEntities(vault.entities);
  const questionsForNextSession = vault.unknownAreas.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Subir evidencia
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          Cada documento se clasifica por su nombre y tipo de archivo — sin
          lectura de contenido — y suma a la cobertura de conocimiento.
        </p>
        <div className="mt-4">
          <KnowledgeUpload workspaceId={workspace.id} onUpdated={onUpdated} />
        </div>
      </div>

      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Resumen de conocimiento
        </p>
        <p className="mt-3 text-[var(--isalwa-slate)]">
          {vault.summary ??
            "Aún no se ha analizado conocimiento de la empresa. Los documentos que suba aparecerán aquí como evidencia."}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Meta label="Documentos procesados" value={String(processed.length)} />
          <Meta label="En cola" value={String(queued.length)} />
          <Meta
            label="Último análisis"
            value={
              vault.lastAnalysisAt
                ? formatRelativeActivity(vault.lastAnalysisAt)
                : "—"
            }
          />
          <Meta
            label="Preguntas para la próxima sesión"
            value={String(questionsForNextSession)}
          />
        </div>
        {vault.unknownAreas.length > 0 ? (
          <p className="mt-5 text-sm text-[var(--isalwa-slate)]/80">
            Aún no está claro:{" "}
            {vault.unknownAreas.map(coverageAreaLabel).join(" · ")} — el
            Architect preguntará por esto en la próxima sesión de
            descubrimiento.
          </p>
        ) : null}
      </Card>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Entidades encontradas
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          Lo que el motor de conocimiento ya identificó — en ceros cuando el
          formato aún no tiene lectura de contenido activa.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <EntityCount label="Documentos" value={entitySummary.documents} />
          <EntityCount
            label="Departamentos"
            value={entitySummary.departments}
            emptyHint="Requiere lectura de contenido — aún no disponible."
          />
          <EntityCount
            label="Personas"
            value={entitySummary.people}
            emptyHint="Requiere lectura de contenido — aún no disponible."
          />
          <EntityCount
            label="Procesos"
            value={entitySummary.processes}
            emptyHint="Requiere lectura de contenido — aún no disponible."
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Cobertura por área
        </p>
        <ul className="mt-4 space-y-3">
          {vault.coverage.map((slice) => {
            const band = coverageBand(slice.percent, "percent");
            const width =
              band === "Strong"
                ? 90
                : band === "Solid"
                  ? 70
                  : band === "Partial"
                    ? 50
                    : band === "Limited"
                      ? 30
                      : 14;
            return (
              <li
                key={slice.area}
                className="flex items-center justify-between gap-4"
              >
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
                      style={{ width: `${width}%` }}
                      aria-hidden
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--isalwa-slate)]/60">{slice.note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Biblioteca de evidencia
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          Evidencia estructurada a partir de los materiales de la empresa.
        </p>
        <div className="mt-5 space-y-6">
          {KNOWLEDGE_CATEGORIES.map((category) => {
            const items = byCategory.get(category) ?? [];
            return (
              <div key={category}>
                <p className="text-sm text-[var(--isalwa-kiln)]">
                  {CATEGORY_LABELS_ES[category]}
                </p>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]/60">Vacío</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm text-[var(--isalwa-kiln)]">{item.title}</p>
                          <p className="mt-1 text-xs text-[var(--isalwa-slate)]/80">
                            {item.source}
                            {item.summary ? ` · ${item.summary}` : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                          {STATUS_LABELS_ES[item.status] ?? item.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {vault.entities.length > 0 ? (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
            Temas identificados
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {vault.entities.map((entity) => (
              <li
                key={entity.id}
                className="rounded-full border border-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
              >
                {entity.name}
              </li>
            ))}
          </ul>
          {vault.relationships.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-[var(--isalwa-slate)]">
              {vault.relationships.slice(0, 5).map((relationship) => (
                <li key={relationship.id}>{relationship.label}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <ExecutiveDetail
        labelExpand="Ver cómo se procesa la evidencia"
        labelCollapse="Ocultar detalle de procesamiento"
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            Los materiales de la empresa pasan por una ruta de revisión
            estructurada antes de convertirse en recomendaciones.
          </p>
        }
      >
        <ol className="space-y-2">
          {KNOWLEDGE_PIPELINE.map((stage, index) => {
            const label = PIPELINE_LABELS_ES[stage.id] ?? {
              title: stage.title,
              description: stage.description,
            };
            return (
              <li key={stage.id} className="flex gap-3 text-sm text-[var(--isalwa-slate)]">
                <span className="tabular-nums text-[var(--isalwa-slate)]/60">
                  {index + 1}.
                </span>
                <span>
                  <span className="text-[var(--isalwa-kiln)]">{label.title}</span>
                  {" — "}
                  {label.description}
                </span>
              </li>
            );
          })}
        </ol>
      </ExecutiveDetail>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          Próximas fuentes de datos
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {KNOWLEDGE_CONNECTORS.slice(0, 8).map((connector) => (
            <li
              key={connector.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{connector.title}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                {connector.status === "planned" ? "Planeado" : "Diseñado"}
              </p>
            </li>
          ))}
        </ul>
      </div>
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

function EntityCount({
  label,
  value,
  emptyHint,
}: {
  label: string;
  value: number;
  emptyHint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {label}
      </p>
      <p className="mt-1 text-lg text-[var(--isalwa-kiln)]">{value}</p>
      {value === 0 && emptyHint ? (
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function groupByCategory(knowledge: WorkspaceKnowledge) {
  const map = new Map<KnowledgeCategory, typeof knowledge.assets>();
  for (const category of KNOWLEDGE_CATEGORIES) {
    map.set(category, []);
  }
  for (const asset of knowledge.assets) {
    const list = map.get(asset.category) ?? [];
    list.push(asset);
    map.set(asset.category, list);
  }
  return map;
}

export function KnowledgeSectionShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--isalwa-slate)]/80">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
