"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/**
 * Minimal navigation — role-aware. Clients do not see company selector links.
 */
export function ArchitectNav({
  workspaceHref,
  interviewHref,
  preparationHref,
}: {
  workspaceHref?: string | null;
  interviewHref?: string | null;
  /** Consultant-only Preparation Brief link — hidden entirely for clients. */
  preparationHref?: string | null;
}) {
  const pathname = usePathname();
  const { session } = useAuth();
  const isConsultant = session?.role === "consultant";

  const base = isConsultant
    ? [
        { href: "/", label: "Empresas" },
        { href: "/companies", label: "Panel" },
      ]
    : [];

  const items = [
    ...base,
    ...(workspaceHref
      ? [{ href: workspaceHref, label: "Espacio de trabajo" as const }]
      : []),
    ...(isConsultant && preparationHref
      ? [{ href: preparationHref, label: "Brief de preparación" as const }]
      : []),
    ...(interviewHref
      ? [{ href: interviewHref, label: "Entrevista" as const }]
      : []),
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-[var(--isalwa-slate)]/80">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={`${item.label}-${item.href}`}
            href={item.href}
            className={cn(
              "isalwa-t-fast rounded-full px-3 py-1.5",
              active
                ? "bg-white text-[var(--isalwa-kiln)] shadow-[var(--isalwa-shadow-resting)]"
                : "hover:bg-white/70 hover:text-[var(--isalwa-slate)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
      {session ? (
        <form action={signOutAction}>
          <button
            type="submit"
            className="isalwa-t-fast rounded-full px-3 py-1.5 hover:bg-white/70 hover:text-[var(--isalwa-slate)]"
          >
            Salir
          </button>
        </form>
      ) : null}
    </nav>
  );
}
