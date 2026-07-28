/**
 * Mission 28 — Executive Deliverables Package.
 *
 * One ZIP of **already built** living OS outputs. Never invents content for
 * missing kinds — lists gaps honestly in README.txt. Deliverables are
 * outputs; this package is a consulting asset pack of the Company OS.
 */

import type { LivingDeliverableKind } from "@/types";
import { livingDeliverableCopy } from "../copy";
import { LIVING_DELIVERABLE_KINDS } from "../versioning";
import type { ExportDocument } from "./document-model";

export type ExecutivePackageFormat = "pdf" | "docx";

export interface ExecutivePackageSlot {
  order: number;
  kind: LivingDeliverableKind;
  /** Preferred export format for this capability output. */
  format: ExecutivePackageFormat;
  /** File name inside the package folder (no path). */
  fileName: string;
}

export interface ExecutivePackageBuiltFile {
  order: number;
  kind: LivingDeliverableKind;
  format: ExecutivePackageFormat;
  fileName: string;
  document: ExportDocument;
}

export interface ExecutivePackagePlan {
  companyName: string;
  folderName: string;
  zipFileName: string;
  builtCount: number;
  totalKinds: number;
  slots: ExecutivePackageSlot[];
  built: ExecutivePackageBuiltFile[];
  missing: Array<{ order: number; kind: LivingDeliverableKind; title: string }>;
  readme: string;
  /** True when at least one living version can be exported. */
  canDownload: boolean;
  packageReadyLabel: string;
}

const FORMAT_BY_KIND: Record<LivingDeliverableKind, ExecutivePackageFormat> = {
  business_blueprint: "pdf",
  company_playbook: "pdf",
  employee_handbook: "docx",
  sop_library: "docx",
  job_description_library: "docx",
  training_academy: "docx",
  ai_playbook: "pdf",
  improvement_roadmap: "pdf",
};

const FILE_STEM_BY_KIND: Record<LivingDeliverableKind, string> = {
  business_blueprint: "Business Blueprint",
  company_playbook: "Company Playbook",
  employee_handbook: "Employee Handbook",
  sop_library: "SOP Library",
  job_description_library: "Job Description Library",
  training_academy: "Training Academy",
  ai_playbook: "AI Playbook",
  improvement_roadmap: "Improvement Roadmap",
};

function padOrder(n: number): string {
  return String(n).padStart(2, "0");
}

export function executivePackageSlots(): ExecutivePackageSlot[] {
  return LIVING_DELIVERABLE_KINDS.map((kind, index) => {
    const order = index + 1;
    const format = FORMAT_BY_KIND[kind];
    const stem = FILE_STEM_BY_KIND[kind];
    return {
      order,
      kind,
      format,
      fileName: `${padOrder(order)} ${stem}.${format}`,
    };
  });
}

export function buildExecutivePackageReadme(plan: {
  companyName: string;
  built: Array<{ fileName: string }>;
  missing: Array<{ title: string }>;
}): string {
  const lines = [
    `ISALWA Executive Package — ${plan.companyName}`,
    "",
    "This package contains living outputs of the Company Operating System.",
    "Deliverables are outputs; the Operating System is the product.",
    "Nothing here was invented to fill empty slots.",
    "",
    `Included (${plan.built.length}):`,
    ...(plan.built.length > 0
      ? plan.built.map((f) => `  - ${f.fileName}`)
      : ["  (none yet — build OS capabilities in Architect first)"]),
    "",
    `Not built yet (${plan.missing.length}):`,
    ...(plan.missing.length > 0
      ? plan.missing.map((m) => `  - ${m.title}`)
      : ["  (all eight capability outputs are present)"]),
    "",
    "Open Architect → Sistema operativo de la empresa to Build missing parts",
    "or Build New Version when Update Available.",
    "",
    `Generated for ${plan.companyName} by ISALWA Architect.`,
  ];
  return lines.join("\n");
}

export function buildExecutivePackagePlan(
  companyName: string,
  builtKinds: Set<LivingDeliverableKind>,
  documentsByKind: Partial<Record<LivingDeliverableKind, ExportDocument>>,
): ExecutivePackagePlan {
  const slots = executivePackageSlots();
  const built: ExecutivePackageBuiltFile[] = [];
  const missing: ExecutivePackagePlan["missing"] = [];

  for (const slot of slots) {
    const document = documentsByKind[slot.kind];
    if (builtKinds.has(slot.kind) && document) {
      built.push({
        order: slot.order,
        kind: slot.kind,
        format: slot.format,
        fileName: slot.fileName,
        document,
      });
    } else {
      const copy = livingDeliverableCopy(slot.kind, companyName);
      missing.push({
        order: slot.order,
        kind: slot.kind,
        title: `${padOrder(slot.order)} ${copy.title}`,
      });
    }
  }

  const folderName = `${companyName} Executive Package`.replace(/[\\/:*?"<>|]/g, "-");
  const zipFileName = `${folderName}.zip`;
  const builtCount = built.length;
  const totalKinds = slots.length;
  const readme = buildExecutivePackageReadme({ companyName, built, missing });

  return {
    companyName,
    folderName,
    zipFileName,
    builtCount,
    totalKinds,
    slots,
    built,
    missing,
    readme,
    canDownload: builtCount > 0,
    packageReadyLabel:
      builtCount === 0
        ? "Paquete ejecutivo — construya al menos una salida del sistema operativo"
        : builtCount === totalKinds
          ? `Paquete ejecutivo listo (${builtCount}/${totalKinds})`
          : `Paquete ejecutivo (${builtCount}/${totalKinds} construidos)`,
  };
}
