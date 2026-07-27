"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/i18n";

export function LandingHero() {
  const { t } = useTranslations();
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24 sm:px-10">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[11px] font-medium uppercase tracking-[0.22em] text-[var(--isalwa-slate)]/80"
      >
        {t("landingHero.kicker")}
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.08 }}
        className="architect-serif mt-8 max-w-3xl text-5xl leading-[1.05] text-[var(--isalwa-kiln)] sm:text-6xl md:text-7xl"
      >
        {t("landingHero.title")}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.18 }}
        className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--isalwa-slate)] sm:text-xl"
      >
        {t("landingHero.description")}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.28 }}
        className="mt-12"
      >
        <Button asChild size="lg">
          <Link href="/discovery">{t("landingHero.cta")}</Link>
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-16 text-sm text-[var(--isalwa-slate)]/60"
      >
        {t("landingHero.footnote")}
      </motion.p>
    </main>
  );
}
