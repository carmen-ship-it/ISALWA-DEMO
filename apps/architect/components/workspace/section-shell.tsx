import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionTone =
  | "executive"
  | "health"
  | "risks"
  | "problems"
  | "blueprint"
  | "processes"
  | "deliverables"
  | "neutral";

const TONE_CLASS: Record<SectionTone, string> = {
  executive: "bg-sky-50/70 border-sky-100/90",
  health: "bg-emerald-50/60 border-emerald-100/80",
  risks: "bg-rose-50/55 border-rose-100/80",
  problems: "bg-amber-50/60 border-amber-100/80",
  blueprint: "bg-violet-50/55 border-violet-100/80",
  processes: "bg-orange-50/50 border-orange-100/80",
  deliverables: "bg-slate-50/90 border-slate-200/80",
  neutral: "bg-white/70 border-neutral-200/80",
};

export function SectionShell({
  tone = "neutral",
  kicker,
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  tone?: SectionTone;
  kicker?: string;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border px-5 py-6 sm:px-7 sm:py-8",
        TONE_CLASS[tone],
        className,
      )}
    >
      {kicker || title || description ? (
        <header className="mb-6">
          <div className="flex items-start gap-3">
            {Icon ? (
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-neutral-700 shadow-sm ring-1 ring-black/5">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              {kicker ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
                  {kicker}
                </p>
              ) : null}
              {title ? (
                <h2 className="architect-serif mt-2 text-3xl leading-tight text-neutral-950">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-neutral-600">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      {children}
    </section>
  );
}
