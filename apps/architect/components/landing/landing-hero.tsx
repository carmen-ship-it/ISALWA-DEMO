"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-24 sm:px-10">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[11px] font-medium uppercase tracking-[0.22em] text-neutral-500"
      >
        ISALWA Architect
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.08 }}
        className="architect-serif mt-8 max-w-3xl text-5xl leading-[1.05] text-neutral-950 sm:text-6xl md:text-7xl"
      >
        Design your company before you build software.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.18 }}
        className="mt-8 max-w-2xl text-lg leading-relaxed text-neutral-600 sm:text-xl"
      >
        The Architect interviews your team, understands your operation,
        discovers bottlenecks, and produces the blueprint for your future
        operating system.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, delay: 0.28 }}
        className="mt-12"
      >
        <Button asChild size="lg">
          <Link href="/discovery">Begin Discovery</Link>
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="mt-16 text-sm text-neutral-400"
      >
        A guided discovery session. About 20–30 minutes.
      </motion.p>
    </main>
  );
}
