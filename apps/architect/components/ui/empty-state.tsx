"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
  type SectionTone,
} from "@/components/workspace/section-shell";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Premium empty state (Mission 19 — Premium UX & visual design).
 *
 * The shared "nothing here yet" surface for every workspace panel — extends
 * `SectionShell`'s section-identity tone vocabulary instead of a bespoke
 * gray dashed box, and is shaped to always answer the triad in miniature:
 *
 * - `title` — what we know right now (usually: not enough yet, honestly).
 * - `whyItMatters` — the one-line business consequence of the gap. Never
 *   decoration; always the reason a client should care this is still empty.
 * - `actionLabel` (+ `actionHref` or `onAction`) — the concrete next step
 *   that would close the gap, when one exists.
 *
 * Composes only existing primitives (`Button`, `.isalwa-icon-chip`,
 * `SectionShell`'s tone maps) — no new colors, no new component system.
 * Never invents evidence: every caller passes real copy about a real gap,
 * same as the `EmptyHint`-style text it replaces.
 */
export function EmptyState({
  icon: Icon,
  tone = "neutral",
  title,
  whyItMatters,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  icon?: LucideIcon;
  tone?: SectionTone;
  title: string;
  whyItMatters?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  const { t } = useTranslations();
  const ink = SECTION_TONE_INK[tone];
  const surface = SECTION_TONE_SURFACE[tone];

  return (
    <div
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-6 sm:px-6 sm:py-7",
        surface,
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        {Icon ? (
          <span className={cn("isalwa-icon-chip", ink)}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">{title}</p>
          {whyItMatters ? (
            <p className="mt-2.5 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
              <span className={cn("font-medium", ink)}>
                {t("storyBeats.whyItMatters")}:{" "}
              </span>
              {whyItMatters}
            </p>
          ) : null}
          {actionLabel && (actionHref || onAction) ? (
            <div className="mt-4">
              {actionHref ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={actionHref}>{actionLabel}</Link>
                </Button>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={onAction}>
                  {actionLabel}
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
