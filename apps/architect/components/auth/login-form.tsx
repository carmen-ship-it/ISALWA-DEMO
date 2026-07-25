"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { signInAction } from "@/lib/auth";
import { PILOT_USERS } from "@/lib/auth/constants";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      const next = searchParams.get("next");
      const fallback =
        result.redirectTo ??
        (next && !next.startsWith("/login") ? next : "/");
      router.replace(fallback);
      router.refresh();
    });
  }

  return (
    <motion.form
      onSubmit={onSubmit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mx-auto w-full max-w-md space-y-5"
    >
      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400"
        >
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={PILOT_USERS.carmen.email}
          className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400"
        >
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-400"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Entrando…" : "Iniciar sesión"}
      </Button>

      <p className="text-center text-xs leading-relaxed text-neutral-400">
        Piloto: {PILOT_USERS.carmen.email} (Consultora) ·{" "}
        {PILOT_USERS.alvaro.email} (Cliente)
      </p>
    </motion.form>
  );
}
