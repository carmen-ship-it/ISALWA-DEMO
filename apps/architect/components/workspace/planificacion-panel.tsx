"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  Layers3,
  Lightbulb,
  Lock,
  Route,
  Shield,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PlanificacionDocumentDownload } from "@/components/workspace/planificacion-document-download";
import { PlanificacionItemCard } from "@/components/workspace/planificacion-item-card";
import { PlanificacionQuestionCard } from "@/components/workspace/planificacion-question-card";
import { SectionShell } from "@/components/workspace/section-shell";
import {
  buildLivingDeliverablesOverview,
  livingDeliverableCopy,
} from "@/lib/deliverables/living";
import { composeLivingDeliverableDocument } from "@/lib/deliverables/living/export/compose";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge";
import { latestLivingDeliverable } from "@/lib/deliverables/living/versioning";
import { useAuth } from "@/hooks/use-auth";
import { useTranslations } from "@/lib/i18n";
import {
  buildPlanificacionViewModel,
  COST_ITEMS,
  normalizePlanificacionState,
  PLANIFICACION_COST_DISCLAIMER,
  PLANIFICACION_DEMO_DATA_NOTICE,
  PLANIFICACION_PRINCIPLE,
  SECURITY_ITEMS,
} from "@/lib/planificacion";
import {
  applyPlanItemClientAction,
  approvePlanItem,
  approvePlanQuestion,
  markPlanItemForReview,
  respondPlanQuestion,
} from "@/lib/planificacion/persist-client";
import { Button } from "@/components/ui/button";
import { nowIso } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type {
  CompanyWorkspace,
  IsalwaPlanificacionStateV2,
  PlanificacionClientAction,
  PlanificacionViewModelItem,
} from "@/types";
import { isPlanificacionStateV2 } from "@/types";

type SectionId =
  | "entendimiento"
  | "recomendaciones"
  | "proponemos"
  | "porque"
  | "necesitamos"
  | "preguntas"
  | "biblioteca"
  | "aprobaciones"
  | "cambios"
  | "costos"
  | "seguridad"
  | "handoff";

const SECTIONS: Array<{ id: SectionId; labelKey: string; icon: typeof Route }> = [
  { id: "entendimiento", labelKey: "planificacion.section.understanding", icon: ClipboardList },
  { id: "recomendaciones", labelKey: "planificacion.section.recommendations", icon: Lightbulb },
  { id: "proponemos", labelKey: "planificacion.section.capabilities", icon: Layers3 },
  { id: "porque", labelKey: "planificacion.section.why", icon: HelpCircle },
  { id: "necesitamos", labelKey: "planificacion.section.needs", icon: HelpCircle },
  { id: "preguntas", labelKey: "planificacion.section.questions", icon: HelpCircle },
  { id: "biblioteca", labelKey: "planificacion.section.library", icon: BookOpen },
  { id: "aprobaciones", labelKey: "planificacion.section.approvals", icon: CheckCircle2 },
  { id: "cambios", labelKey: "planificacion.section.changes", icon: FileText },
  { id: "costos", labelKey: "planificacion.section.costs", icon: Wallet },
  { id: "seguridad", labelKey: "planificacion.section.security", icon: Shield },
  { id: "handoff", labelKey: "planificacion.section.handoff", icon: Route },
];

function ItemList({
  items,
  onItemAction,
  onApprove,
  onReview,
  busy,
}: {
  items: PlanificacionViewModelItem[];
  onItemAction: (item: PlanificacionViewModelItem, action: PlanificacionClientAction, text: string) => void;
  onApprove: (item: PlanificacionViewModelItem) => void;
  onReview: (item: PlanificacionViewModelItem) => void;
  busy: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]/70">
        No hay elementos en esta sección todavía.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <PlanificacionItemCard
          key={item.stableKey}
          item={item}
          busy={busy}
          onAction={(action, text) => onItemAction(item, action, text)}
          onApprove={() => onApprove(item)}
          onReview={() => onReview(item)}
        />
      ))}
    </div>
  );
}

