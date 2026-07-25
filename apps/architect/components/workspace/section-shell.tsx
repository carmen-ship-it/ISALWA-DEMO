import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionTone =
  | "executive"
  | "health"
  | "risks"
  | "blueprint"
  | "processes"
  | "deliverables"
  | "neutral";

const TONE_CLASS: Record<SectionTone, string> = {
  executive: "bg-sky-50/50 border-sky-100/80",
  health: "bg-emerald-50/45 border-emerald-100/70",
  risks: "bg-rose-50/45 border-rose-100/70",
  blueprint: "bg-violet-50/40 border-violet-100/70",
  processes: "bg-orange-50/40 border-orange-100/70",
  deliverables: "bg-neutral-50/80 border-neutral-200/70",
  neutral: "bg-white/60 border-neutral-200/70",
};

export function SectionShell({
  tone = "neutral",
  kicker,
  title,
  description,
  children,
  className,
}: {
  tone?: SectionTone;
  kicker?: string;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border px-5 py-6 sm:px-7 sm:py-7",
        TONE_CLASS[tone],
        className,
      )}
    >
      {kicker || title || description ? (
        <header className="mb-6">
          {kicker ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
              {kicker}
            </p>
          ) : null}
          {title ? (
            <h2 className="architect-serif mt-3 text-3xl leading-tight text-neutral-950">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}
