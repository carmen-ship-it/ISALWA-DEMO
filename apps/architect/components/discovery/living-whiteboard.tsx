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
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
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
                className="text-sm text-[var(--isalwa-slate)]"
              >
                {item}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{value}</p>
      )}
    </motion.div>
  );
}

export function LivingWhiteboard({
  board,
  variant = "consultant",
}: {
  board: WhiteboardState;
  /**
   * Living Whiteboard, Client Mode — the same engine fields, calmer labels.
   * A client reading "Contradicciones" or "Supuestos" mid-conversation reads
   * an internal debugging board, not a consulting deliverable. Consultants
   * (who already read this vocabulary everywhere else) keep the raw labels;
   * clients see the same content under the consultative framing a McKinsey
   * deck would use. Presentation only — nothing here is hidden or dropped.
   */
  variant?: "consultant" | "client";
}) {
  const facts = board.facts ?? [];
  const hypotheses = board.hypotheses ?? [];
  const risks = board.risks ?? [];
  const unknowns = board.unknowns ?? [];
  const assumptions = board.assumptions ?? [];
  const contradictions = board.contradictions ?? [];
  const ideas = board.ideas ?? [];
  const opportunities = board.opportunities ?? [];
  const isClient = variant === "client";

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
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
        Pizarra viva
      </p>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
        Vista de consultoría que se actualiza sola. No es editable.
      </p>

      {empty ? (
        <p className="mt-5 text-sm text-[var(--isalwa-slate)]/60">
          La pizarra se llena a medida que profundiza el entendimiento.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          <WhiteboardBlock label="Modelo de negocio" value={board.businessModel} />
          <WhiteboardBlock
            label="Equipo comercial"
            value={board.commercialTeam}
          />
          <WhiteboardBlock label="Clientes" value={board.customers} />
          <WhiteboardBlock
            label="Sistemas actuales"
            value={board.currentSystems}
          />
          <WhiteboardBlock label="Dolores" value={board.painPoints} />
          <WhiteboardBlock
            label="Módulos potenciales"
            value={board.potentialModules}
          />
          <WhiteboardBlock label="Hechos" value={facts} />
          <WhiteboardBlock
            label={isClient ? "Aspectos por validar" : "Hipótesis"}
            value={hypotheses}
          />
          <WhiteboardBlock label="Riesgos" value={risks} />
          <WhiteboardBlock label="Incógnitas" value={unknowns} />
          <WhiteboardBlock
            label={isClient ? "Información pendiente" : "Supuestos"}
            value={assumptions}
          />
          <WhiteboardBlock
            label={isClient ? "Puntos abiertos" : "Contradicciones"}
            value={contradictions}
          />
          <WhiteboardBlock label="Ideas" value={ideas} />
          <WhiteboardBlock label="Oportunidades" value={opportunities} />
        </div>
      )}
    </Card>
  );
}
