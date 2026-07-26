import { Suspense } from "react";
import { ReportView } from "@/components/report/report-view";

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6">
          <p className="text-[var(--isalwa-slate)]/80">Cargando informe…</p>
        </main>
      }
    >
      <ReportView />
    </Suspense>
  );
}
