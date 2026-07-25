"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { AnimatedBlueprintModel } from "@/lib/executive";

export function AnimatedBlueprint({
  model,
}: {
  model: AnimatedBlueprintModel;
}) {
  if (model.modules.length === 0 && model.departments.length === 0) {
    return (
      <Card className="px-5 py-5">
        <p className="text-sm text-neutral-500">
          The living blueprint animates once modules and departments emerge from
          discovery.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Living Blueprint
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Watch the operating system take shape.
        </h3>
      </div>

      {model.departments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {model.departments.map((dept, i) => (
            <motion.span
              key={dept}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.12 * i, duration: 0.4 }}
              className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs text-neutral-700 shadow-sm"
              style={{
                boxShadow:
                  i % 2 === 0
                    ? "0 0 0 1px rgba(15,23,42,0.04), 0 0 24px rgba(15,23,42,0.06)"
                    : undefined,
              }}
            >
              {dept}
            </motion.span>
          ))}
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-3xl border border-neutral-200/80 bg-gradient-to-b from-stone-50 to-white px-5 py-8">
        <div className="flex flex-wrap justify-center gap-3">
          {model.modules.map((mod, i) => (
            <motion.div
              key={mod.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15 + i * 0.1,
                duration: 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="min-w-[140px] max-w-[180px] rounded-2xl border border-neutral-200/90 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,0.05)]"
            >
              <p className="text-sm font-medium text-neutral-950">{mod.name}</p>
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-neutral-400">
                {mod.purpose}
              </p>
            </motion.div>
          ))}
        </div>

        {model.connections.length > 0 ? (
          <div className="mt-8 space-y-2 border-t border-neutral-100 pt-6">
            <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
              Connections
            </p>
            <ul className="space-y-1.5">
              {model.connections.slice(0, 6).map((c, i) => (
                <motion.li
                  key={`${c.from}-${c.to}-${i}`}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.07, duration: 0.35 }}
                  className="text-sm text-neutral-600"
                >
                  <span className="text-neutral-950">{c.from}</span>
                  <motion.span
                    className="mx-2 inline-block text-neutral-300"
                    animate={{ opacity: [0.35, 1, 0.35] }}
                    transition={{
                      repeat: Infinity,
                      duration: 2.2,
                      delay: i * 0.15,
                    }}
                  >
                    →
                  </motion.span>
                  <span className="text-neutral-950">{c.to}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
