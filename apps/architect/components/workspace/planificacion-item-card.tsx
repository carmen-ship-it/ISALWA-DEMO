"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlanificacionEvidenceList } from "@/components/workspace/planificacion-evidence-list";
import { PlanificacionGovernanceBadge } from "@/components/workspace/planificacion-governance-badge";
import { useTranslations } from "@/lib/i18n";
import { PLANIFICACION_PROTOTYPE_DISCLAIMER } from "@/lib/planificacion/constants";
import type {
  PlanificacionClientAction,
  PlanificacionViewModelItem,
} from "@/types";
import { formatRelativeActivity } from "@/lib/workspace";

export function PlanificacionItemCard({
  item,
  onAction,
  onApprove,
  onReview,
  busy,
}: {
  item: PlanificacionViewModelItem;
  onAction: (action: PlanificacionClientAction, text: string) => void;
  onApprove: () => void;
  onReview: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState("");
  const [showDraft, setShowDraft] = useState(false);

  const showArchitectProposal =
    item.architectProposal.body !== item.body ||
    item.architectProposal.title !== item.title ||
    item.clientResponse?.action === "corregir";

  const canApprove =
    item.governanceStatus !== "aprobado" &&
    item.governanceStatus !== "rechazado";

  const submitDraft = (action: PlanificacionClientAction) => {
    const text =
      action === "confirmar"
        ? item.architectProposal.body
        : draft.trim() || item.architectProposal.body;
    onAction(action, text);
    setShowDraft(false);
    setDraft("");
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-[var(--isalwa-kiln)]">{item.title}</p>
        <PlanificacionGovernanceBadge status={item.governanceStatus} />
      </div>

      {item.demoPrototypeRef && (
        <p className="mt-2 text-xs text-[var(--isalwa-tint-amber-ink)]">
          Prototipo de referencia ({item.demoPrototypeRef}) — {PLANIFICACION_PROTOTYPE_DISCLAIMER}
        </p>
      )}

      <div className="mt-3 space-y-3">
        <div className="rounded-xl border border-[var(--isalwa-mist)] bg-white/60 px-3 py-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-glaze-deep)]">
            {t("planificacion.architectProposal")}
          </p>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            {item.architectProposal.body}
          </p>
          {item.architectProposal.recommendation &&
            item.architectProposal.recommendation !== item.architectProposal.body && (
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]/85">
                <strong>{t("planificacion.recommendation")}:</strong>{" "}
                {item.architectProposal.recommendation}
              </p>
            )}
          {item.architectProposal.rationale && (
            <p className="mt-2 text-xs text-[var(--isalwa-slate)]/75">
              {item.architectProposal.rationale}
            </p>
          )}
        </div>

        {showArchitectProposal && item.body !== item.architectProposal.body && (
          <div className="rounded-xl border border-[var(--isalwa-glaze)]/30 bg-[var(--isalwa-glaze)]/5 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-kiln)]">
              {t("planificacion.clientResponse")}
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{item.body}</p>
          </div>
        )}

        {item.clientResponse && (
          <div className="rounded-xl border border-[var(--isalwa-mist)] px-3 py-2 text-sm text-[var(--isalwa-slate)]">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
              {t("planificacion.clientAction")}: {item.clientResponse.action}
            </p>
            <p className="mt-1">{item.clientResponse.text}</p>
            <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
              {item.clientResponse.actor} · {formatRelativeActivity(item.clientResponse.at)}
            </p>
          </div>
        )}

        {item.approval && (
          <div className="rounded-xl border border-[var(--isalwa-tint-green)]/40 bg-[var(--isalwa-tint-green)]/15 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-kiln)]">
              {t("planificacion.approvedDecision")}
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">{item.body}</p>
            <p className="mt-1 text-xs text-[var(--isalwa-slate)]/70">
              {item.approval.actor} · {formatRelativeActivity(item.approval.at)} · v
              {item.approval.snapshotVersion}
            </p>
          </div>
        )}
      </div>

      <PlanificacionEvidenceList evidenceRefs={item.evidenceRefs} />

      {showDraft && (
        <textarea
          className="mt-3 w-full rounded-xl border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-slate)]"
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("planificacion.correctionPlaceholder")}
        />
      )}

      {canApprove && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("confirmar", item.architectProposal.body)}
          >
            {t("planificacion.confirm")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setShowDraft(true);
            }}
          >
            {t("planificacion.correct")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setShowDraft(true);
            }}
          >
            {t("planificacion.comment")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => onAction("rechazar", t("planificacion.rejectedLabel"))}
          >
            {t("planificacion.reject")}
          </Button>
          {showDraft && (
            <>
              <Button
                size="sm"
                disabled={busy || !draft.trim()}
                onClick={() => submitDraft("corregir")}
              >
                {t("planificacion.saveCorrection")}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !draft.trim()}
                onClick={() => submitDraft("comentar")}
              >
                {t("planificacion.saveComment")}
              </Button>
            </>
          )}
          <Button size="sm" variant="secondary" disabled={busy} onClick={onReview}>
            {t("planificacion.review")}
          </Button>
          <Button size="sm" disabled={busy} onClick={onApprove}>
            {t("planificacion.approve")}
          </Button>
        </div>
      )}
    </Card>
  );
}
