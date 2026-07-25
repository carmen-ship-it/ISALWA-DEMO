"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { useAuth } from "@/hooks/use-auth";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

export function CompanyHome() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [companies, setCompanies] = useState<CompanyWorkspace[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!session) return;
    if (session.role === "client" && session.primaryWorkspaceId) {
      router.replace(`/workspace/${session.primaryWorkspaceId}`);
      return;
    }

    let cancelled = false;
    void (async () => {
      const all = await store.workspaces.list();
      const assigned = new Set(session.assignedWorkspaceIds);
      const visible = all.filter((workspace) => assigned.has(workspace.id));
      if (!cancelled) {
        setCompanies(visible);
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, store, router]);

  if (loading || !session || session.role === "client" || !ready) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-neutral-500">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
            Panel de consultora
          </p>
          <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
            Hola, {session.displayName}
          </h1>
          <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-600">
            Empresas asignadas a tu cuenta.
          </p>
        </div>
        <ArchitectNav />
      </header>

      {companies.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-10 text-center">
          <p className="text-lg text-neutral-700">Sin empresas asignadas</p>
          <p className="mt-2 text-sm text-neutral-500">
            Cuando tengas compañías en el piloto, aparecerán aquí.
          </p>
        </div>
      ) : (
        <ul className="mt-12 space-y-3">
          {companies.map((company, index) => (
            <motion.li
              key={company.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.04 }}
            >
              <Link
                href={`/workspace/${company.id}`}
                className="group flex items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition hover:border-neutral-300"
              >
                <div>
                  <p className="text-lg text-neutral-950">{company.companyName}</p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {company.currentStage} · {company.businessUnderstanding}% ·{" "}
                    {formatRelativeActivity(company.lastActivityAt)}
                  </p>
                </div>
                <span className="text-sm text-neutral-400 transition group-hover:text-neutral-700">
                  Abrir workspace
                </span>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}
    </main>
  );
}
