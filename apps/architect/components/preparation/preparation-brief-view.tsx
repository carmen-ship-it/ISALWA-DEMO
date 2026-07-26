"use client";

/**
 * Preparation Brief page shell — loads the workspace and hands it to
 * PreparationBriefPanel. Consultant-only route (enforced in middleware via
 * CONSULTANT_ONLY_PATHS). No preparation logic lives here.
 */

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BackLink } from "@/components/nav/back-link";
import { PreparationBriefPanel } from "@/components/workspace/preparation-brief-panel";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import type { CompanyWorkspace } from "@/types";

export function PreparationBriefView() {
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");
  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!workspaceId) {
      setNotFound(true);
      return;
    }
    void store.workspaces.get(workspaceId).then((next) => {
      if (cancelled) return;
      if (!next) {
        setNotFound(true);
        return;
      }
      setWorkspace(next);
    });
    return () => {
      cancelled = true;
    };
  }, [store, workspaceId]);

  if (notFound) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <h1 className="architect-serif text-4xl text-[var(--isalwa-kiln)]">
          No encontramos este espacio de trabajo.
        </h1>
        <p className="mt-4 text-[var(--isalwa-slate)]">
          Vuelva a la lista de empresas e intente de nuevo.
        </p>
        <div className="mt-8">
          <BackLink href="/" label="Volver a empresas" />
        </div>
      </main>
    );
  }

  if (!workspace) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
        <p className="text-[var(--isalwa-slate)]/80">Cargando…</p>
      </main>
    );
  }

  const interviewHref = `/discovery?workspaceId=${workspace.id}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 sm:px-10">
      <BackLink
        href={`/workspace/${workspace.id}`}
        label="Volver al espacio de trabajo"
        className="mb-6"
      />
      <PreparationBriefPanel
        workspace={workspace}
        interviewHref={interviewHref}
      />
    </main>
  );
}
