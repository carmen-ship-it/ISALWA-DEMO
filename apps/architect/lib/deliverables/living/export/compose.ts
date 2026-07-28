/**
 * Mission 26 — turns a generated `LivingDeliverableVersion` into the shared
 * `ExportDocument` shape both PDF and DOCX renderers consume. Pure
 * projection — composes strings the generators already produced; never adds
 * new facts.
 */

import { strengthBandLabelEs, toPercent } from "@/lib/presentation";
import type { LivingDeliverableVersion } from "@/types";
import { livingDeliverableCopy } from "../copy";
import type { ExportDocument, ExportRevision, ExportSection } from "./document-model";

function formatDateEs(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function needsMoreKnowledgeSection(items: string[]): ExportSection | null {
  if (items.length === 0) return null;
  return {
    heading: "Architect todavía necesita más conocimiento",
    level: 1,
    bullets: items,
  };
}

function buildSections(version: LivingDeliverableVersion): ExportSection[] {
  const content = version.content;
  switch (content.kind) {
    case "business_blueprint": {
      const b = content.data.blueprint;
      const sections: ExportSection[] = [
        { heading: "Resumen", level: 1, paragraphs: [b.summary] },
        { heading: "Capacidades", level: 1, bullets: b.capabilities },
        { heading: "Departamentos", level: 1, bullets: b.departments },
        { heading: "Flujos de trabajo", level: 1, bullets: b.workflows },
        { heading: "Información central", level: 1, bullets: b.entities },
        { heading: "Sistemas actuales", level: 1, bullets: b.systems },
        { heading: "Reglas operativas", level: 1, bullets: b.operatingRules },
        { heading: "Capacidades recomendadas", level: 1, bullets: b.modules },
        { heading: "Riesgos", level: 1, bullets: b.risks },
      ];
      return sections.filter((s) => (s.paragraphs?.length ?? 0) + (s.bullets?.length ?? 0) > 0);
    }
    case "company_playbook": {
      const p = content.data;
      const candidates: Array<ExportSection | null> = [
        p.vision ? { heading: "Visión", level: 1, paragraphs: [p.vision] } : null,
        { heading: "Cómo opera la empresa", level: 1, paragraphs: [p.orgSummary] },
        { heading: "Departamentos", level: 1, bullets: p.departments },
        { heading: "Principios de decisión", level: 1, bullets: p.decisionPrinciples },
        { heading: "Normas de comunicación", level: 1, bullets: p.communicationNorms },
      ];
      const sections = candidates.filter((s): s is ExportSection => s != null);
      const gaps = needsMoreKnowledgeSection(p.needsMoreKnowledge);
      return gaps ? [...sections, gaps] : sections;
    }
    case "employee_handbook": {
      const h = content.data;
      if (!h.hasContent) {
        return [
          {
            heading: "Aún sin contenido suficiente",
            level: 1,
            paragraphs: [
              "Architect todavía no tiene evidencia suficiente sobre esta empresa para construir un manual del empleado.",
            ],
          },
        ];
      }
      const sections: ExportSection[] = h.sections.map((s) => ({
        heading: s.title,
        level: 1,
        paragraphs: [s.body],
      }));
      const gaps = needsMoreKnowledgeSection(h.needsMoreKnowledge);
      return gaps ? [...sections, gaps] : sections;
    }
    case "sop_library": {
      const lib = content.data;
      if (lib.sops.length === 0) {
        return [
          {
            heading: "Sin procedimientos todavía",
            level: 1,
            paragraphs: [lib.needsMoreKnowledge[0] ?? "Architect todavía no ha mapeado procesos."],
          },
        ];
      }
      return lib.sops.map((sop): ExportSection => ({
        heading: sop.processName,
        level: 1,
        paragraphs: [
          `Propósito: ${sop.purpose}`,
          `Dueño: ${sop.owner ?? "Por confirmar"}`,
          `Disparador: ${sop.trigger}`,
        ],
        numbered: sop.steps.map((s) => `${s.name} — ${s.actor}. ${s.description}`),
        bullets: [
          ...(sop.systemsUsed.length ? [`Sistemas usados: ${sop.systemsUsed.join(", ")}`] : []),
          ...sop.exceptions.map((e) => `Excepción: ${e}`),
          ...sop.missingKnowledge.map((m) => `Falta conocer: ${m}`),
        ],
      }));
    }
    case "job_description_library": {
      const lib = content.data;
      if (lib.jobs.length === 0) {
        return [
          {
            heading: "Sin puestos documentados todavía",
            level: 1,
            paragraphs: [lib.needsMoreKnowledge[0] ?? "Architect todavía no ha identificado roles."],
          },
        ];
      }
      return lib.jobs.map((job): ExportSection => ({
        heading: job.roleName,
        level: 1,
        paragraphs: [
          `Departamento: ${job.department ?? "Por confirmar"}`,
          `Persona(s) asignada(s): ${job.peopleAssigned.length > 0 ? job.peopleAssigned.join(", ") : "Por confirmar"}`,
        ],
        bullets: [
          ...job.responsibilities,
          ...job.missingKnowledge.map((m) => `Falta conocer: ${m}`),
        ],
      }));
    }
    case "training_academy": {
      const a = content.data;
      const sections: ExportSection[] =
        a.modules.length > 0
          ? a.modules.map((m): ExportSection => ({
              heading: m.title,
              level: 1,
              paragraphs: [`Audiencia: ${m.audience}`],
              bullets: m.objectives,
              numbered: m.outline,
            }))
          : [
              {
                heading: "Sin módulos todavía",
                level: 1,
                paragraphs: [a.needsMoreKnowledge[0] ?? "Architect todavía no ha mapeado procesos para entrenar."],
              },
            ];
      sections.push({
        heading: "Hoja de ruta futura (videos, evaluaciones, certificados)",
        level: 1,
        bullets: a.futureRoadmap,
      });
      return sections;
    }
    case "ai_playbook": {
      const p = content.data;
      if (p.items.length === 0) {
        return [
          {
            heading: "Sin recomendaciones todavía",
            level: 1,
            paragraphs: [p.needsMoreKnowledge[0] ?? "Architect todavía no tiene recomendaciones suficientes."],
          },
        ];
      }
      return [
        {
          heading: "Dónde ayuda la IA primero",
          level: 1,
          numbered: p.items.map(
            (i) =>
              `${i.title} — ${i.rationale} (prioridad: ${i.priority ?? "por definir"}, confianza: ${i.confidenceBand}).`,
          ),
        },
      ];
    }
    case "improvement_roadmap": {
      const r = content.data;
      const toBullets = (items: typeof r.quickWins) =>
        items.map((i) => `${i.title} — ${i.description}${i.effort ? ` (${i.effort})` : ""}`);
      const candidates: ExportSection[] = [
        { heading: "Victorias rápidas", level: 1, bullets: toBullets(r.quickWins) },
        { heading: "30 días", level: 1, bullets: toBullets(r.thirtyDay) },
        { heading: "90 días", level: 1, bullets: toBullets(r.ninetyDay) },
        { heading: "Largo plazo", level: 1, bullets: toBullets(r.longTerm) },
      ];
      const sections = candidates.filter((s) => (s.bullets?.length ?? 0) > 0);
      const gaps = needsMoreKnowledgeSection(r.needsMoreKnowledge);
      return gaps ? [...sections, gaps] : sections;
    }
    default:
      return [];
  }
}

export function composeLivingDeliverableDocument(
  version: LivingDeliverableVersion,
  companyName: string,
  history: LivingDeliverableVersion[],
): ExportDocument {
  const copy = livingDeliverableCopy(version.kind, companyName);
  const revisionHistory: ExportRevision[] = history
    .slice()
    .sort((a, b) => b.version - a.version)
    .map((v): ExportRevision => ({
      version: v.version,
      date: formatDateEs(v.generatedAt),
      note:
        v.id === version.id
          ? "Versión actual generada por Architect."
          : "Versión anterior, conservada para trazabilidad.",
    }));

  return {
    companyName,
    kicker: copy.kicker.toUpperCase(),
    title: version.title,
    subtitle: copy.description,
    generatedAtLabel: formatDateEs(version.generatedAt),
    versionLabel: `Versión ${version.version}`,
    readinessLabel: strengthBandLabelEs(version.confidence),
    confidenceLabel: `${toPercent(version.confidence)}% de confianza · ${version.evidenceCount} referencias de evidencia`,
    sections: buildSections(version),
    revisionHistory,
  };
}
