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
import { t, useTranslations } from "@/lib/i18n";
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
          t("preparationBriefPanel.roleNotRegistered")}
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
          <span>
            {t("preparationBriefPanel.attendees", {
              names: meeting.participants.join(", "),
            })}
          </span>
        ) : null}
        {meeting.discoveries.length > 0 ? (
          <span>
            {t("preparationBriefPanel.discoveriesCount", {
              count: meeting.discoveries.length,
            })}
          </span>
        ) : null}
        {meeting.questionsRemaining.length > 0 ? (
          <span>
            {t("preparationBriefPanel.questionsRemainingCount", {
              count: meeting.questionsRemaining.length,
            })}
          </span>
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
  const { t } = useTranslations();
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
        kicker={t("preparationBriefPanel.kicker")}
        title={t("preparationBriefPanel.titleBefore", { company: workspace.companyName })}
        description={prep.interviewOpening}
      >
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--isalwa-slate)]">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            {t("preparationBriefPanel.priorUnderstanding", {
              percent: prep.confidence.approximatePercent,
              level: understandingLevel(prep.confidence.approximatePercent).toLowerCase(),
            })}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            {t("preparationBriefPanel.infoCoverage", {
              percent: prep.coverage.averagePercent,
              band: coverageBandLabelEs(
                coverageBand(prep.coverage.averagePercent, "percent"),
              ).toLowerCase(),
            })}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {t("preparationBriefPanel.estimatedDuration", {
              minutes: briefing.estimatedMinutesRemaining,
            })}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-sm text-[var(--isalwa-slate)]/80">
          {formatIndustryLabel(workspace.industry)} ·{" "}
          {formatStageLabel(workspace.currentStage)}
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href={interviewHref}>
              {t("preparationBriefPanel.startInterview")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </SectionShell>

      <SectionShell
        tone="health"
        icon={Sparkles}
        kicker={t("preparationBriefPanel.companySummaryKicker")}
        title={t("preparationBriefPanel.whatWeKnow")}
        description={t("preparationBriefPanel.whatWeKnowDescription")}
      >
        {prep.alreadyKnown.length === 0 ? (
          <EmptyLine text={t("preparationBriefPanel.noFactsRegistered")} />
        ) : (
          <BulletList items={prep.alreadyKnown} />
        )}
        {prep.potentialQuickWins.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
              {t("preparationBriefPanel.potentialQuickWins")}
            </p>
            <ChipRow items={prep.potentialQuickWins} />
          </div>
        ) : null}
        {prep.potentialMissingSystems.length > 0 ? (
          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
              {t("preparationBriefPanel.potentialMissingSystems")}
            </p>
            <ChipRow items={prep.potentialMissingSystems} />
          </div>
        ) : null}
      </SectionShell>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionShell
          tone="neutral"
          icon={Users}
          kicker={t("preparationBriefPanel.attendeesKicker")}
          title={t("preparationBriefPanel.peopleInvolved")}
          className="sm:px-6 sm:py-6"
        >
          {people.length === 0 ? (
            <EmptyLine text={t("preparationBriefPanel.noPeopleRegistered")} />
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
          kicker={t("preparationBriefPanel.historyKicker")}
          title={t("preparationBriefPanel.previousMeetings")}
          className="sm:px-6 sm:py-6"
        >
          {meetings.length === 0 ? (
            <EmptyLine text={t("preparationBriefPanel.firstMeeting")} />
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
          kicker={t("preparationBriefPanel.toValidateKicker")}
          title={t("preparationBriefPanel.openQuestions")}
          description={t("preparationBriefPanel.openQuestionsDescription")}
          className="sm:px-6 sm:py-6"
        >
          {prep.questionsToValidate.length === 0 ? (
            <EmptyLine text={t("preparationBriefPanel.noQuestionsPending")} />
          ) : (
            <BulletList items={prep.questionsToValidate} tone="problem" />
          )}
        </SectionShell>

        <SectionShell
          tone="risks"
          icon={ShieldAlert}
          kicker={t("preparationBriefPanel.risksKicker")}
          title={t("preparationBriefPanel.knownRisks")}
          description={t("preparationBriefPanel.knownRisksDescription")}
          className="sm:px-6 sm:py-6"
        >
          {prep.likelyRisks.length === 0 ? (
            <EmptyLine text={t("preparationBriefPanel.noRisksDetected")} />
          ) : (
            <BulletList items={prep.likelyRisks} tone="risk" />
          )}
        </SectionShell>
      </div>

      <SectionShell
        tone="risks"
        icon={GitCompareArrows}
        kicker={t("preparationBriefPanel.contradictionsKicker")}
        title={t("preparationBriefPanel.pointsNeedingClarification")}
        description={t("preparationBriefPanel.pointsNeedingClarificationDescription")}
      >
        {contradictions.length === 0 ? (
          <EmptyLine text={t("preparationBriefPanel.noContradictions")} />
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
        kicker={t("preparationBriefPanel.suggestedAgendaKicker")}
        title={t("preparationBriefPanel.recommendedMeetingOrder")}
        description={t("preparationBriefPanel.recommendedMeetingOrderDescription")}
      >
        {prep.departmentsRequiringAttention.length === 0 ? (
          <EmptyLine text={t("preparationBriefPanel.sufficientCoverage")} />
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
        kicker={t("preparationBriefPanel.priorityKicker")}
        title={t("preparationBriefPanel.priorityUnknowns")}
        description={t("preparationBriefPanel.priorityUnknownsDescription")}
      >
        {prep.unknownAreas.length === 0 ? (
          <EmptyLine text={t("preparationBriefPanel.noPriorityUnknowns")} />
        ) : (
          <BulletList items={prep.unknownAreas} tone="problem" />
        )}
      </SectionShell>

      <SectionShell tone="health" title={t("preparationBriefPanel.readyToMeet")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg">
            <Link href={interviewHref}>
              {t("preparationBriefPanel.startInterview")}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href={`/workspace/${workspace.id}`}>
              {t("preparationBriefPanel.backToWorkspace")}
            </Link>
          </Button>
        </div>
      </SectionShell>
    </div>
  );
}