export function PlanificacionPanel({
  workspace,
  onUpdated,
}: {
  workspace: CompanyWorkspace;
  onUpdated: (next: CompanyWorkspace) => void;
}) {
  const { t } = useTranslations();
  const { session } = useAuth();
  const [section, setSection] = useState<SectionId>("entendimiento");
  const [exportBusy, setExportBusy] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const vm = useMemo(() => buildPlanificacionViewModel(workspace), [workspace]);
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const uploadedAssets = knowledge.assets.filter((a) => a.storagePath);
  const livingOverview = useMemo(
    () => buildLivingDeliverablesOverview(workspace),
    [workspace],
  );
  const sopGenerated = latestLivingDeliverable(
    workspace.livingDeliverables,
    "sop_library",
  );
  const processes = workspace.businessProcesses?.workflows ?? [];

  const actor = session?.displayName ?? "Cliente ISALWA";

  const porqueItems = vm.items.filter(
    (item) =>
      Boolean(item.architectProposal.rationale) || item.evidenceRefs.length > 0,
  );
  const approvedItems = vm.items.filter((item) => item.governanceStatus === "aprobado");
  const pendingApproval = vm.items.filter(
    (item) =>
      item.clientResponse &&
      item.governanceStatus !== "aprobado" &&
      item.governanceStatus !== "rechazado",
  );
  const technicalItems = vm.byKind.technical_requirement;
  const commandCenterItems = vm.items.filter((item) =>
    item.stableKey.includes("command-center"),
  );

  const persistState = async (state: IsalwaPlanificacionStateV2) => {
    const next: CompanyWorkspace = {
      ...workspace,
      planificacion: { ...state, lastUpdatedAt: nowIso() },
      updatedAt: nowIso(),
    };
    const store = getClientCompanyMemoryStore();
    const saved = await store.workspaces.save(next);
    onUpdated(saved);
  };

  const currentState = (): IsalwaPlanificacionStateV2 => {
    const plan = workspace.planificacion;
    if (plan && isPlanificacionStateV2(plan)) return plan;
    return normalizePlanificacionState(plan ?? null);
  };

  const handleItemAction = async (
    item: PlanificacionViewModelItem,
    action: PlanificacionClientAction,
    text: string,
  ) => {
    setActionBusy(true);
    try {
      const next = applyPlanItemClientAction(currentState(), item, action, text, actor);
      await persistState(next);
    } finally {
      setActionBusy(false);
    }
  };

  const handleApprove = async (item: PlanificacionViewModelItem) => {
    setActionBusy(true);
    try {
      const next = approvePlanItem(currentState(), item, actor);
      await persistState(next);
    } finally {
      setActionBusy(false);
    }
  };

  const handleReview = async (item: PlanificacionViewModelItem) => {
    setActionBusy(true);
    try {
      const next = markPlanItemForReview(currentState(), item, actor);
      await persistState(next);
    } finally {
      setActionBusy(false);
    }
  };

  const handleQuestionRespond = async (questionId: string, response: string) => {
    setActionBusy(true);
    try {
      const next = respondPlanQuestion(currentState(), questionId, response, actor);
      await persistState(next);
    } finally {
      setActionBusy(false);
    }
  };

  const handleQuestionApprove = async (questionId: string) => {
    setActionBusy(true);
    try {
      const next = approvePlanQuestion(currentState(), questionId, actor);
      await persistState(next);
    } finally {
      setActionBusy(false);
    }
  };

  const exportLiving = async (kind: string, format: "pdf" | "docx") => {
    const item = livingOverview.find((o) => o.kind === kind);
    if (!item?.latest) return;
    setExportBusy(`${kind}-${format}`);
    try {
      const exportDoc = composeLivingDeliverableDocument(
        item.latest,
        workspace.companyName,
        item.history,
      );
      const response = await fetch("/api/deliverables/living/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          document: exportDoc,
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
    } finally {
      setExportBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionShell
        tone="blueprint"
        icon={Route}
        kicker={t("planificacion.kicker")}
        title={t("planificacion.title")}
        description={t("planificacion.description")}
      >
        <p className="text-sm text-[var(--isalwa-slate)]/85 leading-relaxed">
          {PLANIFICACION_PRINCIPLE}
        </p>
        <p className="mt-3 rounded-2xl border border-[var(--isalwa-tint-amber)]/40 bg-[var(--isalwa-tint-amber)]/15 px-4 py-3 text-sm text-[var(--isalwa-tint-amber-ink)]">
          {PLANIFICACION_DEMO_DATA_NOTICE}
        </p>
        <Card className="mt-4 p-4">
          <p className="text-lg text-[var(--isalwa-kiln)]">{vm.overallHeadline}</p>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
            {t("planificacion.understandingPct", { pct: vm.understandingMaturityPct })}
          </p>
        </Card>
      </SectionShell>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              section === id
                ? "bg-[var(--isalwa-kiln)] text-white"
                : "bg-[var(--isalwa-mist)]/50 text-[var(--isalwa-slate)] hover:bg-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {t(labelKey)}
          </button>
        ))}
      </div>

      {section === "entendimiento" && (
        <ItemList
          items={vm.byKind.understanding}
          busy={actionBusy}
          onItemAction={handleItemAction}
          onApprove={handleApprove}
          onReview={handleReview}
        />
      )}

      {section === "recomendaciones" && (
        <ItemList
          items={vm.byKind.recommendation}
          busy={actionBusy}
          onItemAction={handleItemAction}
          onApprove={handleApprove}
          onReview={handleReview}
        />
      )}

      {section === "proponemos" && (
        <div className="space-y-6">
          <p className="text-sm text-[var(--isalwa-slate)]">{t("planificacion.capabilitiesIntro")}</p>
          <ItemList
            items={vm.byKind.capability}
            busy={actionBusy}
            onItemAction={handleItemAction}
            onApprove={handleApprove}
            onReview={handleReview}
          />
        </div>
      )}

      {section === "porque" && (
        <ItemList
          items={porqueItems}
          busy={actionBusy}
          onItemAction={handleItemAction}
          onApprove={handleApprove}
          onReview={handleReview}
        />
      )}

      {section === "necesitamos" && (
        <ItemList
          items={vm.byKind.information_gap}
          busy={actionBusy}
          onItemAction={handleItemAction}
          onApprove={handleApprove}
          onReview={handleReview}
        />
      )}

      {section === "preguntas" && (
        <div className="space-y-4">
          {vm.questions.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]/70">
              {t("planificacion.noQuestions")}
            </p>
          ) : (
            vm.questions.map((q) => (
              <PlanificacionQuestionCard
                key={q.id}
                question={q}
                busy={actionBusy}
                onRespond={(response) => handleQuestionRespond(q.id, response)}
                onApprove={() => handleQuestionApprove(q.id)}
              />
            ))
          )}
        </div>
      )}

      {section === "biblioteca" && (
        <div className="space-y-6">
          <Card className="p-4">
            <p className="isalwa-kicker">1. Documentos originales de ISALWA</p>
            {uploadedAssets.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--isalwa-slate)]/70">
                {t("planificacion.noUploads")}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {uploadedAssets.map((asset) => (
                  <li
                    key={asset.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)]/60 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{asset.title}</p>
                      <p className="text-xs text-[var(--isalwa-slate)]/70">
                        Fuente: subida · {formatRelativeActivity(asset.uploadedAt)}
                      </p>
                    </div>
                    <PlanificacionDocumentDownload asset={asset} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <p className="isalwa-kicker">2. Documentos generados por Architect</p>
            <ul className="mt-3 space-y-3">
              {livingOverview.map((item) => {
                const copy = livingDeliverableCopy(item.kind, workspace.companyName);
                const latest = item.latest;
                return (
                  <li
                    key={item.kind}
                    className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--isalwa-mist)]/60 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{copy.title}</p>
                      {latest ? (
                        <p className="text-xs text-[var(--isalwa-slate)]/70">
                          v{latest.version} · {formatRelativeActivity(latest.generatedAt)}
                        </p>
                      ) : (
                        <p className="text-xs text-[var(--isalwa-slate)]/70">Pendiente</p>
                      )}
                    </div>
                    {latest && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={exportBusy === `${item.kind}-pdf`}
                          onClick={() => exportLiving(item.kind, "pdf")}
                        >
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={exportBusy === `${item.kind}-docx`}
                          onClick={() => exportLiving(item.kind, "docx")}
                        >
                          Word
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-4">
            <p className="isalwa-kicker">3. Procesos y SOPs</p>
            {sopGenerated ? (
              <div className="mt-3 rounded-xl bg-[var(--isalwa-porcelain)]/80 p-3">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  Biblioteca generada — v{sopGenerated.version}
                </p>
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
                  {processes.length} proceso(s) · Procedimiento recomendado por ISALWA Architect
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[var(--isalwa-slate)]/70">
                {t("planificacion.noSopLibrary")}
              </p>
            )}
          </Card>
        </div>
      )}

      {section === "aprobaciones" && (
        <div className="space-y-6">
          {pendingApproval.length > 0 && (
            <div>
              <p className="isalwa-kicker mb-3">{t("planificacion.pendingApproval")}</p>
              <ItemList
                items={pendingApproval}
                busy={actionBusy}
                onItemAction={handleItemAction}
                onApprove={handleApprove}
                onReview={handleReview}
              />
            </div>
          )}
          <div>
            <p className="isalwa-kicker mb-3">{t("planificacion.approvedItems")}</p>
            <ItemList
              items={approvedItems}
              busy={actionBusy}
              onItemAction={handleItemAction}
              onApprove={handleApprove}
              onReview={handleReview}
            />
          </div>
        </div>
      )}

      {section === "cambios" && (
        <div className="space-y-3">
          {vm.changeLog.length === 0 ? (
            <p className="text-sm text-[var(--isalwa-slate)]/70">{t("planificacion.noChanges")}</p>
          ) : (
            vm.changeLog.map((entry) => (
              <Card key={entry.id} className="p-4">
                <p className="text-xs text-[var(--isalwa-slate)]/70">
                  {formatRelativeActivity(entry.at)} · {entry.approvedBy}
                </p>
                <p className="mt-1 font-medium text-[var(--isalwa-kiln)]">{entry.change}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{entry.reason}</p>
                <p className="mt-2 text-xs text-[var(--isalwa-slate)]/80">
                  Impacto: {entry.impact}
                </p>
              </Card>
            ))
          )}
        </div>
      )}

      {section === "costos" && (
        <div className="space-y-4">
          <p className="rounded-2xl border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-4 py-3 text-sm text-[var(--isalwa-slate)]">
            {PLANIFICACION_COST_DISCLAIMER}
          </p>
          {COST_ITEMS.map((item) => (
            <Card key={item.id} className="p-4">
              <p className="font-medium text-[var(--isalwa-kiln)]">{item.title}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.purpose}</p>
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                <strong>Estimado:</strong> {item.costBand}
              </p>
            </Card>
          ))}
        </div>
      )}

      {section === "seguridad" && (
        <div className="space-y-4">
          <ItemList
            items={technicalItems}
            busy={actionBusy}
            onItemAction={handleItemAction}
            onApprove={handleApprove}
            onReview={handleReview}
          />
          {SECURITY_ITEMS.map((item) => (
            <Card key={item.id} className="p-4">
              <p className="font-medium text-[var(--isalwa-kiln)]">{item.label}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{item.note}</p>
            </Card>
          ))}
          <Card className="flex items-start gap-3 border-[var(--isalwa-danger)]/30 bg-[var(--isalwa-tint-red)]/10 p-4">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--isalwa-danger)]" />
            <p className="text-sm text-[var(--isalwa-slate)]">{PLANIFICACION_DEMO_DATA_NOTICE}</p>
          </Card>
        </div>
      )}

      {section === "handoff" && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--isalwa-slate)]">{t("planificacion.handoffIntro")}</p>
          {commandCenterItems.length > 0 && (
            <div>
              <p className="isalwa-kicker mb-3">{t("planificacion.commandCenterReqs")}</p>
              <ItemList
                items={commandCenterItems}
                busy={actionBusy}
                onItemAction={handleItemAction}
                onApprove={handleApprove}
                onReview={handleReview}
              />
            </div>
          )}
          {vm.phases.length > 0 && (
            <Card className="p-4">
              <p className="isalwa-kicker">{t("planificacion.phases")}</p>
              <ul className="mt-2 space-y-2 text-sm text-[var(--isalwa-slate)]">
                {vm.phases.map((phase) => (
                  <li key={phase.stableKey}>
                    <strong>Fase {phase.phase} — {phase.name}</strong>: {phase.summary}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div>
            <p className="isalwa-kicker mb-3">{t("planificacion.approvedHandoff")}</p>
            {approvedItems.length === 0 ? (
              <p className="text-sm text-[var(--isalwa-slate)]/70">
                {t("planificacion.noApprovedHandoff")}
              </p>
            ) : (
              <ul className="space-y-2 text-sm text-[var(--isalwa-slate)]">
                {approvedItems.map((item) => (
                  <li key={item.stableKey} className="rounded-xl border border-[var(--isalwa-mist)] p-3">
                    <strong>{item.title}</strong>
                    {item.osModuleHint && (
                      <span className="text-xs text-[var(--isalwa-slate)]/60">
                        {" "}
                        · OS: {item.osModuleHint}
                      </span>
                    )}
                    <p className="mt-1">{item.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {workspace.implementationPackage && (
            <Card className="p-4">
              <p className="font-medium text-[var(--isalwa-kiln)]">
                {workspace.implementationPackage.gate.ready
                  ? t("planificacion.implPackageReady")
                  : t("planificacion.implPackagePending")}
              </p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                {workspace.implementationPackage.summary}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
