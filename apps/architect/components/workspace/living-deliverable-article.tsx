import { Article, Empty, List, Section } from "@/components/workspace/deliverables-panel";
import type { LivingDeliverableContent } from "@/types";

/**
 * Mission 26 — "View Online" renderer for the eight Living Deliverables.
 * Reuses the same `Article` / `Section` / `List` primitives the Mission 9
 * consulting package already renders with (`deliverables-panel.tsx`) —
 * no second presentation system for documents.
 */
export function LivingDeliverableArticle({
  content,
  title,
}: {
  content: LivingDeliverableContent;
  title: string;
}) {
  switch (content.kind) {
    case "business_blueprint": {
      const b = content.data.blueprint;
      return (
        <Article title={title}>
          <Section title="Resumen" body={b.summary} />
          <List title="Capacidades" items={b.capabilities} />
          <List title="Departamentos" items={b.departments} />
          <List title="Flujos de trabajo" items={b.workflows} />
          <List title="Información central" items={b.entities} />
          <List title="Sistemas actuales" items={b.systems} />
          <List title="Reglas operativas" items={b.operatingRules} />
          <List title="Capacidades recomendadas" items={b.modules} />
          <List title="Riesgos" items={b.risks} />
        </Article>
      );
    }
    case "company_playbook": {
      const p = content.data;
      return (
        <Article title={title}>
          {p.vision ? <Section title="Visión" body={p.vision} /> : null}
          <Section title="Cómo opera la empresa" body={p.orgSummary} />
          <List title="Departamentos" items={p.departments} />
          <List title="Principios de decisión" items={p.decisionPrinciples} />
          <List title="Normas de comunicación" items={p.communicationNorms} />
          <List title="Architect todavía necesita más conocimiento" items={p.needsMoreKnowledge} />
        </Article>
      );
    }
    case "employee_handbook": {
      const h = content.data;
      if (!h.hasContent) {
        return (
          <Article title={title}>
            <Empty label="Architect todavía no tiene evidencia suficiente sobre esta empresa para construir un manual del empleado." />
            <List title="Architect todavía necesita más conocimiento" items={h.needsMoreKnowledge} />
          </Article>
        );
      }
      return (
        <Article title={title}>
          {h.sections.map((s) => (
            <Section key={s.title} title={s.title} body={s.body} />
          ))}
          <List title="Architect todavía necesita más conocimiento" items={h.needsMoreKnowledge} />
        </Article>
      );
    }
    case "sop_library": {
      const lib = content.data;
      if (lib.sops.length === 0) {
        return (
          <Article title={title}>
            <Empty label={lib.needsMoreKnowledge[0] ?? "Architect todavía no ha mapeado procesos."} />
          </Article>
        );
      }
      return (
        <Article title={title}>
          {lib.sops.map((sop) => (
            <div key={sop.id} className="border-t border-[var(--isalwa-mist)]/70 pt-5 first:border-t-0 first:pt-0">
              <p className="text-lg text-[var(--isalwa-kiln)]">{sop.processName}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">{sop.purpose}</p>
              <p className="mt-2 text-xs text-[var(--isalwa-slate)]/60">
                Dueño: {sop.owner ?? "Por confirmar"} · Disparador: {sop.trigger}
              </p>
              <ol className="mt-3 space-y-1.5">
                {sop.steps.map((s) => (
                  <li key={`${sop.id}-${s.order}`} className="text-sm text-[var(--isalwa-slate)]">
                    {s.order}. {s.name} · {s.actor}
                  </li>
                ))}
              </ol>
              <List title="Sistemas usados" items={sop.systemsUsed} />
              <List title="Excepciones" items={sop.exceptions} />
              <List title="Falta conocer" items={sop.missingKnowledge} />
            </div>
          ))}
        </Article>
      );
    }
    case "job_description_library": {
      const lib = content.data;
      if (lib.jobs.length === 0) {
        return (
          <Article title={title}>
            <Empty label={lib.needsMoreKnowledge[0] ?? "Architect todavía no ha identificado roles."} />
          </Article>
        );
      }
      return (
        <Article title={title}>
          {lib.jobs.map((job) => (
            <div key={job.id} className="border-t border-[var(--isalwa-mist)]/70 pt-5 first:border-t-0 first:pt-0">
              <p className="text-lg text-[var(--isalwa-kiln)]">{job.roleName}</p>
              <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                {job.department ?? "Departamento por confirmar"} ·{" "}
                {job.peopleAssigned.length > 0 ? job.peopleAssigned.join(", ") : "Sin persona asignada aún"}
              </p>
              <List title="Responsabilidades" items={job.responsibilities} />
              <List title="Falta conocer" items={job.missingKnowledge} />
            </div>
          ))}
        </Article>
      );
    }
    case "training_academy": {
      const a = content.data;
      return (
        <Article title={title}>
          {a.modules.length === 0 ? (
            <Empty label={a.needsMoreKnowledge[0] ?? "Architect todavía no ha mapeado procesos para entrenar."} />
          ) : (
            a.modules.map((m) => (
              <div key={m.id} className="border-t border-[var(--isalwa-mist)]/70 pt-5 first:border-t-0 first:pt-0">
                <p className="text-lg text-[var(--isalwa-kiln)]">{m.title}</p>
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">Audiencia: {m.audience}</p>
                <List title="Objetivos" items={m.objectives} />
                <List title="Guion" items={m.outline} />
              </div>
            ))
          )}
          <List title="Hoja de ruta futura (videos, evaluaciones, certificados)" items={a.futureRoadmap} />
        </Article>
      );
    }
    case "ai_playbook": {
      const p = content.data;
      if (p.items.length === 0) {
        return (
          <Article title={title}>
            <Empty label={p.needsMoreKnowledge[0] ?? "Architect todavía no tiene recomendaciones suficientes."} />
          </Article>
        );
      }
      return (
        <Article title={title}>
          <ol className="space-y-3">
            {p.items.map((item) => (
              <li key={item.id} className="text-sm text-[var(--isalwa-slate)]">
                <p className="text-base text-[var(--isalwa-kiln)]">{item.title}</p>
                <p className="mt-1 text-[var(--isalwa-slate)]/80">{item.rationale}</p>
                <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">
                  Prioridad: {item.priority ?? "por definir"} · Confianza: {item.confidenceBand}
                </p>
              </li>
            ))}
          </ol>
        </Article>
      );
    }
    case "improvement_roadmap": {
      const r = content.data;
      return (
        <Article title={title}>
          <RoadmapHorizon title="Victorias rápidas" items={r.quickWins} />
          <RoadmapHorizon title="30 días" items={r.thirtyDay} />
          <RoadmapHorizon title="90 días" items={r.ninetyDay} />
          <RoadmapHorizon title="Largo plazo" items={r.longTerm} />
          <List title="Architect todavía necesita más conocimiento" items={r.needsMoreKnowledge} />
        </Article>
      );
    }
    default:
      return null;
  }
}

function RoadmapHorizon({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; title: string; description: string; impact: string | null; effort: string | null }>;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li key={item.id} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            <span className="text-[var(--isalwa-kiln)]">{item.title}</span> — {item.description}
            {item.effort ? <span className="text-[var(--isalwa-slate)]/60"> ({item.effort})</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
