"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { KnowledgeUpload } from "@/components/workspace/knowledge-upload";
import { useTranslations } from "@/lib/i18n";
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

const PIPELINE_KEY_BY_STAGE_ID: Record<string, string> = {
  upload: "upload",
  parser: "parser",
  knowledge_extraction: "knowledgeExtraction",
  memory: "memory",
  recommendations: "recommendations",
  reasoning_engine: "reasoningEngine",
};

const CATEGORY_KEY: Record<KnowledgeCategory, string> = {
  "Company Documents": "companyDocuments",
  "Meeting Transcripts": "meetingTranscripts",
  "Customer Lists": "customerLists",
  "Sales Data": "salesData",
  Invoices: "invoices",
  Presentations: "presentations",
  Images: "images",
  "Process Documents": "processDocuments",
  Policies: "policies",
  "Manual Notes": "manualNotes",
  "Future Imports": "futureImports",
};

const STATUS_KEY: Record<string, string> = {
  designed: "designed",
  queued: "queued",
  parsing: "parsing",
  extracting: "extracting",
  processed: "processed",
  failed: "failed",
};

export function KnowledgeCenter({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const { t } = useTranslations();
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
          {t("knowledgeCenter.uploadEvidence")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.uploadEvidenceDescription")}
        </p>
        <div className="mt-4">
          <KnowledgeUpload workspaceId={workspace.id} onUpdated={onUpdated} />
        </div>
      </div>

      <Card className="px-5 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.knowledgeSummary")}
        </p>
        <p className="mt-3 text-[var(--isalwa-slate)]">
          {vault.summary ?? t("knowledgeCenter.noSummaryYet")}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <Meta label={t("knowledgeCenter.documentsProcessed")} value={String(processed.length)} />
          <Meta label={t("knowledgeCenter.queued")} value={String(queued.length)} />
          <Meta
            label={t("knowledgeCenter.lastAnalysis")}
            value={
              vault.lastAnalysisAt
                ? formatRelativeActivity(vault.lastAnalysisAt)
                : "—"
            }
          />
          <Meta
            label={t("knowledgeCenter.questionsForNextSession")}
            value={String(questionsForNextSession)}
          />
        </div>
        {vault.unknownAreas.length > 0 ? (
          <p className="mt-5 text-sm text-[var(--isalwa-slate)]/80">
            {t("knowledgeCenter.unclearAreas", {
              areas: vault.unknownAreas.map(coverageAreaLabel).join(" · "),
            })}
          </p>
        ) : null}
      </Card>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.entitiesFound")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.entitiesFoundDescription")}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <EntityCount label={t("knowledgeCenter.documents")} value={entitySummary.documents} />
          <EntityCount
            label={t("knowledgeCenter.departments")}
            value={entitySummary.departments}
            emptyHint={t("knowledgeCenter.contentReadingRequired")}
          />
          <EntityCount
            label={t("knowledgeCenter.people")}
            value={entitySummary.people}
            emptyHint={t("knowledgeCenter.contentReadingRequired")}
          />
          <EntityCount
            label={t("knowledgeCenter.processes")}
            value={entitySummary.processes}
            emptyHint={t("knowledgeCenter.contentReadingRequired")}
          />
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.coverageByArea")}
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
          {t("knowledgeCenter.evidenceLibrary")}
        </p>
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
          {t("knowledgeCenter.evidenceLibraryDescription")}
        </p>
        <div className="mt-5 space-y-6">
          {KNOWLEDGE_CATEGORIES.map((category) => {
            const items = byCategory.get(category) ?? [];
            return (
              <div key={category}>
                <p className="text-sm text-[var(--isalwa-kiln)]">
                  {t(`knowledgeCenter.category.${CATEGORY_KEY[category]}`)}
                </p>
                {items.length === 0 ? (
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]/60">
                    {t("knowledgeCenter.empty")}
                  </p>
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
                          {STATUS_KEY[item.status]
                            ? t(`knowledgeCenter.status.${STATUS_KEY[item.status]}`)
                            : item.status}
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
            {t("knowledgeCenter.identifiedTopics")}
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
        labelExpand={t("knowledgeCenter.expandProcessing")}
        labelCollapse={t("knowledgeCenter.collapseProcessing")}
        summary={
          <p className="text-sm text-[var(--isalwa-slate)]">
            {t("knowledgeCenter.processingSummary")}
          </p>
        }
      >
        <ol className="space-y-2">
          {KNOWLEDGE_PIPELINE.map((stage, index) => {
            const pipelineKey = PIPELINE_KEY_BY_STAGE_ID[stage.id];
            const label = pipelineKey
              ? {
                  title: t(`knowledgeCenter.pipeline.${pipelineKey}.title`),
                  description: t(`knowledgeCenter.pipeline.${pipelineKey}.description`),
                }
              : { title: stage.title, description: stage.description };
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
          {t("knowledgeCenter.upcomingDataSources")}
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {KNOWLEDGE_CONNECTORS.slice(0, 8).map((connector) => (
            <li
              key={connector.id}
              className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
            >
              <p className="text-sm text-[var(--isalwa-kiln)]">{connector.title}</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                {connector.status === "planned"
                  ? t("knowledgeCenter.planned")
                  : t("knowledgeCenter.designedStatus")}
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
