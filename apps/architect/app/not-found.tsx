import Link from "next/link";

/**
 * Spanish client-safe 404 — never show English Next.js defaults mid-pilot.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/70">
        Architect
      </p>
      <h1 className="architect-serif text-2xl text-[var(--isalwa-kiln)]">
        No encontramos esta página
      </h1>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Vuelva al espacio de trabajo — ahí está todo lo que Architect ya entiende de su empresa.
      </p>
      <Link
        href="/"
        className="rounded-full bg-[var(--isalwa-kiln)] px-5 py-2.5 text-sm text-white"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
