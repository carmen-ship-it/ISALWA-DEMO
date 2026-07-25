import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgba(15,23,42,0.04),_transparent_55%)]" />

      <div className="mb-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-neutral-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)]">
          <span className="architect-serif text-2xl text-neutral-950">A</span>
        </div>
        <p className="mt-6 text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500">
          ISALWA Architect
        </p>
        <h1 className="architect-serif mt-4 text-4xl leading-tight text-neutral-950 sm:text-5xl">
          Bienvenido al Arquitecto Empresarial
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-neutral-600">
          Comprenda su empresa antes de construir software.
        </p>
      </div>

      <Suspense fallback={<p className="text-center text-sm text-neutral-400">Cargando…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
