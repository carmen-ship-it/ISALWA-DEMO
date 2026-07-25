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
}: {
  workspaceHref?: string | null;
  interviewHref?: string | null;
}) {
  const pathname = usePathname();
  const { session } = useAuth();

  const base =
    session?.role === "consultant"
      ? [
          { href: "/", label: "Empresas" },
          { href: "/companies", label: "Panel" },
        ]
      : [];

  const items = [
    ...base,
    ...(workspaceHref
      ? [{ href: workspaceHref, label: "Workspace" as const }]
      : []),
    ...(interviewHref
      ? [{ href: interviewHref, label: "Entrevista" as const }]
      : []),
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 text-sm text-neutral-500">
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
              "rounded-full px-3 py-1.5 transition-colors",
              active
                ? "bg-neutral-100 text-neutral-950"
                : "hover:bg-neutral-50 hover:text-neutral-800",
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
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-neutral-50 hover:text-neutral-800"
          >
            Salir
          </button>
        </form>
      ) : null}
    </nav>
  );
}
