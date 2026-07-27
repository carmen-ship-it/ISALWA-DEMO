"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Premium back control — presentation only. Prefer explicit href over history.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslations();
  const resolvedLabel = label ?? t("nav.back");
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-1 py-1 text-sm text-[var(--isalwa-slate)]/80 transition-colors hover:text-[var(--isalwa-kiln)]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      <span>{resolvedLabel}</span>
    </Link>
  );
}
