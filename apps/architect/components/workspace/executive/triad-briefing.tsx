"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, Compass, TriangleAlert } from "lucide-react";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
  type SectionTone,
} from "@/components/workspace/section-shell";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The persistent triad briefing (Mission 20 — Guided client journey).
 *
 * `docs/PRODUCT_CONSTITUTION.md` names three permanent client questions
 * every screen must answer: what do we know, what are we trying to learn,
 * why does it matter. This is the one place that states all three at once,
 * every time a client opens the workspace — composed entirely from reports
 * other engines already produced this render:
 *
 *   - "Qué sabemos"       ← Capability Digital Twin headline
 *   - "Qué queremos saber" ← Missing Information Engine's detective headline
 *   - "Por qué importa"   ← the same topic's business-stakes sentence
 *     (`TOPIC_STAKES`, `lib/readiness/topics.ts`) already used as that
 *     opportunity's `rationale`
 *
 * No new scoring, no recomputation — every prop is a string another engine
 * already produced this render.
 */
function TriadCard({
  icon: Icon,
  tone,
  kicker,
  body,
}: {
  icon: LucideIcon;
  tone: SectionTone;
  kicker: string;
  body: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-5",
        SECTION_TONE_SURFACE[tone],
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("isalwa-icon-chip", SECTION_TONE_INK[tone])}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <p className={cn("isalwa-kicker", SECTION_TONE_INK[tone])}>{kicker}</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{body}</p>
    </div>
  );
}

export function TriadBriefing({
  whatWeKnow,
  tryingToLearn,
  whyItMatters,
  className,
}: {
  /** Composed from the Capability Digital Twin's own headline — never recomputed here. */
  whatWeKnow: string;
  /** Composed from the Missing Information Engine's own detective headline. */
  tryingToLearn: string;
  /** Composed from a topic's business-stakes sentence or the ceremony's continuity note. */
  whyItMatters: string;
  className?: string;
}) {
  const { t } = useTranslations();
  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
      <TriadCard
        icon={BookOpenCheck}
        tone="health"
        kicker={t("triadBriefing.whatWeKnowKicker")}
        body={whatWeKnow}
      />
      <TriadCard
        icon={Compass}
        tone="executive"
        kicker={t("triadBriefing.tryingToLearnKicker")}
        body={tryingToLearn}
      />
      <TriadCard
        icon={TriangleAlert}
        tone="problems"
        kicker={t("storyBeats.whyItMatters")}
        body={whyItMatters}
      />
    </div>
  );
}
