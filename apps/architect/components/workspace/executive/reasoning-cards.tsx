"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { ReasoningCard } from "@/lib/executive";

export function ReasoningCards({ cards }: { cards: ReasoningCard[] }) {
  if (cards.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Reasoning cards appear when recommendations have evidence.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Architect Reasoning
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Not ChatGPT. Evidence.
        </h3>
      </div>

      <div className="space-y-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
          >
            <Card className="px-5 py-5">
              <p className="text-sm text-neutral-500">{card.question}</p>
              <p className="architect-serif mt-1 text-2xl text-neutral-950">
                {card.subject}?
              </p>
              <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
                Evidence
              </p>
              <ul className="mt-2 space-y-1.5">
                {card.evidence.map((item) => (
                  <li key={item} className="text-sm text-neutral-700">
                    • {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-neutral-500">
                Confidence{" "}
                <span className="font-medium text-neutral-950">
                  {Math.round(card.confidence * 100)}%
                </span>
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
