import { Suspense } from "react";
import { PreparationBriefView } from "@/components/preparation/preparation-brief-view";

export default function PreparationPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
          <p className="text-[var(--isalwa-slate)]/80">Cargando…</p>
        </main>
      }
    >
      <PreparationBriefView />
    </Suspense>
  );
}
