"use client";

/**
 * Spanish client-safe error boundary — never show English Next.js defaults mid-pilot.
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/70">
        Architect
      </p>
      <h1 className="architect-serif text-2xl text-[var(--isalwa-kiln)]">
        Algo no salió como esperábamos
      </h1>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Puede volver a intentar. Si el problema continúa, cierre sesión y entre de nuevo — su
        conocimiento de la empresa sigue guardado.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-[var(--isalwa-kiln)] px-5 py-2.5 text-sm text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
