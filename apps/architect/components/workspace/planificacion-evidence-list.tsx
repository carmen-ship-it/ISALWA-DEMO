"use client";

import type { PlanificacionEvidenceRef } from "@/types";
import { provenanceFromEvidenceCount } from "@/lib/presentation/provenance";
import { ProvenanceFootnote } from "@/components/workspace/provenance-footnote";

const ENGINE_LABELS: Record<PlanificacionEvidenceRef["sourceEngine"], string> = {
  blueprint: "Plan de negocio",
  company_model: "Modelo de empresa",
  processes: "Procesos",
  solution: "Sistema recomendado",
  deliverables: "Entregables",
  recommendations: "Recomendaciones",
  consulting: "Consultoría",
  readiness: "Preparación",
  implementation_package: "Paquete de implementación",
  living_deliverables: "Documentos vivos",
  knowledge: "Conocimiento",
  timeline: "Historial",
  workspace: "Espacio de trabajo",
  demo_prototype: "Prototipo de referencia",
};

export function PlanificacionEvidenceList({
  evidenceRefs,
}: {
  evidenceRefs: PlanificacionEvidenceRef[];
}) {
  if (evidenceRefs.length === 0) return null;

  const tier = provenanceFromEvidenceCount(
    evidenceRefs.length,
    "needs_confirmation",
  );

  return (
    <div className="mt-3 rounded-xl border border-[var(--isalwa-mist)]/80 bg-[var(--isalwa-porcelain)]/80 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/70">
        Evidencia
      </p>
      <ul className="mt-2 space-y-1.5 text-sm text-[var(--isalwa-slate)]">
        {evidenceRefs.map((ref, index) => (
          <li key={`${ref.sourceEngine}-${ref.sourceId ?? index}`}>
            <span className="text-[11px] uppercase tracking-wide text-[var(--isalwa-slate)]/55">
              {ENGINE_LABELS[ref.sourceEngine]}
            </span>
            {" — "}
            {ref.quote}
            {typeof ref.confidence === "number" && (
              <span className="text-[11px] text-[var(--isalwa-slate)]/60">
                {" "}
                ({Math.round(ref.confidence)}%)
              </span>
            )}
          </li>
        ))}
      </ul>
      <ProvenanceFootnote tier={tier} className="mt-2" />
    </div>
  );
}
