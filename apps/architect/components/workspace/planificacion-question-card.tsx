"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QUESTION_STATUS_LABELS } from "@/lib/planificacion/content";
import { useTranslations } from "@/lib/i18n";
import type { PlanificacionClientQuestion } from "@/types";
import { formatRelativeActivity } from "@/lib/workspace";

export function PlanificacionQuestionCard({
  question,
  onRespond,
  onApprove,
  busy,
}: {
  question: PlanificacionClientQuestion;
  onRespond: (response: string) => void;
  onApprove: () => void;
  busy?: boolean;
}) {
  const { t } = useTranslations();
  const [draft, setDraft] = useState(question.response ?? "");

  return (
    <Card className="p-4">
      <p className="font-medium text-[var(--isalwa-kiln)]">{question.question}</p>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
        <strong>{t("planificacion.ourUnderstanding")}:</strong> {question.ourUnderstanding}
      </p>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
        <strong>{t("planificacion.whyItMatters")}:</strong> {question.whyItMatters}
      </p>
      {question.recommendation && (
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
          <strong>{t("planificacion.recommendation")}:</strong> {question.recommendation}
        </p>
      )}
      {question.options && question.options.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-[var(--isalwa-slate)]">
          {question.options.map((opt) => (
            <li key={opt}>
              <button
                type="button"
                className="text-left underline decoration-[var(--isalwa-mist)] hover:text-[var(--isalwa-kiln)]"
                disabled={busy}
                onClick={() => {
                  setDraft(opt);
                  onRespond(opt);
                }}
              >
                {opt}
              </button>
            </li>
          ))}
        </ul>
      )}
      <textarea
        className="mt-3 w-full rounded-xl border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm"
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("planificacion.answerPlaceholder")}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--isalwa-slate)]">
          {QUESTION_STATUS_LABELS[question.status]}
        </span>
        {question.status === "pendiente" && (
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !draft.trim()}
            onClick={() => onRespond(draft.trim())}
          >
            {t("planificacion.submitAnswer")}
          </Button>
        )}
        {question.status === "respondido" && (
          <Button size="sm" disabled={busy} onClick={onApprove}>
            {t("planificacion.approve")}
          </Button>
        )}
        {question.respondedAt && question.actor && (
          <span className="text-xs text-[var(--isalwa-slate)]/60">
            {question.actor} · {formatRelativeActivity(question.respondedAt)}
          </span>
        )}
      </div>
    </Card>
  );
}
