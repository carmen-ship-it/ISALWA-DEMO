import type {
  CompanyWorkspace,
  PlanificacionClientQuestion,
  PlanificacionPlanItem,
} from "@/types";
import { nowIso } from "@/lib/utils";
import {
  itemDerivationMeta,
  planificacionItemId,
  planificacionQuestionId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

/**
 * PartyGraph lifecycle — customers, suppliers, roles on one Party (Increment 5.1).
 */
export function derivePartyLifecycleRequirements(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];

  const push = (
    keySeed: string,
    title: string,
    body: string,
    extra?: Partial<PlanificacionPlanItem>,
  ) => {
    const stableKey = stableKeyFor("technical_requirement", `party-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Arquitectura PartyGraph — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "unified-party-not-silos",
    "PartyGraph unificado — no silos cliente/proveedor/vendor",
    "Cliente, proveedor, distribuidor, partner son PartyRoleAssignment sobre un Party canónico — " +
      "no bases maestras independientes duplicadas.",
    { osModuleHint: "PartyGraph" },
  );

  push(
    "multi-role-one-party",
    "Una entidad, múltiples roles comerciales",
    "La misma organización puede ser customer + supplier + distributor simultáneamente — " +
      "un Party id, varias asignaciones de rol con vigencia.",
    { osModuleHint: "PartyGraph:Roles" },
  );

  push(
    "commercial-account-lens",
    "Cuenta comercial como lente sobre Party",
    "Opportunity, Quote, Order referencian CommercialAccount → partyId — no CRM paralelo.",
    { osModuleHint: "Commercial:Account" },
  );

  push(
    "party-merge-governance",
    "Fusión de parties con gobernanza (sin fusión financiera silenciosa)",
    "Cola de duplicados; fusión con aprobación si hay historial financiero — ADR-0004.",
    { osModuleHint: "PartyGraph:Merge" },
  );

  push(
    "contact-not-second-identity",
    "Contacto no es un segundo grafo de identidad",
    "Teléfono/WhatsApp/email en Contact enlazado a Party — mensajería no crea lista de contactos aislada.",
    { osModuleHint: "PartyGraph:Contact" },
  );

  push(
    "supplier-vendor-same-graph",
    "Proveedor y vendor en el mismo PartyGraph",
    "Purchasing y Finance futuros consumen el mismo partyId — sin listas maestras de proveedor duplicadas.",
    { osModuleHint: "PartyGraph:Supplier" },
  );

  void workspace;
  return items;
}

export function derivePartyLifecycleQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const questions: PlanificacionClientQuestion[] = [];

  const push = (keySeed: string, question: string, understanding: string, why: string) => {
    const stableKey = stableKeyFor("client_decision", `party-q-${keySeed}`);
    questions.push({
      id: planificacionQuestionId(stableKey),
      stableKey,
      question,
      ourUnderstanding: understanding,
      whyItMatters: why,
      status: "pendiente",
      derivedAt,
      derivationVersion: meta.derivationVersion,
    });
  };

  push(
    "customer-master-today",
    "¿Existe hoy una lista maestra de clientes — o varias fuentes (Excel, WhatsApp, cuadernos)?",
    "Sin lista cargada en ws_isalwa.",
    "Importación, deduplicación y PartyGraph.",
  );

  push(
    "supplier-master-today",
    "¿Cómo se registran proveedores hoy?",
    "Proceso actual no evidenciado.",
    "Party con rol supplier vs solo customer.",
  );

  push(
    "same-entity-customer-supplier",
    "¿Alguna entidad es simultáamente cliente y proveedor para ISALWA?",
    "Arquitectura permite multi-rol — casos reales no documentados.",
    "Reglas de fusión y fiscal identity.",
  );

  return questions;
}
