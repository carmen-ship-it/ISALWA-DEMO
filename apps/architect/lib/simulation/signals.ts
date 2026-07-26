/**
 * Derive optional SimulationSignals from a workspace.
 * Pure heuristics over existing fields — no engines rewritten.
 */

import type { CompanyWorkspace } from "@/types";
import type { SimulationSignals } from "./types";

function sizeBand(raw: string | null | undefined): SimulationSignals["companySizeBand"] {
  if (!raw) return "unknown";
  const t = raw.toLowerCase();
  if (/grande|large|enterprise|\b[5-9]\d{2,}\b|\b\d{4,}\b/.test(t)) return "large";
  if (/median|medium|mid-?market|\b(5\d|1\d{2}|2\d{2})\b/.test(t)) return "medium";
  if (/pequeñ|small|micro|solo|startup|\b([1-4]?\d)\b/.test(t)) return "small";
  const n = Number(t.match(/\b(\d+)\b/)?.[1] ?? NaN);
  if (!Number.isNaN(n)) {
    if (n < 50) return "small";
    if (n < 250) return "medium";
    return "large";
  }
  return "unknown";
}

function softwareBlob(list: string[]): string {
  return list.join(" ").toLowerCase();
}

export function emptySignals(): SimulationSignals {
  return {
    companyName: null,
    industry: null,
    understanding: 0,
    departments: [],
    currentSoftware: [],
    companySizeBand: "unknown",
    teamHint: null,
    geographyHint: null,
    hasCrm: false,
    hasErp: false,
    hasWhatsappDependency: false,
    hasExcelDependency: false,
    hasManualApprovals: false,
    consultingRiskIds: [],
    painPointLabels: [],
    automationScore: null,
    salesMaturity: null,
    operationsMaturity: null,
    peopleMaturity: null,
  };
}

export function extractSimulationSignals(
  workspace: CompanyWorkspace | null | undefined,
): SimulationSignals {
  if (!workspace) return emptySignals();

  const memory = workspace.conversationMemory;
  const summary = memory?.summary;
  const software = summary?.currentSoftware ?? [];
  const blob = softwareBlob(software);
  const riskIds = memory?.consulting?.risks?.map((r) => r.patternId) ?? [];
  const painFromMemory = memory?.painPoints?.map((p) => p.title) ?? [];
  const painFromWs = workspace.painPoints?.map((p) => p.title) ?? [];
  const painBlob = [...painFromMemory, ...painFromWs, ...(summary?.painPoints ?? [])]
    .join(" ")
    .toLowerCase();

  const maturity = memory?.consulting?.maturity?.dimensions ?? [];
  const dim = (id: string) => maturity.find((d) => d.id === id)?.score ?? null;

  const autoFromProcess =
    workspace.businessProcesses?.workflows?.length
      ? average(
          workspace.businessProcesses.workflows.map((w) => w.metrics.automationScore),
        )
      : null;

  const hasManualApprovals =
    riskIds.includes("manual_approvals") ||
    /aprob|approv|firma|sign[- ]?off/.test(painBlob);

  return {
    companyName: workspace.companyName || summary?.companyName || null,
    industry: summary?.industryLabel ?? workspace.industry ?? null,
    understanding: clamp01(workspace.businessUnderstanding ?? 0),
    departments: unique([
      ...(summary?.departments ?? []),
      ...workspace.people
        .map((p) => p.department)
        .filter((d): d is string => Boolean(d)),
    ]),
    currentSoftware: software,
    companySizeBand: sizeBand(summary?.companySize ?? summary?.teamHint),
    teamHint: summary?.teamHint ?? null,
    geographyHint: summary?.geographyHint ?? null,
    hasCrm: /crm|hubspot|salesforce|pipedrive|zoho/.test(blob),
    hasErp: /erp|sap|odoo|netsuite|dynamics/.test(blob),
    hasWhatsappDependency:
      riskIds.includes("whatsapp_dependency") || /whatsapp/.test(blob + painBlob),
    hasExcelDependency:
      riskIds.includes("excel_dependency") || /excel|spreadsheet|hoja/.test(blob + painBlob),
    hasManualApprovals,
    consultingRiskIds: riskIds,
    painPointLabels: unique([...painFromMemory, ...painFromWs]).slice(0, 12),
    automationScore: autoFromProcess ?? dim("automation"),
    salesMaturity: dim("sales"),
    operationsMaturity: dim("operations"),
    peopleMaturity: dim("people"),
  };
}

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());
    out.push(key);
  }
  return out;
}
