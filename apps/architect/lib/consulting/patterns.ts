import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingPattern,
  ConversationMemory,
} from "@/types";

interface PatternRule {
  id: string;
  label: string;
  description: string;
  test: (blob: string, signalIds: Set<string>) => boolean;
}

const RULES: PatternRule[] = [
  {
    id: "shadow_crm",
    label: "CRM improvisado en mensajería",
    description:
      "El contexto comercial se acumula en el chat en vez de en un sistema de clientes duradero.",
    test: (_b, signals) => signals.has("whatsapp"),
  },
  {
    id: "spreadsheet_os",
    label: "Hoja de cálculo como sistema operativo",
    description:
      "Excel funciona como el ERP de facto para planear, dar seguimiento o reportar.",
    test: (_b, signals) => signals.has("excel"),
  },
  {
    id: "approval_theater",
    label: "Aprobaciones informales sin respaldo",
    description:
      "Las aprobaciones existen socialmente pero carecen de umbrales, respaldos y rastro de auditoría.",
    test: (_b, signals) => signals.has("approvals"),
  },
  {
    id: "hero_operator",
    label: "Patrón de operador héroe",
    description:
      "Una sola persona carga con una parte desproporcionada del trabajo operativo o comercial.",
    test: (blob) =>
      /una sola persona|solo yo|yo hago todo|persona clave|one person|only i|i do everything|key person/i.test(
        blob,
      ),
  },
  {
    id: "month_end_scramble",
    label: "Carrera de fin de mes",
    description:
      "El reporte se reconstruye contra el plazo en vez de producirse de forma continua.",
    test: (_b, signals) => signals.has("reports"),
  },
];

/**
 * Recurring consulting patterns — deterministic.
 */
export function evaluatePatterns(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingPattern[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => p.title),
  ]
    .join(" ")
    .toLowerCase();
  const signalIds = new Set(business.signals.map((s) => s.id));

  return RULES.filter((rule) => rule.test(blob, signalIds)).map((rule) => ({
    id: createId(rule.id),
    label: rule.label,
    description: rule.description,
    confidence: 0.76,
    evidence: memory.painPoints.map((p) => p.title).slice(0, 2),
  }));
}
