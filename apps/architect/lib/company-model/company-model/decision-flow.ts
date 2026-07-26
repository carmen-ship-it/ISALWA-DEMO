import type {
  BusinessBlueprint,
  CompanyApprovalRef,
  CompanyDecisionFlow,
  CompanyDepartment,
  CompanyModelEvidenceRef,
  CompanyWorkflowRef,
  CompanyWorkspace,
} from "@/types";
import { departmentByName } from "./departments";
import { modelId } from "./ids";

export function deriveApprovals(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  workflows: CompanyWorkflowRef[],
  evidence: CompanyModelEvidenceRef[],
): CompanyApprovalRef[] {
  const approvals: CompanyApprovalRef[] = [];
  const processApprovals = workspace.businessProcesses?.approvals ?? [];

  for (const approval of processApprovals) {
    const wf = workflows.find((w) => w.processWorkflowId === approval.workflowId);
    approvals.push({
      id: modelId("cappr", approval.id),
      name: approval.name,
      processApprovalId: approval.id,
      solutionApprovalRuleId: approval.solutionApprovalRuleId,
      operatingRuleId: null,
      authority: approval.authority,
      workflowId: wf?.id ?? null,
      confidence: approval.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  for (const rule of workspace.solutionArchitecture?.approvalRules ?? []) {
    if (approvals.some((a) => a.solutionApprovalRuleId === rule.id)) continue;
    approvals.push({
      id: modelId("cappr", rule.id),
      name: rule.statement.slice(0, 80),
      processApprovalId: null,
      solutionApprovalRuleId: rule.id,
      operatingRuleId: null,
      authority: rule.roles.join(", ") || "Manager",
      workflowId: null,
      confidence: rule.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  for (const rule of blueprint.operatingRules) {
    if (!/approv|authorization|threshold|credit/i.test(rule.statement)) continue;
    approvals.push({
      id: modelId("cappr", rule.id),
      name: rule.statement.slice(0, 80),
      processApprovalId: null,
      solutionApprovalRuleId: null,
      operatingRuleId: rule.id,
      authority: rule.domain,
      workflowId: null,
      confidence: 0.7,
      evidence: [
        {
          source: "blueprint",
          id: rule.id,
          label: rule.domain,
        },
      ],
    });
  }

  return approvals;
}

export function deriveDecisionFlows(
  approvals: CompanyApprovalRef[],
  departments: CompanyDepartment[],
  workflows: CompanyWorkflowRef[],
  evidence: CompanyModelEvidenceRef[],
): CompanyDecisionFlow[] {
  return approvals.map((approval) => {
    const wf = workflows.find((w) => w.id === approval.workflowId) ?? null;
    const department =
      (wf ? departments.find((d) => d.id === wf.departmentId) : null) ??
      departmentByName(departments, approval.authority);

    return {
      id: modelId("cdflow", approval.id),
      name: approval.name,
      trigger: wf
        ? `Approval gate in ${wf.name}`
        : "Operating / solution approval rule",
      authority: approval.authority,
      approvalIds: [approval.id],
      workflowId: approval.workflowId,
      departmentId: department?.id ?? null,
      confidence: approval.confidence,
      evidence: evidence.slice(0, 2),
    };
  });
}
