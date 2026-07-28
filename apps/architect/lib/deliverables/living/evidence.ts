/**
 * Mission 26 — shared evidence-ref mapping. Every engine already tags its
 * own evidence source union (Blueprint, Company Model, Process, Deliverables
 * Mission 9); this module only narrows those into the Living Deliverable's
 * smaller, display-oriented union — it never invents a new evidence id.
 */

import type {
  CompanyModelEvidenceRef,
  DeliverableEvidenceRef,
  LivingDeliverableEvidenceRef,
  ProcessEvidenceRef,
} from "@/types";

export function fromDeliverableEvidence(
  refs: DeliverableEvidenceRef[],
): LivingDeliverableEvidenceRef[] {
  return refs.map((e) => ({
    source: mapDeliverableSource(e.source),
    id: e.id,
    label: e.label,
  }));
}

export function mapDeliverableSource(
  source: DeliverableEvidenceRef["source"],
): LivingDeliverableEvidenceRef["source"] {
  switch (source) {
    case "blueprint":
    case "process":
    case "consulting":
    case "knowledge":
    case "memory":
      return source;
    default:
      return "memory";
  }
}

export function fromCompanyModelEvidence(
  refs: CompanyModelEvidenceRef[],
): LivingDeliverableEvidenceRef[] {
  return refs.map((e) => ({
    source: mapCompanyModelSource(e.source),
    id: e.id,
    label: e.label,
  }));
}

export function mapCompanyModelSource(
  source: CompanyModelEvidenceRef["source"],
): LivingDeliverableEvidenceRef["source"] {
  switch (source) {
    case "blueprint":
    case "process":
    case "consulting":
    case "knowledge":
    case "memory":
      return source;
    case "people":
      return "company_model";
    default:
      return "memory";
  }
}

export function fromProcessEvidence(
  refs: ProcessEvidenceRef[],
): LivingDeliverableEvidenceRef[] {
  return refs.map((e) => ({
    source: mapProcessSource(e.source),
    id: e.id,
    label: e.label,
  }));
}

export function mapProcessSource(
  source: ProcessEvidenceRef["source"],
): LivingDeliverableEvidenceRef["source"] {
  switch (source) {
    case "blueprint":
    case "consulting":
    case "knowledge":
    case "memory":
      return source;
    default:
      return "process";
  }
}
