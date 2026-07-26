"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";

/**
 * Guided Executive Navigation (Mission 12) — the one clear "what do I click
 * next" answer for a page. Exactly one primary action; an optional secondary
 * renders quieter (ghost, not a solid button); an optional tertiary renders
 * as a plain text link for supplementary, non-competing guidance (e.g. the
 * consultant-only "prepare for the meeting" nudge). Never adds a fourth
 * choice — if a page needs more than primary + secondary + tertiary, that is
 * a sign the page has too many next actions, not that this component should
 * grow more slots.
 */
export function NextStepCta({
  title = "¿Qué debe hacer ahora?",
  description,
  primaryHref,
  primaryLabel,
  onPrimaryClick,
  secondaryHref,
  secondaryLabel,
  onSecondaryClick,
  tertiaryHref,
  tertiaryLabel,
  onTertiaryClick,
}: {
  title?: string;
  description: string;
  primaryHref?: string;
  primaryLabel: string;
  /** Use for in-page actions (e.g. switching workspace tabs) instead of navigation. */
  onPrimaryClick?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
  onSecondaryClick?: () => void;
  /** Quiet supplementary link — rendered smallest, below the buttons. */
  tertiaryHref?: string;
  tertiaryLabel?: string;
  onTertiaryClick?: () => void;
}) {
  const hasSecondary = Boolean(secondaryLabel && (secondaryHref || onSecondaryClick));
  const hasTertiary = Boolean(tertiaryLabel && (tertiaryHref || onTertiaryClick));

  return (
    <SectionShell tone="health" title={title} description={description}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onPrimaryClick ? (
          <Button type="button" size="lg" onClick={onPrimaryClick}>
            {primaryLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={primaryHref ?? "#"}>
              {primaryLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
        {hasSecondary ? (
          onSecondaryClick ? (
            <Button type="button" variant="ghost" onClick={onSecondaryClick}>
              {secondaryLabel}
            </Button>
          ) : (
            <Button asChild variant="ghost">
              <Link href={secondaryHref ?? "#"}>{secondaryLabel}</Link>
            </Button>
          )
        ) : null}
      </div>
      {hasTertiary ? (
        <div className="mt-4">
          {onTertiaryClick ? (
            <button
              type="button"
              onClick={onTertiaryClick}
              className="text-sm text-[var(--isalwa-slate)]/70 underline decoration-[var(--isalwa-mist)] underline-offset-4 transition-colors hover:text-[var(--isalwa-kiln)]"
            >
              {tertiaryLabel}
            </button>
          ) : (
            <Link
              href={tertiaryHref ?? "#"}
              className="text-sm text-[var(--isalwa-slate)]/70 underline decoration-[var(--isalwa-mist)] underline-offset-4 transition-colors hover:text-[var(--isalwa-kiln)]"
            >
              {tertiaryLabel}
            </Link>
          )}
        </div>
      ) : null}
    </SectionShell>
  );
}
