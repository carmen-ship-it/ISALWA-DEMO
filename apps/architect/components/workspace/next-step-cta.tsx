"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";

export function NextStepCta({
  title = "¿Qué debe hacer ahora?",
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  title?: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <SectionShell tone="health" title={title} description={description}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href={primaryHref}>
            {primaryLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        {secondaryHref && secondaryLabel ? (
          <Button asChild variant="secondary" size="lg">
            <Link href={secondaryHref}>{secondaryLabel}</Link>
          </Button>
        ) : null}
      </div>
    </SectionShell>
  );
}
