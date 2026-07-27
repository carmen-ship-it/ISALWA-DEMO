"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signInAction } from "@/lib/auth";
import { PILOT_USERS } from "@/lib/auth/constants";
import { useTranslations } from "@/lib/i18n";

export function LoginForm() {
  const { t } = useTranslations();
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
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="mx-auto w-full max-w-md"
    >
      <Card className="px-7 py-8 sm:px-9 sm:py-9">
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {t("loginForm.email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={PILOT_USERS.carmen.email}
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60"
            >
              {t("loginForm.password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="isalwa-t-fast w-full rounded-full border border-[var(--isalwa-mist)] bg-white px-5 py-3.5 text-sm text-[var(--isalwa-kiln)] outline-none focus:border-[var(--isalwa-glaze)] focus:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>

          {error ? (
            <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? t("loginForm.signingIn") : t("loginForm.signIn")}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-center text-xs leading-relaxed text-[var(--isalwa-slate)]/60">
        {t("loginForm.pilotNote", {
          carmenEmail: PILOT_USERS.carmen.email,
          alvaroEmail: PILOT_USERS.alvaro.email,
        })}
      </p>
    </motion.div>
  );
}
