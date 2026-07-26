import { createId } from "@/lib/utils";
import type {
  ConsultingRisk,
  ProcessBottleneck,
  ProcessBottleneckKind,
  ProcessEvidenceRef,
  ProcessRiskLevel,
  ProcessWorkflow,
} from "@/types";

const KIND_FROM_PATTERN: Partial<
  Record<string, ProcessBottleneckKind>
> = {
  manual_approvals: "manual_approvals",
  excel_dependency: "excel_dependency",
  whatsapp_dependency: "whatsapp_dependency",
  paper_forms: "paper_forms",
  duplicate_work: "duplicate_entry",
  tribal_knowledge: "missing_ownership",
  no_documentation: "missing_information",
  manual_reporting: "manual_calculations",
  single_employee_owns_everything: "missing_ownership",
};

function detectStepKinds(
  text: string,
): ProcessBottleneckKind[] {
  const kinds: ProcessBottleneckKind[] = [];
  if (/approv|sign[- ]?off/i.test(text) && /manual|wait/i.test(text)) {
    kinds.push("manual_approvals");
  }
  if (/excel|spreadsheet|xls/i.test(text)) kinds.push("excel_dependency");
  if (/whatsapp|chat|text message/i.test(text)) {
    kinds.push("whatsapp_dependency");
  }
  if (/paper|print|handwrit/i.test(text)) kinds.push("paper_forms");
  if (/re-?enter|duplicat|copy.?paste|double.?entr/i.test(text)) {
    kinds.push("duplicate_entry");
  }
  if (/wait|queue|backlog|bottleneck/i.test(text)) kinds.push("waiting");
  if (/no owner|unclear who|unknown/i.test(text)) {
    kinds.push("missing_ownership");
  }
  if (/missing info|incomplete|unknown input|unknown output/i.test(text)) {
    kinds.push("missing_information");
  }
  if (/no system|manual only|none/i.test(text)) kinds.push("missing_systems");
  if (/calculat|spreadsheet math|manual count/i.test(text)) {
    kinds.push("manual_calculations");
  }
  return kinds;
}

function titleFor(kind: ProcessBottleneckKind): string {
  const map: Record<ProcessBottleneckKind, string> = {
    manual_approvals: "Cuello de botella de aprobación manual",
    duplicate_entry: "Captura de datos duplicada",
    excel_dependency: "Dependencia de Excel",
    whatsapp_dependency: "Dependencia de WhatsApp",
    paper_forms: "Formularios en papel",
    waiting: "Espera / demora en cola",
    missing_ownership: "Falta de responsable",
    missing_information: "Información faltante",
    missing_systems: "Falta de sistemas",
    manual_calculations: "Cálculos manuales",
  };
  return map[kind];
}

function impactFor(kind: ProcessBottleneckKind): string {
  const map: Record<ProcessBottleneckKind, string> = {
    manual_approvals: "Alarga el tiempo de ciclo y crea riesgo de aprobaciones de fachada",
    duplicate_entry: "Aumenta la tasa de error y el trabajo desperdiciado",
    excel_dependency: "Fuente de verdad frágil fuera de los sistemas",
    whatsapp_dependency: "Traspasos opacos sin rastro de auditoría",
    paper_forms: "Recepción lenta y documentos perdidos",
    waiting: "El trabajo en proceso se acumula entre actores",
    missing_ownership: "Las excepciones se estancan sin un responsable claro",
    missing_information: "Ciclos de retrabajo y traspasos poco claros",
    missing_systems: "El proceso no puede escalar sin herramientas",
    manual_calculations: "Errores de cálculo y retraso en los reportes",
  };
  return map[kind];
}

export function deriveBottlenecks(input: {
  workflows: ProcessWorkflow[];
  consultingRisks: ConsultingRisk[];
  evidence: ProcessEvidenceRef[];
}): ProcessBottleneck[] {
  const bottlenecks: ProcessBottleneck[] = [];
  const seen = new Set<string>();

  for (const risk of input.consultingRisks) {
    const kind = KIND_FROM_PATTERN[risk.patternId];
    if (!kind) continue;
    const key = `consulting:${kind}:${risk.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    bottlenecks.push({
      id: createId("pbottle"),
      workflowId: input.workflows[0]?.id ?? null,
      stepId: null,
      kind,
      title: risk.title,
      severity: risk.severity as ProcessRiskLevel,
      confidence: risk.confidence,
      businessImpact: risk.businessImpact,
      consultingRiskId: risk.id,
      evidence: [
        {
          source: "consulting",
          id: risk.id,
          label: risk.title,
        },
        ...input.evidence.slice(0, 1),
      ],
    });
  }

  for (const wf of input.workflows) {
    for (const step of wf.steps) {
      const blob = [
        step.name,
        step.description,
        ...step.systemsUsed,
        ...step.inputs,
        ...step.outputs,
        step.manual ? "manual" : "",
        step.actorUnknown ? "unknown actor" : "",
      ].join(" ");
      for (const kind of detectStepKinds(blob)) {
        const key = `${wf.id}:${step.id}:${kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const matchedRisk =
          input.consultingRisks.find(
            (r) => KIND_FROM_PATTERN[r.patternId] === kind,
          ) ?? null;
        bottlenecks.push({
          id: createId("pbottle"),
          workflowId: wf.id,
          stepId: step.id,
          kind,
          title: `${titleFor(kind)} · ${step.name}`,
          severity: step.riskLevel,
          confidence: Math.min(step.confidence, matchedRisk?.confidence ?? 0.75),
          businessImpact: impactFor(kind),
          consultingRiskId: matchedRisk?.id ?? null,
          evidence: [
            {
              source: "blueprint",
              id: step.blueprintStepId,
              label: step.name,
            },
            ...(matchedRisk
              ? [
                  {
                    source: "consulting" as const,
                    id: matchedRisk.id,
                    label: matchedRisk.title,
                  },
                ]
              : []),
          ],
        });
      }
    }
  }

  return bottlenecks;
}
