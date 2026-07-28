"use client";

import { Moon } from "lucide-react";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
} from "@/components/workspace/section-shell";
import { useTranslations } from "@/lib/i18n";
import { isOvernightDigestFresh, type OvernightDigest } from "@/lib/consulting-intelligence";
import { cn } from "@/lib/utils";

/**
 * Mission 24 — Autonomous Consulting Cycle. The one client-facing surface
 * for "what changed overnight" — a scheduled cron re-run of the Consulting
 * Intelligence Agent, not a manual action. Reuses the exact tone vocabulary
 * `DocumentChangeSummaryCard` (Mission 21) established for "here is what the
 * platform just learned" cards, so this reads as the same consulting
 * register instead of a new visual language.
 *
 * Renders nothing when there is no digest yet, or once the digest has aged
 * past `OVERNIGHT_DIGEST_FRESHNESS_MS` — a "we checked last Tuesday" banner
 * sitting on the hero forever would be dashboard clutter, not a briefing.
 * The real record of a genuine change survives independently as a
 * `overnight_review` timeline entry (see `overnight-review.ts`); this card
 * is only the fresh, first-thing-in-the-morning version of that same fact.
 */
export function OvernightDigestCard({
  digest,
}: {
  digest: OvernightDigest | null | undefined;
}) {
  const { t } = useTranslations();
  if (!isOvernightDigestFresh(digest)) return null;

  const tone = digest.changed ? "health" : "neutral";

  return (
    <div
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-5",
        SECTION_TONE_SURFACE[tone],
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn("isalwa-icon-chip", SECTION_TONE_INK[tone])}>
          <Moon className="h-4 w-4" aria-hidden />
        </span>
        <p className={cn("isalwa-kicker", SECTION_TONE_INK[tone])}>
          {t("overnightDigestCard.kicker")}
        </p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
        {digest.headline}
      </p>
      {digest.detail.map((line) => (
        <p
          key={line}
          className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]"
        >
          {line}
        </p>
      ))}
    </div>
  );
}
