"use client";

/**
 * Preparation Brief panel — Mission "Consultant Preparation Brief".
 * Presentation only: renders the existing lib/preparation output plus
 * workspace people/meetings/contradictions. No new intelligence here —
 * every value below is read directly from `prepareCompany()` or the
 * `CompanyWorkspace` the consultant already has.
 */

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  GitCompareArrows,
  HelpCircle,
  ListOrdered,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";
import {
  coverageBand,
  coverageBandLabelEs,
  understandingLevel,
} from "@/lib/presentation";
import { prepareCompany } from "@/lib/preparation";
import { buildResumeBriefing } from "@/lib/resume";
import { formatIndustryLabel, formatStageLabel } from "@/lib/workspace";
import type { CompanyWorkspace, Contradiction, Meeting, Person } from "@/types";

function formatMeetingDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--isalwa-mist)] bg-white/60 px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)]/80">
      {text}
    </p>
  );
}

function BulletList({
  items,
  tone = "neutral",
}: {
  items: string[];
  tone?: "neutral" | "risk" | "problem";
}) {
  const ring =
    tone === "risk"
      ? "ring-[var(--isalwa-tint-red-border)]/80"
      : tone === "problem"
        ? "ring-[var(--isalwa-tint-amber-border)]/80"
        : "ring-slate-200/70";
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className={`rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)] ring-1 ${ring}`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function ChipRow({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-[var(--isalwa-mist)] px-3 py-1 text-xs text-[var(--isalwa-slate)]"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PersonCard({ person }: { person: Person }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70">
      <p className="font-medium text-[var(--isalwa-kiln)]">{person.name}</p>
      <p className="mt-0.5 text-sm text-[var(--isalwa-slate)]/80">
        {[person.role, person.department].filter(Boolean).join(" · ") ||
          "Rol no registrado"}
      </p>
    </div>
  );
}

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-slate-200/70">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium text-[var(--isalwa-kiln)]">{meeting.title}</p>
        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
          {formatMeetingDate(meeting.date)}
        </p>
      </div>
      {meeting.summary ? (
        <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]">{meeting.summary}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[var(--isalwa-slate)]/80">
        {meeting.participants.length > 0 ? (
          <span>Asistentes: {meeting.participants.join(", ")}</span>
        ) : null}
        {meeting.discoveries.length > 0 ? (
          <span>{meeting.discoveries.length} hallazgos</span>
        ) : null}
        {meeting.questionsRemaining.length > 0 ? (
          <span>{meeting.questionsRemaining.length} preguntas pendientes</span>
        ) : null}
      </div>
    </div>
  );
}

function ContradictionCard({ item }: { item: Contradiction }) {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-[var(--isalwa-tint-red-border)]/80">
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {item.statement}
      </p>
      {item.evidence.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-[var(--isalwa-slate)]/80">
          {item.evidence.map((e) => (
            <li key={e}>· {e}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function PreparationBriefPanel({
  workspace,
  interviewHref,
}: {
  workspace: CompanyWorkspace;
  interviewHref: string;
}) {
  const prep = prepareCompany(workspace);
  const briefing = buildResumeBriefing(workspace);
  const contradictions = workspace.conversationMemory?.contradictions ?? [];
  const people = workspace.people;
  const meetings = [...workspace.meetings].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-8">
      <SectionShell
        tone="executive"
        icon={Building2}
        kicker="Brief de preparación · Solo consultores"
        title={`Antes de reunirse con ${workspace.companyName}`}
        description={prep.interviewOpening}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--isalwa-slate)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            Comprensión previa: {prep.confidence.approximatePercent}% ·{" "}
            {understandingLevel(prep.confidence.approximatePercent).toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            Cobertura de información: {prep.coverage.averagePercent}% ·{" "}
            {coverageBandLabelEs(
              coverageBand(prep.coverage.averagePercent, "percent"),
            ).toLowerCase()}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Duración estimada: {briefing.estimatedMinutesRemaining} minutos
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-[var(--isalwa-slate)]/80">
          {formatIndustryLabel(workspace.industry)} ·{" "}
          {formatStageLabel(workspace.currentStage)}
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href={interviewHref}>
              Iniciar entrevista
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </SectionShell>

      <SectionShell
        tone="health"
        icon={Sparkles}
        kicker="Resumen de la empresa"
        title="Lo que ya sabemos"
        description="Hechos ya registrados en la memoria de la empresa, el Centro de Conocimiento y reuniones previas."
      >
        {prep.alreadyKnown.length === 0 ? (
          <EmptyLine text="Todavía no hay hechos registrados para esta empresa." />
        ) : (
          <BulletList items={prep.alreadyKnown} />
        )}
        {prep.potentialQuickWins.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
              Quick wins potenciales
            </p>
            <ChipRow items={prep.potentialQuickWins} />
          </div>
        ) : null}
        {prep.potentialMissingSystems.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
              Posibles brechas de sistemas
            </p>
            <ChipRow items={prep.potentialMissingSystems} />
          </div>
        ) : null}
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell
          tone="neutral"
          icon={Users}
          kicker="Asistentes"
          title="Personas que participan"
          className="sm:px-6 sm:py-6"
        >
          {people.length === 0 ? (
            <EmptyLine text="Aún no hemos registrado personas para esta empresa." />
          ) : (
            <div className="space-y-2">
              {people.map((person) => (
                <PersonCard key={person.id} person={person} />
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell
          tone="deliverables"
          icon={Clock3}
          kicker="Historial"
          title="Reuniones anteriores"
          className="sm:px-6 sm:py-6"
        >
          {meetings.length === 0 ? (
            <EmptyLine text="Esta será la primera reunión registrada con esta empresa." />
          ) : (
            <div className="space-y-2">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </SectionShell>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell
          tone="problems"
          icon={HelpCircle}
          kicker="Por validar"
          title="Preguntas abiertas"
          description="Temas que la entrevista debe aclarar."
          className="sm:px-6 sm:py-6"
        >
          {prep.questionsToValidate.length === 0 ? (
            <EmptyLine text="No hay preguntas pendientes de validar por ahora." />
          ) : (
            <BulletList items={prep.questionsToValidate} tone="problem" />
          )}
        </SectionShell>

        <SectionShell
          tone="risks"
          icon={ShieldAlert}
          kicker="Riesgos"
          title="Riesgos conocidos"
          description="Riesgos detectados por la inteligencia de consultoría y los dolores reportados."
          className="sm:px-6 sm:py-6"
        >
          {prep.likelyRisks.length === 0 ? (
            <EmptyLine text="Aún no se han detectado riesgos." />
          ) : (
            <BulletList items={prep.likelyRisks} tone="risk" />
          )}
        </SectionShell>
      </div>

      <SectionShell
        tone="risks"
        icon={GitCompareArrows}
        kicker="Contradicciones"
        title="Puntos que requieren aclaración"
        description="Información que no coincide entre sí — lenguaje siempre neutral, nunca acusatorio."
      >
        {contradictions.length === 0 ? (
          <EmptyLine text="No se detectaron contradicciones en la información disponible." />
        ) : (
          <div className="space-y-2">
            {contradictions.map((item) => (
              <ContradictionCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell
        tone="blueprint"
        icon={ListOrdered}
        kicker="Agenda sugerida"
        title="Orden recomendado para la reunión"
        description="Áreas con menor cobertura de información — conviene cubrirlas primero."
      >
        {prep.departmentsRequiringAttention.length === 0 ? (
          <EmptyLine text="La cobertura actual es suficiente — puede seguir el interés del cliente." />
        ) : (
          <ol className="space-y-2">
            {prep.departmentsRequiringAttention.map((item, index) => (
              <li
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-white/80 px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-tint-violet-border)]/80"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--isalwa-tint-violet-border)] text-[11px] font-medium text-[var(--isalwa-tint-violet-ink)]">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        )}
      </SectionShell>

      <SectionShell
        tone="problems"
        icon={AlertTriangle}
        kicker="Prioridad"
        title="Incógnitas prioritarias"
        description="Áreas desconocidas que más afectan la comprensión del negocio."
      >
        {prep.unknownAreas.length === 0 ? (
          <EmptyLine text="No hay incógnitas prioritarias registradas." />
        ) : (
          <BulletList items={prep.unknownAreas} tone="problem" />
        )}
      </SectionShell>

      <SectionShell tone="health" title="¿Listo para reunirse?">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href={interviewHref}>
              Iniciar entrevista
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/workspace/${workspace.id}`}>
              Volver al espacio de trabajo
            </Link>
          </Button>
        </div>
      </SectionShell>
    </div>
  );
}
