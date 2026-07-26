"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROLE_CHOICES } from "@/data/catalog";
import type { AnsweredTopic } from "@/lib/discovery/answer-topics";
import { GUIDED_STAGES, stagesBeforeReview } from "@/lib/discovery/stages";
import { cn } from "@/lib/utils";
import type { Interview, ParticipantRole } from "@/types";

function IdentityField({
  label,
  value,
  placeholder,
  onSave,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            {label}
          </p>
          <p className="mt-1 text-sm text-neutral-900">{value || placeholder}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(value ?? "");
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex items-center gap-2 rounded-2xl bg-white/80 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.trim()) onSave(draft.trim());
        setEditing(false);
      }}
    >
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        className="flex-1 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-400"
      />
      <Button type="submit" size="sm">
        Guardar
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </form>
  );
}

function TopicRow({
  topic,
  isEditing,
  draft,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
}: {
  topic: AnsweredTopic;
  isEditing: boolean;
  draft: string;
  onStartEdit: (topic: AnsweredTopic) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: (topic: AnsweredTopic) => void;
  onCancelEdit: () => void;
}) {
  return (
    <li className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-neutral-100">
      {topic.prompt ? (
        <p className="text-sm font-medium text-neutral-800">{topic.prompt}</p>
      ) : null}

      {isEditing ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSaveEdit(topic);
          }}
        >
          <textarea
            autoFocus
            value={draft}
            onChange={(event) => onChangeDraft(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm leading-relaxed text-neutral-900 outline-none focus:border-neutral-400"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!draft.trim()}>
              Guardar respuesta
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <p className="text-sm leading-relaxed text-neutral-600">{topic.statement}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onStartEdit(topic)}
            className="shrink-0"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Editar
          </Button>
        </div>
      )}
    </li>
  );
}

export function ReviewPanel({
  interview,
  topicsByStage,
  editingKey,
  editingDraft,
  onStartEdit,
  onChangeDraft,
  onSaveEdit,
  onCancelEdit,
  onUpdateIdentity,
  onBackToQuestion,
}: {
  interview: Interview;
  topicsByStage: Record<string, AnsweredTopic[]>;
  editingKey: string | null;
  editingDraft: string;
  onStartEdit: (topic: AnsweredTopic) => void;
  onChangeDraft: (value: string) => void;
  onSaveEdit: (topic: AnsweredTopic) => void;
  onCancelEdit: () => void;
  onUpdateIdentity: (field: "name" | "companyName" | "role", value: string) => void;
  onBackToQuestion: () => void;
}) {
  const stageIds = stagesBeforeReview();
  const totalTopics = stageIds.reduce(
    (sum, id) => sum + (topicsByStage[id]?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <Card className="px-6 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Datos básicos
        </p>
        <div className="mt-3 space-y-2">
          <IdentityField
            label="Nombre"
            value={interview.participant.name}
            placeholder="Sin registrar"
            onSave={(value) => onUpdateIdentity("name", value)}
          />
          <IdentityField
            label="Empresa"
            value={interview.business.companyName ?? interview.participant.companyName}
            placeholder="Sin registrar"
            onSave={(value) => onUpdateIdentity("companyName", value)}
          />
          <div className="rounded-2xl bg-white/80 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
              Rol
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLE_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onUpdateIdentity("role", choice.value)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs transition-colors",
                    interview.participant.role === (choice.value as ParticipantRole)
                      ? "bg-neutral-950 text-white"
                      : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50",
                  )}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {totalTopics === 0 ? (
        <Card className="px-6 py-6 text-sm text-neutral-500">
          Aún no hay respuestas registradas para revisar.
        </Card>
      ) : (
        stageIds.map((stageId) => {
          const topics = topicsByStage[stageId] ?? [];
          if (topics.length === 0) return null;
          const stage = GUIDED_STAGES[stageId];
          return (
            <Card key={stageId} className="px-6 py-6">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                {stage.title}
              </p>
              <ul className="mt-3 space-y-2.5">
                {topics.map((topic) => (
                  <TopicRow
                    key={topic.key}
                    topic={topic}
                    isEditing={editingKey === topic.key}
                    draft={editingDraft}
                    onStartEdit={onStartEdit}
                    onChangeDraft={onChangeDraft}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </ul>
            </Card>
          );
        })
      )}

      <Button type="button" size="lg" onClick={onBackToQuestion}>
        Volver a la conversación
      </Button>
    </div>
  );
}
