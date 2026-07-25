"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { PILOT_COMPANY_WORKSPACE_ID } from "@/lib/auth/constants";

/**
 * Pilot home — no company list. Authenticated users open ISALWA directly.
 */
export function CompanyHome() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    const workspaceId =
      session.primaryWorkspaceId ??
      session.assignedWorkspaceIds[0] ??
      PILOT_COMPANY_WORKSPACE_ID;
    router.replace(`/workspace/${workspaceId}`);
  }, [session, loading, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <p className="text-neutral-500">Cargando ISALWA…</p>
    </main>
  );
}
