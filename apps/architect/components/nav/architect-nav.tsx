"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
] as const;

/**
 * Minimal navigation — four product concepts without dashboard chrome.
 * Workspace and Interview appear contextually, not as persistent tabs.
 */
export function ArchitectNav({
  workspaceHref,
  interviewHref,
}: {
  workspaceHref?: string | null;
  interviewHref?: string | null;
}) {
  const pathname = usePathname();

  const items = [
    ...LINKS,
    ...(workspaceHref
      ? [{ href: workspaceHref, label: "Workspace" as const }]
      : []),
    ...(interviewHref
      ? [{ href: interviewHref, label: "Interview" as const }]
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
    </nav>
  );
}
