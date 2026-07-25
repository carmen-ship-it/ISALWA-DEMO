"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  canCreateCompany,
  canInviteUsers,
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
} from "@/lib/auth";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { createEmptyWorkspace, formatRelativeActivity } from "@/lib/workspace";
import type { CompanyWorkspace } from "@/types";

export function CompanyHome() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [abc, setAbc] = useState<CompanyWorkspace | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (!session) return;
    if (session.role === "client" && session.primaryWorkspaceId) {
      router.replace(`/workspace/${session.primaryWorkspaceId}`);
      return;
    }
    void store.workspaces.get(PILOT_COMPANY_WORKSPACE_ID).then(setAbc);
  }, [session, store, router]);

  async function createCompany() {
    if (!session || !canCreateCompany(session)) return;
    const name = newName.trim();
    if (!name) return;
    const workspace = createEmptyWorkspace(name);
    await store.workspaces.save(workspace);
    setCreating(false);
    setNewName("");
    router.push(`/workspace/${workspace.id}?fresh=1`);
  }

  if (loading || !session || session.role === "client") {
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
            Empresas asignadas al piloto. Más compañías podrán añadirse sin
            cambiar la arquitectura.
          </p>
        </div>
        <ArchitectNav />
      </header>

      <ul className="mt-12 space-y-3">
        <motion.li
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href={`/workspace/${PILOT_COMPANY_WORKSPACE_ID}`}
            className="group flex items-center justify-between gap-4 rounded-3xl border border-neutral-200/80 bg-white px-6 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition hover:border-neutral-300"
          >
            <div>
              <p className="text-lg text-neutral-950">
                {abc?.companyName ?? PILOT_COMPANY_NAME}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {abc
                  ? `${abc.currentStage} · ${abc.businessUnderstanding}% · ${formatRelativeActivity(abc.lastActivityAt)}`
                  : "Cliente: Álvaro · Consultora: Carmen"}
              </p>
            </div>
            <span className="text-sm text-neutral-400 transition group-hover:text-neutral-700">
              Abrir workspace
            </span>
          </Link>
        </motion.li>

        <motion.li
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <div className="rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/60 px-6 py-5">
            <p className="text-lg text-neutral-500">Próximas empresas</p>
            <p className="mt-1 text-sm text-neutral-400">
              Espacio reservado para futuros clientes del Architect.
            </p>
          </div>
        </motion.li>

        {canCreateCompany(session) ? (
          <motion.li
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            {creating ? (
              <div className="rounded-3xl border border-neutral-200/80 bg-white px-6 py-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Nueva empresa
                </p>
                <form
                  className="mt-4 flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createCompany();
                  }}
                >
                  <input
                    autoFocus
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Nombre de la empresa"
                    className="flex-1 rounded-full border border-neutral-200 bg-white px-5 py-3 text-base outline-none focus:border-neutral-400"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={!newName.trim()}>
                      Crear
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setCreating(false);
                        setNewName("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center justify-between rounded-3xl border border-dashed border-neutral-300 bg-transparent px-6 py-5 text-left transition hover:border-neutral-400 hover:bg-white/60"
              >
                <span className="text-lg text-neutral-700">+ Nueva empresa</span>
                <span className="text-sm text-neutral-400">Iniciar discovery</span>
              </button>
            )}
          </motion.li>
        ) : null}

        {canInviteUsers(session) ? (
          <li>
            <button
              type="button"
              disabled
              className="w-full rounded-3xl border border-neutral-100 px-6 py-4 text-left text-sm text-neutral-400"
              title="Stub — no implementado en el piloto"
            >
              Invitar usuarios (próximamente)
            </button>
          </li>
        ) : null}
      </ul>
    </main>
  );
}
