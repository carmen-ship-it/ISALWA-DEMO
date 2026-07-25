"use client";

import { AnimatePresence, motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { WhiteboardState } from "@/types";

function WhiteboardBlock({
  label,
  value,
}: {
  label: string;
  value: string | string[] | null | undefined;
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-1.5"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      {Array.isArray(value) ? (
        <ul className="space-y-1">
          <AnimatePresence initial={false}>
            {value.map((item) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-neutral-800"
              >
                {item}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-sm font-medium text-neutral-900">{value}</p>
      )}
    </motion.div>
  );
}

export function LivingWhiteboard({ board }: { board: WhiteboardState }) {
  const facts = board.facts ?? [];
  const hypotheses = board.hypotheses ?? [];
  const risks = board.risks ?? [];
  const unknowns = board.unknowns ?? [];
  const assumptions = board.assumptions ?? [];
  const contradictions = board.contradictions ?? [];
  const ideas = board.ideas ?? [];
  const opportunities = board.opportunities ?? [];

  const empty =
    !board.businessModel &&
    !board.commercialTeam &&
    !board.customers &&
    board.currentSystems.length === 0 &&
    board.painPoints.length === 0 &&
    board.potentialModules.length === 0 &&
    facts.length === 0 &&
    risks.length === 0 &&
    opportunities.length === 0;

  return (
    <Card className="px-5 py-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        Living Whiteboard
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Continuously updated consulting view. Not editable.
      </p>

      {empty ? (
        <p className="mt-5 text-sm text-neutral-400">
          The whiteboard fills as understanding deepens.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <WhiteboardBlock label="Business Model" value={board.businessModel} />
          <WhiteboardBlock
            label="Commercial Team"
            value={board.commercialTeam}
          />
          <WhiteboardBlock label="Customers" value={board.customers} />
          <WhiteboardBlock
            label="Current Systems"
            value={board.currentSystems}
          />
          <WhiteboardBlock label="Pain Points" value={board.painPoints} />
          <WhiteboardBlock
            label="Potential Modules"
            value={board.potentialModules}
          />
          <WhiteboardBlock label="Facts" value={facts} />
          <WhiteboardBlock label="Hypotheses" value={hypotheses} />
          <WhiteboardBlock label="Risks" value={risks} />
          <WhiteboardBlock label="Unknowns" value={unknowns} />
          <WhiteboardBlock label="Assumptions" value={assumptions} />
          <WhiteboardBlock label="Contradictions" value={contradictions} />
          <WhiteboardBlock label="Ideas" value={ideas} />
          <WhiteboardBlock label="Opportunities" value={opportunities} />
        </div>
      )}
    </Card>
  );
}
